export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          avatar_url: string | null
          regular_balance: number
          sweeps_balance: number
          vip_level: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          avatar_url?: string | null
          regular_balance?: number
          sweeps_balance?: number
          vip_level?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          avatar_url?: string | null
          regular_balance?: number
          sweeps_balance?: number
          vip_level?: number
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          amount: number
          type: 'bet' | 'win' | 'loss' | 'bonus' | 'purchase'
          game: string
          currency_type: 'regular' | 'sweepstakes'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          type: 'bet' | 'win' | 'loss' | 'bonus' | 'purchase'
          game: string
          currency_type: 'regular' | 'sweepstakes'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          type?: 'bet' | 'win' | 'loss' | 'bonus' | 'purchase'
          game?: string
          currency_type?: 'regular' | 'sweepstakes'
          created_at?: string
        }
      }
      game_sessions: {
        Row: {
          id: string
          game: string
          state: Json
          players: Json
          current_player_index: number
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          game: string
          state?: Json
          players?: Json
          current_player_index?: number
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          game?: string
          state?: Json
          players?: Json
          current_player_index?: number
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      update_balances: {
        Args: {
          p_user_id: string
          p_regular_amount: number
          p_sweeps_amount: number
        }
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}