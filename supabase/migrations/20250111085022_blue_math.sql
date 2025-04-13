/*
  # Game Configurations

  1. New Tables
    - `game_configs`
      - `id` (uuid, primary key)
      - `game` (text, unique)
      - `config` (jsonb)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `game_configs` table
    - Add policies for admin access
*/

CREATE TABLE IF NOT EXISTS game_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game text UNIQUE NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE game_configs ENABLE ROW LEVEL SECURITY;

-- Only allow admins to modify game configs
CREATE POLICY "Game configs are viewable by everyone"
  ON game_configs FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert game configs"
  ON game_configs FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Only admins can update game configs"
  ON game_configs FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'admin');

-- Update trigger for updated_at
CREATE TRIGGER update_game_configs_updated_at
  BEFORE UPDATE ON game_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Insert default configurations
INSERT INTO game_configs (game, config) VALUES
  ('slots', '{
    "minBet": 10,
    "maxBet": 100,
    "payouts": {
      "🍒": 2,
      "🍋": 3,
      "🍊": 4,
      "7️⃣": 5,
      "💎": 10,
      "🎰": 20
    }
  }'::jsonb),
  ('roulette', '{
    "minBet": 10,
    "maxBet": 1000,
    "payouts": {
      "straight": 35,
      "split": 17,
      "street": 11,
      "corner": 8,
      "line": 5,
      "column": 2,
      "dozen": 2,
      "red": 1,
      "black": 1,
      "odd": 1,
      "even": 1,
      "high": 1,
      "low": 1
    }
  }'::jsonb),
  ('blackjack', '{
    "minBet": 20,
    "maxBet": 500,
    "payouts": {
      "blackjack": 1.5,
      "insurance": 2,
      "normal": 1
    }
  }'::jsonb),
  ('poker', '{
    "minBet": 50,
    "maxBet": 2000,
    "payouts": {
      "royal_flush": 800,
      "straight_flush": 50,
      "four_of_a_kind": 25,
      "full_house": 9,
      "flush": 6,
      "straight": 4,
      "three_of_a_kind": 3,
      "two_pair": 2,
      "jacks_or_better": 1
    }
  }'::jsonb)
ON CONFLICT (game) DO NOTHING;