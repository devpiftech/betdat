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
DROP TRIGGER IF EXISTS setup_initial_balances_trigger ON profiles;
CREATE TRIGGER setup_initial_balances_trigger
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION setup_initial_balances();

-- Update RLS policies
DO $$ 
BEGIN
  -- Create new policy if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Users can update their own balances'
  ) THEN
    CREATE POLICY "Users can update their own balances"
      ON profiles FOR UPDATE
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Add index for currency type if it doesn't exist
CREATE INDEX IF NOT EXISTS transactions_currency_type_idx ON transactions(currency_type);