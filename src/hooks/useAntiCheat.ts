import { useEffect } from 'react';
import { antiCheat } from '../lib/security/antiCheat';
import { useGameSession } from './useGameSession';
import { useGameSync } from './useGameSync';
import { useStore } from '../store/useStore';

export function useAntiCheat(sessionId: string | null) {
  const { user } = useStore();
  const { session } = useGameSession(sessionId);
  const { gameState, performAction } = useGameSync(sessionId);

  useEffect(() => {
    if (!session || !user) return;

    // Validate game state periodically
    const interval = setInterval(async () => {
      const isValid = await antiCheat.validateGameState(session);
      if (!isValid) {
        console.error('Game state validation failed');
        // Handle invalid game state
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [session, user]);

  const validateAndPerformAction = async (action: string, data?: any) => {
    if (!sessionId || !user) return;

    const gameAction = {
      type: action,
      data,
      timestamp: new Date().toISOString(),
      sessionId,
      userId: user.id
    };

    const isValid = await antiCheat.validateAction(sessionId, user.id, gameAction);
    if (isValid) {
      await performAction(action, data);
    } else {
      console.error('Action validation failed');
      // Handle invalid action
    }
  };

  return {
    validateAndPerformAction
  };
}