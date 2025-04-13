import { useState, useEffect, useCallback } from 'react';
import { SlotMachineEngine, type SpinResult, type SlotConfig } from '../lib/games/slots/SlotMachineEngine';
import { useStore } from '../store/useStore';
import { useMonitoring } from './useMonitoring';

export function useSlotMachine(config: SlotConfig) {
  const { user } = useStore();
  const { trackError } = useMonitoring();
  const [engine, setEngine] = useState<SlotMachineEngine | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<SpinResult | null>(null);

  useEffect(() => {
    const initEngine = async () => {
      try {
        const newEngine = new SlotMachineEngine(config);
        await newEngine.initialize();
        setEngine(newEngine);
        setInitialized(true);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to initialize slot machine';
        setError(message);
        trackError('slot_init', err);
      }
    };

    initEngine();

    return () => {
      if (engine) {
        engine.removeAllListeners();
      }
    };
  }, [config]);

  const spin = useCallback(async (bet: number) => {
    if (!engine || !user) {
      setError('Slot machine not ready');
      return null;
    }

    try {
      setSpinning(true);
      setError(null);
      const result = await engine.spin(bet, user.id);
      setLastResult(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Spin failed';
      setError(message);
      trackError('slot_spin', err);
      return null;
    } finally {
      setSpinning(false);
    }
  }, [engine, user]);

  return {
    spin,
    initialized,
    spinning,
    error,
    lastResult,
    config: engine?.getConfig()
  };
}