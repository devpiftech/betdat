/*
  # Game Sessions and History

  1. New Tables
    - `game_sessions`
      - Tracks active game sessions
      - Stores current game state
      - Links players to games
    
    - `game_history`
      - Records completed games
      - Stores final results
      - Used for statistics and replay

  2. Security
    - Enable RLS on all tables
    - Add policies for player access
*/

-- Game Sessions Table
CREATE TABLE IF NOT EXISTS game_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game text NOT NULL,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  players jsonb NOT NULL DEFAULT '[]'::jsonb,
  current_player_index integer DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view their game sessions"
  ON game_sessions FOR SELECT
  USING (
    auth.uid()::text IN (
      SELECT value->>'id'
      FROM jsonb_array_elements(players)
    )
  );

-- Game History Table
CREATE TABLE IF NOT EXISTS game_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES game_sessions(id),
  game text NOT NULL,
  players jsonb NOT NULL DEFAULT '[]'::jsonb,
  final_state jsonb NOT NULL,
  winner_id uuid REFERENCES auth.users(id),
  total_bets bigint NOT NULL DEFAULT 0,
  total_payouts bigint NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE game_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view their game history"
  ON game_history FOR SELECT
  USING (
    auth.uid()::text IN (
      SELECT value->>'id'
      FROM jsonb_array_elements(players)
    )
  );

-- Game Actions Log Table
CREATE TABLE IF NOT EXISTS game_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES game_sessions(id),
  player_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE game_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view game actions for their sessions"
  ON game_actions FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM game_sessions
      WHERE id = game_actions.session_id
      AND auth.uid()::text IN (
        SELECT value->>'id'
        FROM jsonb_array_elements(players)
      )
    )
  );

-- Update triggers
CREATE TRIGGER update_game_sessions_updated_at
  BEFORE UPDATE ON game_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Function to archive completed games
CREATE OR REPLACE FUNCTION archive_completed_game()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status = 'active' THEN
    INSERT INTO game_history (
      session_id,
      game,
      players,
      final_state,
      winner_id,
      total_bets,
      total_payouts
    ) VALUES (
      NEW.id,
      NEW.game,
      NEW.players,
      NEW.state,
      (NEW.state->>'winner_id')::uuid,
      (NEW.state->>'total_bets')::bigint,
      (NEW.state->>'total_payouts')::bigint
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER archive_completed_game
  AFTER UPDATE ON game_sessions
  FOR EACH ROW
  EXECUTE FUNCTION archive_completed_game();