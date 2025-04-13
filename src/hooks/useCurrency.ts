import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { currencyManager, type CurrencyType } from '../lib/currency/currencyManager';
import { useMonitoring } from './useMonitoring';

export function useCurrency(type: CurrencyType = 'regular') {
  const { user } = useStore();
  const { trackError } = useMonitoring();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadBalance();
    }
  }, [user, type]);

  const loadBalance = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const newBalance = await currencyManager.getBalance(user.id, type);
      setBalance(newBalance);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load balance';
      setError(message);
      trackError('currency_balance', err);
    } finally {
      setLoading(false);
    }
  };

  const updateBalance = async (
    amount: number,
    transactionType: 'bet' | 'win' | 'purchase' | 'bonus'
  ) => {
    if (!user) return;

    try {
      const newBalance = await currencyManager.updateBalance(
        user.id,
        type,
        amount,
        transactionType
      );
      setBalance(newBalance);
      return true;
    } catch (err) {
      trackError('currency_update', err);
      return false;
    }
  };

  return {
    balance,
    loading,
    error,
    updateBalance,
    refresh: loadBalance
  };
}