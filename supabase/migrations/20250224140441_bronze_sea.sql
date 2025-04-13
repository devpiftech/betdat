/*
  # Add Referral and Cashback Systems
  
  1. New Tables
    - referral_codes: Stores unique referral codes for users
    - referral_rewards: Tracks referral rewards
    - daily_losses: Tracks daily losses for cashback calculation
    - cashback_rewards: Tracks cashback rewards

  2. Functions
    - create_referral_code(): Generates unique referral code
    - process_referral(): Handles referral rewards
    - calculate_daily_losses(): Calculates daily losses
    - process_cashback(): Processes 40% cashback on daily losses

  3. Triggers
    - Auto-create referral code on user creation
    - Auto-calculate daily losses
*/

-- Referral codes table
CREATE TABLE referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  code text UNIQUE NOT NULL,
  times_used integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Referral rewards table
CREATE TABLE referral_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  referred_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reward_amount_referrer bigint NOT NULL,
  reward_amount_referred bigint NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(referred_id)
);

-- Daily losses table
CREATE TABLE daily_losses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  total_bets bigint NOT NULL DEFAULT 0,
  total_wins bigint NOT NULL DEFAULT 0,
  net_loss bigint NOT NULL DEFAULT 0,
  currency_type text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date, currency_type)
);

-- Cashback rewards table
CREATE TABLE cashback_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  loss_amount bigint NOT NULL,
  cashback_amount bigint NOT NULL,
  currency_type text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_losses ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashback_rewards ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own referral code"
  ON referral_codes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their referral rewards"
  ON referral_rewards FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "Users can view their daily losses"
  ON daily_losses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their cashback rewards"
  ON cashback_rewards FOR SELECT
  USING (auth.uid() = user_id);

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code text;
  v_exists boolean;
BEGIN
  LOOP
    -- Generate 8 character code using username prefix and random chars
    SELECT UPPER(
      SUBSTRING(
        (SELECT username FROM profiles WHERE id = p_user_id),
        1, 3
      ) || 
      array_to_string(
        ARRAY(
          SELECT chr((65 + round(random() * 25))::integer)
          FROM generate_series(1, 5)
        ),
        ''
      )
    ) INTO v_code;
    
    -- Check if code exists
    SELECT EXISTS (
      SELECT 1 FROM referral_codes WHERE code = v_code
    ) INTO v_exists;
    
    -- Exit loop if unique code found
    IF NOT v_exists THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN v_code;
END;
$$;

-- Function to process referral
CREATE OR REPLACE FUNCTION process_referral(
  p_referral_code text,
  p_referred_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_referrer_id uuid;
  v_referrer_reward bigint := 5000; -- $50 for referrer
  v_referred_reward bigint := 2500; -- $25 for referred
BEGIN
  -- Get referrer ID
  SELECT user_id INTO v_referrer_id
  FROM referral_codes
  WHERE code = p_referral_code;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid referral code';
  END IF;

  -- Prevent self-referral
  IF v_referrer_id = p_referred_id THEN
    RAISE EXCEPTION 'Cannot refer yourself';
  END IF;

  -- Record referral reward
  INSERT INTO referral_rewards (
    referrer_id,
    referred_id,
    reward_amount_referrer,
    reward_amount_referred
  ) VALUES (
    v_referrer_id,
    p_referred_id,
    v_referrer_reward,
    v_referred_reward
  );

  -- Update referral code usage
  UPDATE referral_codes
  SET times_used = times_used + 1
  WHERE user_id = v_referrer_id;

  -- Credit rewards
  PERFORM update_balances(
    v_referrer_id,
    v_referrer_reward,
    v_referrer_reward / 5 -- 20% of regular reward for sweeps
  );

  PERFORM update_balances(
    p_referred_id,
    v_referred_reward,
    v_referred_reward / 5
  );
END;
$$;

-- Function to calculate daily losses
CREATE OR REPLACE FUNCTION calculate_daily_losses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Calculate losses for regular currency
  INSERT INTO daily_losses (
    user_id,
    date,
    total_bets,
    total_wins,
    net_loss,
    currency_type
  )
  SELECT 
    user_id,
    DATE(created_at),
    ABS(SUM(CASE WHEN type = 'bet' THEN amount ELSE 0 END)),
    SUM(CASE WHEN type = 'win' THEN amount ELSE 0 END),
    GREATEST(
      ABS(SUM(CASE WHEN type = 'bet' THEN amount ELSE 0 END)) -
      SUM(CASE WHEN type = 'win' THEN amount ELSE 0 END),
      0
    ),
    currency_type
  FROM transactions
  WHERE DATE(created_at) = CURRENT_DATE
    AND type IN ('bet', 'win')
  GROUP BY user_id, DATE(created_at), currency_type
  ON CONFLICT (user_id, date, currency_type)
  DO UPDATE SET
    total_bets = EXCLUDED.total_bets,
    total_wins = EXCLUDED.total_wins,
    net_loss = EXCLUDED.net_loss,
    updated_at = now();
END;
$$;

-- Function to process cashback
CREATE OR REPLACE FUNCTION process_daily_cashback()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r RECORD;
BEGIN
  -- Process cashback for yesterday's losses
  FOR r IN (
    SELECT 
      user_id,
      date,
      net_loss,
      currency_type
    FROM daily_losses
    WHERE date = CURRENT_DATE - INTERVAL '1 day'
      AND net_loss > 0
      AND NOT EXISTS (
        SELECT 1 
        FROM cashback_rewards cr 
        WHERE cr.user_id = daily_losses.user_id 
          AND cr.date = daily_losses.date
          AND cr.currency_type = daily_losses.currency_type
      )
  ) LOOP
    -- Calculate 40% cashback
    INSERT INTO cashback_rewards (
      user_id,
      date,
      loss_amount,
      cashback_amount,
      currency_type
    ) VALUES (
      r.user_id,
      r.date,
      r.net_loss,
      (r.net_loss * 0.4)::bigint,
      r.currency_type
    );

    -- Credit cashback amount
    IF r.currency_type = 'regular' THEN
      PERFORM update_balances(
        r.user_id,
        (r.net_loss * 0.4)::bigint,
        0
      );
    ELSE
      PERFORM update_balances(
        r.user_id,
        0,
        (r.net_loss * 0.4)::bigint
      );
    END IF;
  END LOOP;
END;
$$;

-- Trigger to create referral code on user creation
CREATE OR REPLACE FUNCTION create_referral_code_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO referral_codes (user_id, code)
  VALUES (NEW.id, generate_referral_code(NEW.id));
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_referral_code_trigger
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_referral_code_on_signup();

-- Scheduled jobs for daily processing
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Calculate losses every hour
SELECT cron.schedule('calculate_losses', '0 * * * *', 'SELECT calculate_daily_losses()');

-- Process cashback at 1 AM daily
SELECT cron.schedule('process_cashback', '0 1 * * *', 'SELECT process_daily_cashback()');

-- Grant permissions
GRANT EXECUTE ON FUNCTION generate_referral_code(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION process_referral(text, uuid) TO authenticated;