import { useState } from 'react';
import { fairnessVerifier } from '../lib/security/fairnessVerifier';
import { useMonitoring } from './useMonitoring';

export function useGameVerification(sessionId: string | null) {
  const { trackError } = useMonitoring();
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verify = async () => {
    if (!sessionId) {
      setError('No session ID provided');
      return;
    }

    try {
      setVerifying(true);
      setError(null);

      const result = await fairnessVerifier.verifyFairness(sessionId);
      
      setVerified(result.isValid);
      if (!result.isValid) {
        setError('Game verification failed');
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verification failed';
      setError(message);
      trackError('game_verification', err);
      return null;
    } finally {
      setVerifying(false);
    }
  };

  return {
    verify,
    verifying,
    verified,
    error
  };
}