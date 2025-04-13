/*
  # Add slot machine configurations

  1. New Configurations
    - CyberCowboy: Futuristic western slot with neon aesthetics
    - GoldRush: Mining-themed slot with cascading wins
    - AlienSaloon: Space western with bonus features
    - SteamPunk: Mechanical slot with gear mechanics
    - QuantumBounty: Quantum physics slot with parallel universe wins

  2. Updates
    - Add specific configurations for each slot machine
    - Set RTP, payouts, and special features
*/

-- Update game configurations for new slot machines
INSERT INTO game_configs (game, config) VALUES
  ('cyber-cowboy', '{
    "rtp": 0.96,
    "minBet": 10,
    "maxBet": 100,
    "payouts": {
      "🤠": 50,
      "🔫": 25,
      "🐎": 20,
      "🎯": 15,
      "⚡": 10,
      "💎": 5
    },
    "features": {
      "bonusFrequency": 0.03,
      "multiplierFrequency": 0.05,
      "maxMultiplier": 5
    }
  }'::jsonb),
  ('gold-rush', '{
    "rtp": 0.95,
    "minBet": 10,
    "maxBet": 100,
    "payouts": {
      "💎": 50,
      "🪙": 25,
      "⛏️": 20,
      "🧨": 15,
      "🪨": 10,
      "⚒️": 5
    },
    "features": {
      "cascadeMultiplier": 0.5,
      "maxCascades": 5
    }
  }'::jsonb),
  ('alien-saloon', '{
    "rtp": 0.97,
    "minBet": 10,
    "maxBet": 100,
    "payouts": {
      "👽": 50,
      "🛸": 25,
      "🌌": 20,
      "🚀": 15,
      "🌠": 10,
      "🌍": 5
    },
    "features": {
      "bonusSpins": 10,
      "bonusFrequency": 0.04
    }
  }'::jsonb),
  ('steampunk', '{
    "rtp": 0.94,
    "minBet": 10,
    "maxBet": 100,
    "payouts": {
      "⚙️": 50,
      "🔧": 25,
      "⚡": 20,
      "🎭": 15,
      "🗝️": 10,
      "🧭": 5
    },
    "features": {
      "gearRatio": 0.5,
      "maxRatio": 3,
      "steamPressure": 0.1
    }
  }'::jsonb),
  ('quantum-bounty', '{
    "rtp": 0.96,
    "minBet": 10,
    "maxBet": 100,
    "payouts": {
      "🤠": 50,
      "⚛️": 25,
      "🌌": 20,
      "🎯": 15,
      "💫": 10,
      "🔮": 5
    },
    "features": {
      "parallelUniverses": 3,
      "entanglementFrequency": 0.03,
      "superpositionFrequency": 0.04
    }
  }'::jsonb)
ON CONFLICT (game) DO UPDATE
SET config = EXCLUDED.config;