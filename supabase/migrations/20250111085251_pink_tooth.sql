/*
  # Game Events and Notifications

  1. New Tables
    - `game_events`
      - Tracks real-time game events
      - Enables game state synchronization
      - Supports multiplayer features
    
    - `player_notifications`
      - Stores player-specific notifications
      - Handles game invites and updates
      - Manages achievement notifications

  2. Security
    - Enable RLS on all tables
    - Add policies for player access
*/

-- Game Events Table
CREATE TABLE IF NOT EXISTS game_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES game_sessions(id),
  event_type text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE game_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view events for their sessions"
  ON game_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM game_sessions
      WHERE id = game_events.session_id
      AND auth.uid()::text IN (
        SELECT value->>'id'
        FROM jsonb_array_elements(players)
      )
    )
  );

-- Player Notifications Table
CREATE TABLE IF NOT EXISTS player_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE player_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view their notifications"
  ON player_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Players can update their notifications"
  ON player_notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to create game event notification
CREATE OR REPLACE FUNCTION create_game_event_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.event_type IN ('game_invite', 'turn_start', 'game_end') THEN
    INSERT INTO player_notifications (
      user_id,
      type,
      title,
      message,
      data
    )
    SELECT 
      (value->>'id')::uuid,
      NEW.event_type,
      CASE NEW.event_type
        WHEN 'game_invite' THEN 'Game Invitation'
        WHEN 'turn_start' THEN 'Your Turn'
        WHEN 'game_end' THEN 'Game Ended'
      END,
      CASE NEW.event_type
        WHEN 'game_invite' THEN 'You have been invited to join a game'
        WHEN 'turn_start' THEN 'It''s your turn to play'
        WHEN 'game_end' THEN 'The game has ended'
      END,
      NEW.data
    FROM jsonb_array_elements(
      (SELECT players FROM game_sessions WHERE id = NEW.session_id)
    )
    WHERE NEW.data->>'target_user_id' IS NULL 
      OR (value->>'id')::uuid = (NEW.data->>'target_user_id')::uuid;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_game_event_notification
  AFTER INSERT ON game_events
  FOR EACH ROW
  EXECUTE FUNCTION create_game_event_notification();