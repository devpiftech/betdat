-- Rewards claims table
CREATE TABLE IF NOT EXISTS reward_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reward_type text NOT NULL,
  regular_amount bigint NOT NULL,
  sweeps_amount bigint NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS and create policies
DO $$ 
BEGIN
  -- Enable RLS
  EXECUTE 'ALTER TABLE reward_claims ENABLE ROW LEVEL SECURITY';

  -- Drop existing policy if it exists
  DROP POLICY IF EXISTS "Users can view their own reward claims" ON reward_claims;

  -- Create new policy
  CREATE POLICY "Users can view their own reward claims"
    ON reward_claims FOR SELECT
    USING (auth.uid() = user_id);
END $$;

-- Function to update both balances
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_balances(uuid, bigint, bigint) TO authenticated;