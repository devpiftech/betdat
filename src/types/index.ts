export interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
  regular_balance: number;
  sweeps_balance: number;
  vip_level: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'bet' | 'win' | 'loss' | 'bonus' | 'purchase';
  game: string;
  currency_type: 'regular' | 'sweepstakes';
  created_at: string;
}

export interface GameSession {
  id: string;
  game: string;
  state: any;
  players: any[];
  current_player_index: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface GameAction {
  type: string;
  data?: any;
  timestamp: string;
  sessionId: string;
  userId: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  requirement_type: string;
  requirement_value: number;
}

export interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted';
  created_at: string;
  updated_at: string;
}