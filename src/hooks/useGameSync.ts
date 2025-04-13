import { useState, useEffect } from 'react';
import { gameSync } from '../lib/gameSync';
import type { GameSession } from '../types';

export function useGameSync(sessionId: string | null) {
  const [gameState, setGameState] = useState<GameSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const handleStateChange = (newState: GameSession) => {
      setGameState(newState);
      
      // Validate game state periodically
      gameSync.validateGameState(sessionId).then((isValid) => {
        if (!isValid) {
          setError('Game state validation failed');
        }
      });
    };

    gameSync.subscribeToGame(sessionId, handleStateChange);

    return () => {
      gameSync.unsubscribeFromGame(sessionId);
    };
  }, [sessionId]);

  const updateState = async (updates: Partial<GameSession>) => {
    if (!sessionId) return;
    await gameSync.updateGameState(sessionId, updates);
  };

  const performAction = async (action: string, data?: any) => {
    if (!sessionId) return;
    await gameSync.performGameAction(sessionId, action, data);
  };

  return {
    gameState,
    error,
    updateState,
    performAction,
  };
}