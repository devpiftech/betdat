-- Create test table if it doesn't exist
CREATE TABLE IF NOT EXISTS connection_test (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS if not already enabled
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'connection_test' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE connection_test ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow all access to connection_test" ON connection_test;

-- Create new policy
CREATE POLICY "Allow all access to connection_test"
  ON connection_test
  FOR ALL
  USING (true);

-- Insert test record if table is empty
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM connection_test LIMIT 1) THEN
    INSERT INTO connection_test DEFAULT VALUES;
  END IF;
END $$;