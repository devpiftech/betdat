import { useState, useEffect } from 'react';
import { secureRNG } from '../lib/security/secureRNG';
import { useGameSession } from './useGameSession';

export function useSecureRNG(sessionId: string | null) {
  const { session, isConnected } = useGameSession(sessionId);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId || !isConnected || initialized) return;

    const initializeRNG = async () => {
      try {
        await secureRNG.initializeSession(sessionId);
        setInitialized(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize RNG');
      }
    };

    initializeRNG();
  }, [sessionId, isConnected, initialized]);

  const generateNumber = async (min: number, max: number): Promise<number> => {
    if (!sessionId || !initialized) {
      throw new Error('RNG not initialized');
    }

    try {
      return await secureRNG.generateNumber(sessionId, min, max);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate number');
      throw err;
    }
  };

  const verifySequence = async (): Promise<boolean> => {
    if (!sessionId || !initialized) return false;

    try {
      return await secureRNG.verifySequence(sessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify sequence');
      return false;
    }
  };

  const revealSeed = async () => {
    if (!sessionId || !initialized) return;

    try {
      await secureRNG.revealSeed(sessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reveal seed');
    }
  };

  return {
    generateNumber,
    verifySequence,
    revealSeed,
    initialized,
    error
  };
}