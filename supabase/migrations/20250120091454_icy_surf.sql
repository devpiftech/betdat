/*
  # Add betting limits check function
  
  1. Function Purpose
    - Validates bet amounts against game-specific limits
    - Prevents bets outside allowed ranges
    - Enforces VIP level betting privileges
  
  2. Implementation Details
    - Checks minimum and maximum bet limits per game
    - Validates against player's balance
    - Considers VIP level multipliers
    - Returns detailed error messages
*/

-- Drop existing functions with CASCADE to handle dependent objects
DROP FUNCTION IF EXISTS public.check_betting_limits(uuid, text, bigint) CASCADE;
DROP FUNCTION IF EXISTS public.check_betting_limits() CASCADE;

-- Create the new function
CREATE OR REPLACE FUNCTION public.check_betting_limits(
  p_user_id uuid,
  p_game text,
  p_bet_amount bigint
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_min_bet bigint;
  v_max_bet bigint;
  v_balance bigint;
  v_vip_level integer;
  v_vip_multiplier numeric;
  v_adjusted_max_bet bigint;
BEGIN
  -- Get game limits
  SELECT 
    (config->>'minBet')::bigint,
    (config->>'maxBet')::bigint
  INTO v_min_bet, v_max_bet
  FROM game_configs
  WHERE game = p_game;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Game configuration not found for %', p_game;
  END IF;

  -- Get user's balance and VIP level
  SELECT balance, vip_level
  INTO v_balance, v_vip_level
  FROM profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Calculate VIP multiplier (higher VIP levels get higher betting limits)
  v_vip_multiplier := 1 + (v_vip_level - 1) * 0.5;
  v_adjusted_max_bet := (v_max_bet * v_vip_multiplier)::bigint;

  -- Check minimum bet
  IF p_bet_amount < v_min_bet THEN
    RAISE EXCEPTION 'Bet amount (%) is below minimum bet (%) for %', 
      p_bet_amount, v_min_bet, p_game;
  END IF;

  -- Check maximum bet
  IF p_bet_amount > v_adjusted_max_bet THEN
    RAISE EXCEPTION 'Bet amount (%) exceeds maximum bet (%) for % at your VIP level', 
      p_bet_amount, v_adjusted_max_bet, p_game;
  END IF;

  -- Check user balance
  IF p_bet_amount > v_balance THEN
    RAISE EXCEPTION 'Insufficient balance (%) for bet amount (%)', 
      v_balance, p_bet_amount;
  END IF;

  -- Log the bet attempt for analysis
  INSERT INTO game_actions (
    session_id,
    player_id,
    action,
    data
  ) VALUES (
    NULL,
    p_user_id,
    'bet_validation',
    jsonb_build_object(
      'game', p_game,
      'amount', p_bet_amount,
      'min_bet', v_min_bet,
      'max_bet', v_adjusted_max_bet,
      'vip_level', v_vip_level,
      'balance', v_balance
    )
  );

  RETURN TRUE;
END;
$$;

-- Drop existing trigger function with CASCADE
DROP FUNCTION IF EXISTS check_betting_limits_trigger() CASCADE;

-- Create trigger function
CREATE OR REPLACE FUNCTION check_betting_limits_trigger()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM check_betting_limits(
    NEW.player_id,
    NEW.game,
    (NEW.data->>'amount')::bigint
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER enforce_betting_limits
  BEFORE INSERT ON game_actions
  FOR EACH ROW
  WHEN (NEW.action = 'bet')
  EXECUTE FUNCTION check_betting_limits_trigger();

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_betting_limits(uuid, text, bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION check_betting_limits_trigger() TO authenticated;

COMMENT ON FUNCTION public.check_betting_limits(uuid, text, bigint) IS 'Validates bet amounts against game-specific limits and user VIP level';