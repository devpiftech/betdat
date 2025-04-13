/*
  # Test Supabase Connection

  1. Changes
    - Creates a test table to verify connection
    - Adds RLS policy
    - Will be replaced by actual schema later
*/

-- Create test table
CREATE TABLE IF NOT EXISTS connection_test (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE connection_test ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow all access to connection_test"
  ON connection_test
  FOR ALL
  USING (true);