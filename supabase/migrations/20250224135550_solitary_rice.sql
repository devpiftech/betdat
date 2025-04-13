/*
  # Initial Currency System Schema
  
  1. Tables
    - Currencies
    - Currency Balances
    - Currency Transactions
    - Currency Packages
    - Currency Purchases
    - Reward Claims
  
  2. Functions
    - Balance Updates
    - Initial Balance Setup
  
  3. Security
    - RLS Policies
    - Permissions
*/

-- Drop existing tables if they exist
DROP TABLE IF EXISTS reward_claims CASCADE;
DROP TABLE IF EXISTS currency_purchases CASCADE;
DROP TABLE IF EXISTS currency_packages CASCADE;
DROP TABLE IF EXISTS currency_transactions CASCADE;
DROP TABLE IF EXISTS currency_balances CASCADE;
DROP TABLE IF EXISTS currencies CASCADE;

-- Currency types table
CREATE TABLE currencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('regular', 'sweepstakes')),
  exchange_rate numeric NOT NULL DEFAULT 1.0,
  created_at timestamptz DEFAULT now()
);

-- Currency balances table
CREATE TABLE currency_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  currency_id uuid REFERENCES currencies(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, currency_id)
);

-- Currency transactions table
CREATE TABLE currency_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  currency_id uuid REFERENCES currencies(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('purchase', 'bet', 'win', 'bonus', 'conversion')),
  amount numeric NOT NULL,
  balance_after numeric NOT NULL,
  reference_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Currency packages table
CREATE TABLE currency_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_id uuid REFERENCES currencies(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  amount numeric NOT NULL,
  bonus_amount numeric DEFAULT 0,
  price numeric NOT NULL,
  featured boolean DEFAULT false,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Currency purchases table
CREATE TABLE currency_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  package_id uuid REFERENCES currency_packages(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL,
  bonus_amount numeric NOT NULL,
  price numeric NOT NULL,
  payment_method text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Rewards claims table
CREATE TABLE reward_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reward_type text NOT NULL,
  regular_amount bigint NOT NULL,
  sweeps_amount bigint NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Function to update balances
CREATE OR REPLACE FUNCTION update_balances(
  p_user_id uuid,
  p_regular_amount bigint,
  p_sweeps_amount bigint
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET 
    regular_balance = regular_balance + p_regular_amount,
    sweeps_balance = sweeps_balance + p_sweeps_amount,
    updated_at = now()
  WHERE id = p_user_id;
END;
$$;

-- Function to handle initial balance setup
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

-- Enable RLS on all tables
ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE currency_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE currency_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE currency_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE currency_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_claims ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Currencies are viewable by everyone" 
  ON currencies FOR SELECT 
  USING (true);

CREATE POLICY "Users can view their own balances" 
  ON currency_balances FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own transactions" 
  ON currency_transactions FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Currency packages are viewable by everyone" 
  ON currency_packages FOR SELECT 
  USING (true);

CREATE POLICY "Users can view their own purchases" 
  ON currency_purchases FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own reward claims" 
  ON reward_claims FOR SELECT 
  USING (auth.uid() = user_id);

-- Set up triggers
DROP TRIGGER IF EXISTS setup_initial_balances_trigger ON profiles;
CREATE TRIGGER setup_initial_balances_trigger
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION setup_initial_balances();

-- Create indexes
CREATE INDEX IF NOT EXISTS transactions_currency_type_idx ON transactions(currency_type);

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_balances(uuid, bigint, bigint) TO authenticated;

-- Insert default data
INSERT INTO currencies (code, name, type, exchange_rate) VALUES
  ('COINS', 'Game Coins', 'regular', 1.0),
  ('SWEEPS', 'Sweepstakes Coins', 'sweepstakes', 1.0)
ON CONFLICT (code) DO NOTHING;

-- Insert default packages
INSERT INTO currency_packages (
  currency_id,
  name,
  amount,
  bonus_amount,
  price,
  featured
) VALUES
  -- Regular coins packages
  (
    (SELECT id FROM currencies WHERE code = 'COINS'),
    'Starter Pack',
    1000,
    100,
    9.99,
    false
  ),
  (
    (SELECT id FROM currencies WHERE code = 'COINS'),
    'Popular Pack',
    5000,
    1000,
    39.99,
    true
  ),
  (
    (SELECT id FROM currencies WHERE code = 'COINS'),
    'Elite Pack',
    12000,
    3000,
    79.99,
    false
  ),
  -- Sweepstakes coins packages
  (
    (SELECT id FROM currencies WHERE code = 'SWEEPS'),
    'Bronze Package',
    500,
    50,
    5.00,
    false
  ),
  (
    (SELECT id FROM currencies WHERE code = 'SWEEPS'),
    'Silver Package',
    2500,
    500,
    25.00,
    true
  ),
  (
    (SELECT id FROM currencies WHERE code = 'SWEEPS'),
    'Gold Package',
    6000,
    1500,
    50.00,
    false
  )
ON CONFLICT DO NOTHING;