import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { socket } from './socket';
import type { GameSession } from '../types';

class GameStateSync {
  private channels: Map<string, RealtimeChannel> = new Map();
  private gameStates: Map<string, GameSession> = new Map();

  subscribeToGame(sessionId: string, onStateChange: (state: GameSession) => void) {
    // Unsubscribe from previous channel if exists
    this.unsubscribeFromGame(sessionId);

    // Subscribe to game session changes
    const channel = supabase
      .channel(`game:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const newState = payload.new as GameSession;
          this.gameStates.set(sessionId, newState);
          onStateChange(newState);
        }
      )
      .subscribe();

    this.channels.set(sessionId, channel);

    // Subscribe to game events
    socket.emit('join_game', { sessionId });
  }

  unsubscribeFromGame(sessionId: string) {
    const channel = this.channels.get(sessionId);
    if (channel) {
      channel.unsubscribe();
      this.channels.delete(sessionId);
      this.gameStates.delete(sessionId);
      socket.emit('leave_game', { sessionId });
    }
  }

  async updateGameState(sessionId: string, updates: Partial<GameSession>) {
    const currentState = this.gameStates.get(sessionId);
    if (!currentState) return;

    const { error } = await supabase
      .from('game_sessions')
      .update(updates)
      .eq('id', sessionId);

    if (!error) {
      socket.emit('game_state_updated', {
        sessionId,
        updates,
      });
    }
  }

  async performGameAction(sessionId: string, action: string, data: any = {}) {
    const { error } = await supabase
      .from('game_actions')
      .insert([
        {
          session_id: sessionId,
          action,
          data,
        },
      ]);

    if (!error) {
      socket.emit('game_action', {
        sessionId,
        action,
        data,
      });
    }
  }

  async validateGameState(sessionId: string): Promise<boolean> {
    const { data: actions } = await supabase
      .from('game_actions')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (!actions) return false;

    // Replay actions to verify game state
    const calculatedState = actions.reduce((state, action) => {
      // Apply each action to calculate the expected state
      return this.applyAction(state, action);
    }, {});

    const currentState = this.gameStates.get(sessionId);
    return this.compareStates(calculatedState, currentState);
  }

  private applyAction(state: any, action: any) {
    // Implementation of action replay logic
    switch (action.action) {
      case 'bet':
        return {
          ...state,
          pot: (state.pot || 0) + action.data.amount,
        };
      case 'fold':
        return {
          ...state,
          players: (state.players || []).map((p: any) =>
            p.id === action.data.playerId ? { ...p, folded: true } : p
          ),
        };
      // Add more action handlers
      default:
        return state;
    }
  }

  private compareStates(state1: any, state2: any): boolean {
    // Deep comparison of game states
    return JSON.stringify(state1) === JSON.stringify(state2);
  }
}

export const gameSync = new GameStateSync();