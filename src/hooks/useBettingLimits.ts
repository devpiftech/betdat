import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { bettingSystem } from '../lib/betting/BettingSystem';
import { useMonitoring } from './useMonitoring';

export function useBettingLimits() {
  const { user } = useStore();
  const { trackError } = useMonitoring();
  const [limits, setLimits] = useState({
    minBet: 10,
    maxBet: 1000,
    dailyLimit: 100000,
    remainingDaily: 100000
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadLimits();
    }
  }, [user]);

  const loadLimits = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const newLimits = await bettingSystem.getBettingLimits(user.id);
      setLimits(newLimits);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load betting limits';
      setError(message);
      trackError('betting_limits', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    limits,
    loading,
    error,
    refresh: loadLimits
  };
}