import { useState } from 'react';
import { fairnessVerifier } from '../lib/fairness/fairnessVerifier';

export function useFairness(sessionId: string | null) {
  const [clientSeed, setClientSeed] = useState<string | null>(null);
  const [currentNonce, setCurrentNonce] = useState(0);

  const initializeFairness = async () => {
    if (!sessionId) return;
    
    const newClientSeed = await fairnessVerifier.generateClientSeed();
    setClientSeed(newClientSeed);
    setCurrentNonce(0);
  };

  const verifyOutcome = async (
    gameType: string,
    outcome: any,
    serverSeed: string
  ): Promise<boolean> => {
    if (!sessionId || !clientSeed) return false;

    const isValid = await fairnessVerifier.verifyGameOutcome(
      sessionId,
      gameType,
      outcome,
      serverSeed,
      clientSeed,
      currentNonce
    );

    // Increment nonce for next verification
    setCurrentNonce(prev => prev + 1);

    return isValid;
  };

  return {
    clientSeed,
    currentNonce,
    initializeFairness,
    verifyOutcome
  };
}