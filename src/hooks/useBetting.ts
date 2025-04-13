import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { bettingSystem } from '../lib/betting/BettingSystem';
import { useMonitoring } from './useMonitoring';
import { getMinBet, getMaxBet, formatCurrency } from '../lib/supabase';

export function useBetting(
  gameId: string,
  gameType: string,
  currencyType: 'regular' | 'sweepstakes' = 'regular'
) {
  const { user } = useStore();
  const { trackError } = useMonitoring();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [limits, setLimits] = useState({
    minBet: getMinBet(currencyType),
    maxBet: getMaxBet(currencyType),
    dailyLimit: getMaxBet(currencyType) * 100,
    remainingDaily: getMaxBet(currencyType) * 100
  });
  const [bet, setBet] = useState(limits.minBet);

  // Initialize betting system
  useEffect(() => {
    const init = async () => {
      if (!user) return;
      try {
        await bettingSystem.initialize();
        const newLimits = await bettingSystem.getPlayerLimits(user.id, currencyType);
        setLimits(newLimits);
        setBet(prev => Math.min(Math.max(prev, newLimits.minBet), newLimits.maxBet));
        setInitialized(true);
        setError(null);
      } catch (err) {
        trackError('betting_init', err);
        setError('Failed to initialize betting system');
      }
    };
    init();
  }, [user, currencyType]);

  // Load limits when user or currency type changes
  useEffect(() => {
    if (user && initialized) {
      loadLimits();
    }
  }, [user, currencyType, initialized]);

  const loadLimits = async () => {
    if (!user) return;
    try {
      const newLimits = await bettingSystem.getPlayerLimits(user.id, currencyType);
      setLimits(newLimits);
      // Ensure bet is within new limits
      setBet(prev => Math.min(Math.max(prev, newLimits.minBet), newLimits.maxBet));
      setError(null);
    } catch (err) {
      trackError('load_limits', err);
      setError('Failed to load betting limits');
    }
  };

  const placeBet = async (amount: number): Promise<boolean> => {
    if (!user) {
      setError('Must be logged in to place bets');
      return false;
    }

    if (!initialized) {
      setError('Betting system not initialized');
      return false;
    }

    if (amount < limits.minBet) {
      setError(`Minimum bet is ${formatCurrency(limits.minBet)}`);
      return false;
    }

    if (amount > limits.maxBet) {
      setError(`Maximum bet is ${formatCurrency(limits.maxBet)}`);
      return false;
    }

    if (amount > limits.remainingDaily) {
      setError('Daily betting limit reached');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const success = await bettingSystem.placeBet(
        user.id,
        gameId,
        amount,
        gameType,
        currencyType
      );

      if (!success) {
        throw new Error('Failed to place bet');
      }

      await loadLimits();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to place bet';
      setError(message);
      trackError('place_bet', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const resolveBet = async (amount: number, won: boolean): Promise<boolean> => {
    if (!user || !initialized) return false;

    try {
      const success = await bettingSystem.resolveBet(
        user.id,
        gameId,
        amount,
        won,
        currencyType
      );

      if (success) {
        await loadLimits();
      }

      return success;
    } catch (err) {
      trackError('resolve_bet', err);
      return false;
    }
  };

  const incrementBet = () => {
    setBet(prev => Math.min(limits.maxBet, prev + limits.minBet));
  };

  const decrementBet = () => {
    setBet(prev => Math.max(limits.minBet, prev - limits.minBet));
  };

  return {
    placeBet,
    resolveBet,
    loading,
    error,
    limits,
    loadLimits,
    bet,
    setBet,
    incrementBet,
    decrementBet,
    initialized
  };
}