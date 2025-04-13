import { useState, useEffect } from 'react';
import { sessionManager } from '../lib/sessionManager';
import { useStore } from '../store/useStore';
import type { GameSession } from '../types';

export function useGameSession(sessionId: string | null) {
  const { user } = useStore();
  const [session, setSession] = useState<GameSession | null>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId || !user) return;

    const connectToSession = async () => {
      try {
        // Check for existing session to resume
        const existingSession = await sessionManager.resumeSession(sessionId, user.id);
        if (existingSession) {
          setSession(existingSession);
          setStatus('connected');
          return;
        }

        // Join new session
        const newSession = await sessionManager.joinSession(sessionId, user.id);
        if (newSession) {
          setSession(newSession);
          setStatus('connected');
        } else {
          setError('Failed to join session');
          setStatus('disconnected');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to connect');
        setStatus('disconnected');
      }
    };

    connectToSession();

    // Handle disconnection
    const handleDisconnect = () => {
      setStatus('disconnected');
      sessionManager.handleDisconnect(sessionId, user.id);
    };

    // Handle reconnection
    const handleReconnect = async () => {
      setStatus('connecting');
      const reconnectedSession = await sessionManager.resumeSession(sessionId, user.id);
      if (reconnectedSession) {
        setSession(reconnectedSession);
        setStatus('connected');
      } else {
        setError('Failed to reconnect');
        setStatus('disconnected');
      }
    };

    window.addEventListener('offline', handleDisconnect);
    window.addEventListener('online', handleReconnect);

    return () => {
      window.removeEventListener('offline', handleDisconnect);
      window.removeEventListener('online', handleReconnect);
      if (user) {
        sessionManager.leaveSession(sessionId, user.id);
      }
    };
  }, [sessionId, user]);

  return {
    session,
    status,
    error,
    isConnected: status === 'connected',
    isReconnecting: status === 'connecting',
  };
}