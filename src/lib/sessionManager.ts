import { supabase } from './supabase';
import { socket } from './socket';
import { gameSync } from './gameSync';
import type { GameSession } from '../types';

class SessionManager {
  private activeSessions: Map<string, GameSession> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_INTERVAL = 3000;

  async joinSession(sessionId: string, userId: string): Promise<GameSession | null> {
    try {
      const { data: session } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (session) {
        this.activeSessions.set(sessionId, session);
        socket.emit('join_session', { sessionId, userId });
        return session;
      }
    } catch (error) {
      console.error('Error joining session:', error);
    }
    return null;
  }

  async leaveSession(sessionId: string, userId: string) {
    try {
      await supabase
        .from('game_sessions')
        .update({
          players: supabase.raw(`
            jsonb_set(
              players,
              '{players}',
              (
                SELECT jsonb_agg(p)
                FROM jsonb_array_elements(players) p
                WHERE p->>'id' != ?
              )
            )
          `, [userId])
        })
        .eq('id', sessionId);

      this.activeSessions.delete(sessionId);
      socket.emit('leave_session', { sessionId, userId });
    } catch (error) {
      console.error('Error leaving session:', error);
    }
  }

  async handleDisconnect(sessionId: string, userId: string) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    try {
      // Mark player as disconnected but don't remove them yet
      await supabase
        .from('game_sessions')
        .update({
          players: supabase.raw(`
            jsonb_set(
              players,
              '{players}',
              (
                SELECT jsonb_agg(
                  CASE
                    WHEN p->>'id' = ?
                    THEN jsonb_set(p, '{status}', '"disconnected"')
                    ELSE p
                  END
                )
                FROM jsonb_array_elements(players) p
              )
            )
          `, [userId])
        })
        .eq('id', sessionId);

      // Start reconnection process
      this.attemptReconnect(sessionId, userId);
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  }

  private async attemptReconnect(sessionId: string, userId: string) {
    const attempts = this.reconnectAttempts.get(sessionId) || 0;
    if (attempts >= this.MAX_RECONNECT_ATTEMPTS) {
      await this.handleReconnectFailed(sessionId, userId);
      return;
    }

    this.reconnectAttempts.set(sessionId, attempts + 1);

    setTimeout(async () => {
      try {
        const isConnected = await this.checkConnection(userId);
        if (isConnected) {
          await this.handleReconnectSuccess(sessionId, userId);
        } else {
          await this.attemptReconnect(sessionId, userId);
        }
      } catch (error) {
        console.error('Error during reconnection:', error);
        await this.attemptReconnect(sessionId, userId);
      }
    }, this.RECONNECT_INTERVAL);
  }

  private async checkConnection(userId: string): Promise<boolean> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(false), 1000);
      socket.emit('ping', { userId }, () => {
        clearTimeout(timeout);
        resolve(true);
      });
    });
  }

  private async handleReconnectSuccess(sessionId: string, userId: string) {
    try {
      // Update player status to connected
      await supabase
        .from('game_sessions')
        .update({
          players: supabase.raw(`
            jsonb_set(
              players,
              '{players}',
              (
                SELECT jsonb_agg(
                  CASE
                    WHEN p->>'id' = ?
                    THEN jsonb_set(p, '{status}', '"connected"')
                    ELSE p
                  END
                )
                FROM jsonb_array_elements(players) p
              )
            )
          `, [userId])
        })
        .eq('id', sessionId);

      this.reconnectAttempts.delete(sessionId);
      
      // Resync game state
      const session = await this.joinSession(sessionId, userId);
      if (session) {
        gameSync.subscribeToGame(sessionId, () => {});
      }
    } catch (error) {
      console.error('Error handling reconnect success:', error);
    }
  }

  private async handleReconnectFailed(sessionId: string, userId: string) {
    try {
      // Remove player from session
      await this.leaveSession(sessionId, userId);
      this.reconnectAttempts.delete(sessionId);

      // Create a notification for the player
      await supabase
        .from('player_notifications')
        .insert([{
          user_id: userId,
          type: 'disconnect',
          title: 'Disconnected from Game',
          message: 'You were disconnected from the game session. Any pending bets have been refunded.',
          data: { sessionId }
        }]);
    } catch (error) {
      console.error('Error handling reconnect failure:', error);
    }
  }

  async resumeSession(sessionId: string, userId: string): Promise<GameSession | null> {
    try {
      const { data: session } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (session) {
        // Verify player was part of this session
        const players = session.players as any[];
        const player = players.find(p => p.id === userId);
        
        if (player) {
          await this.handleReconnectSuccess(sessionId, userId);
          return session;
        }
      }
    } catch (error) {
      console.error('Error resuming session:', error);
    }
    return null;
  }
}

export const sessionManager = new SessionManager();