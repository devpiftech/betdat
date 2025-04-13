/*
  # Enhance betting system and security

  1. New Functions
    - place_bet: Handles bet placement with validation
    - resolve_bet: Resolves bet outcomes
    - check_daily_limits: Validates daily betting limits
    - update_vip_level: Updates user VIP level based on activity

  2. New Tables
    - betting_limits: Stores betting limits per VIP level
    - daily_betting_stats: Tracks daily betting activity
    - bet_verifications: Stores bet verification data

  3. Security
    - Added transaction handling
    - Added bet validation
    - Added daily limit checks
*/

-- Betting limits table
CREATE TABLE IF NOT EXISTS betting_limits (
  vip_level integer PRIMARY KEY,
  min_bet bigint NOT NULL,
  max_bet bigint NOT NULL,
  daily_limit bigint NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE betting_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Betting limits are viewable by everyone"
  ON betting_limits FOR SELECT
  USING (true);

-- Daily betting stats table
CREATE TABLE IF NOT EXISTS daily_betting_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  total_bets bigint DEFAULT 0,
  total_wagered bigint DEFAULT 0,
  total_won bigint DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE daily_betting_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own daily stats"
  ON daily_betting_stats FOR SELECT
  USING (auth.uid() = user_id);

-- Bet verifications table
CREATE TABLE IF NOT EXISTS bet_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bet_id uuid NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  game_type text NOT NULL,
  amount bigint NOT NULL,
  verification_hash text NOT NULL,
  server_seed_hash text NOT NULL,
  client_seed text NOT NULL,
  nonce integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bet_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bet verifications"
  ON bet_verifications FOR SELECT
  USING (auth.uid() = user_id);

-- Insert default betting limits
INSERT INTO betting_limits (vip_level, min_bet, max_bet, daily_limit) VALUES
  (1, 10, 1000, 10000),
  (2, 10, 2000, 20000),
  (3, 10, 5000, 50000),
  (4, 10, 10000, 100000),
  (5, 10, 25000, 250000)
ON CONFLICT (vip_level) DO NOTHING;

-- Function to check daily betting limits
CREATE OR REPLACE FUNCTION check_daily_limits(
  p_user_id uuid,
  p_amount bigint
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_daily_stats daily_betting_stats%ROWTYPE;
  v_vip_level integer;
  v_daily_limit bigint;
BEGIN
  -- Get user's VIP level
  SELECT vip_level INTO v_vip_level
  FROM profiles
  WHERE id = p_user_id;

  -- Get daily limit for VIP level
  SELECT daily_limit INTO v_daily_limit
  FROM betting_limits
  WHERE vip_level = v_vip_level;

  -- Get or create daily stats
  INSERT INTO daily_betting_stats (user_id, date)
  VALUES (p_user_id, CURRENT_DATE)
  ON CONFLICT (user_id, date) DO NOTHING;

  SELECT * INTO v_daily_stats
  FROM daily_betting_stats
  WHERE user_id = p_user_id AND date = CURRENT_DATE;

  -- Check if bet would exceed daily limit
  RETURN (v_daily_stats.total_wagered + p_amount) <= v_daily_limit;
END;
$$;

-- Function to place a bet
CREATE OR REPLACE FUNCTION place_bet(
  p_user_id uuid,
  p_game_id uuid,
  p_amount bigint,
  p_game_type text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance bigint;
  v_vip_level integer;
  v_min_bet bigint;
  v_max_bet bigint;
BEGIN
  -- Get user's current balance and VIP level
  SELECT balance, vip_level INTO v_balance, v_vip_level
  FROM profiles
  WHERE id = p_user_id;

  -- Get betting limits for VIP level
  SELECT min_bet, max_bet INTO v_min_bet, v_max_bet
  FROM betting_limits
  WHERE vip_level = v_vip_level;

  -- Validate bet amount
  IF p_amount < v_min_bet OR p_amount > v_max_bet THEN
    RAISE EXCEPTION 'Bet amount outside allowed limits';
  END IF;

  -- Check daily limits
  IF NOT check_daily_limits(p_user_id, p_amount) THEN
    RAISE EXCEPTION 'Daily betting limit exceeded';
  END IF;

  -- Check balance
  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- Place bet
  UPDATE profiles
  SET balance = balance - p_amount
  WHERE id = p_user_id;

  -- Record transaction
  INSERT INTO transactions (
    user_id,
    amount,
    type,
    game
  ) VALUES (
    p_user_id,
    -p_amount,
    'bet',
    p_game_type
  );

  -- Update daily stats
  UPDATE daily_betting_stats
  SET 
    total_bets = total_bets + 1,
    total_wagered = total_wagered + p_amount,
    updated_at = now()
  WHERE user_id = p_user_id AND date = CURRENT_DATE;

  RETURN true;
END;
$$;

-- Function to resolve a bet
CREATE OR REPLACE FUNCTION resolve_bet(
  p_user_id uuid,
  p_game_id uuid,
  p_amount bigint,
  p_won boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update balance if won
  IF p_won THEN
    UPDATE profiles
    SET balance = balance + p_amount
    WHERE id = p_user_id;

    -- Record win transaction
    INSERT INTO transactions (
      user_id,
      amount,
      type
    ) VALUES (
      p_user_id,
      p_amount,
      'win'
    );

    -- Update daily stats
    UPDATE daily_betting_stats
    SET 
      total_won = total_won + p_amount,
      updated_at = now()
    WHERE user_id = p_user_id AND date = CURRENT_DATE;
  END IF;

  RETURN true;
END;
$$;

-- Function to update VIP level
CREATE OR REPLACE FUNCTION update_vip_level()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Calculate new VIP level based on total wagered
  WITH user_totals AS (
    SELECT 
      user_id,
      sum(total_wagered) as total_wagered
    FROM daily_betting_stats
    WHERE user_id = NEW.user_id
    GROUP BY user_id
  )
  UPDATE profiles
  SET vip_level = 
    CASE
      WHEN total_wagered >= 1000000 THEN 5
      WHEN total_wagered >= 500000 THEN 4
      WHEN total_wagered >= 100000 THEN 3
      WHEN total_wagered >= 50000 THEN 2
      ELSE 1
    END
  FROM user_totals
  WHERE profiles.id = user_totals.user_id;

  RETURN NEW;
END;
$$;

-- Trigger to update VIP level
CREATE TRIGGER update_vip_level_trigger
  AFTER UPDATE OF total_wagered ON daily_betting_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_vip_level();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_daily_limits(uuid, bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION place_bet(uuid, uuid, bigint, text) TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_bet(uuid, uuid, bigint, boolean) TO authenticated;