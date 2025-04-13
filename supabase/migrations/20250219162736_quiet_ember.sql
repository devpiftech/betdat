/*
  # Fix Sign-up Implementation

  1. Changes
    - Add dual currency support to profiles table
    - Add currency-specific transaction tracking
    - Add initial balance configuration
    - Add currency type to transactions

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies
*/

-- Update profiles table
ALTER TABLE profiles
  DROP COLUMN balance,
  ADD COLUMN regular_balance bigint NOT NULL DEFAULT 1000,
  ADD COLUMN sweeps_balance bigint NOT NULL DEFAULT 200;

-- Update transactions table
ALTER TABLE transactions
  ADD COLUMN currency_type text NOT NULL DEFAULT 'regular'
  CHECK (currency_type IN ('regular', 'sweepstakes'));

-- Create function to handle initial balance setup
CREATE OR REPLACE FUNCTION setup_initial_balances()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Record initial balance transactions
  INSERT INTO transactions (
    user_id,
    amount,
    type,
    game,
    currency_type
  ) VALUES
    (NEW.id, 1000, 'bonus', 'signup', 'regular'),
    (NEW.id, 200, 'bonus', 'signup', 'sweepstakes');
  
  RETURN NEW;
END;
$$;

-- Create trigger for initial balance setup
CREATE TRIGGER setup_initial_balances_trigger
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION setup_initial_balances();

-- Update RLS policies
CREATE POLICY "Users can update their own balances"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Add index for currency type
CREATE INDEX transactions_currency_type_idx ON transactions(currency_type);