import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Save, RefreshCw, AlertTriangle, Settings, Lock } from 'lucide-react';

interface GameConfig {
  id: string;
  game: string;
  config: {
    rtp: number;
    minBet: number;
    maxBet: number;
    payouts: Record<string, number>;
    features?: {
      bonusFrequency: number;
      multiplierFrequency: number;
      maxMultiplier: number;
    };
  };
  updated_at: string;
}

export const GameManagement = () => {
  const [configs, setConfigs] = useState<GameConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('game_configs')
        .select('*')
        .order('game');

      if (error) throw error;
      if (data) setConfigs(data);
    } catch (err) {
      setError('Failed to load game configurations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (id: string, newConfig: any) => {
    try {
      setSaving(true);
      setError(null);

      // Validate RTP is between 0 and 1
      if (newConfig.rtp < 0.8 || newConfig.rtp > 0.98) {
        throw new Error('RTP must be between 80% and 98%');
      }

      const { error } = await supabase
        .from('game_configs')
        .update({ config: newConfig })
        .eq('id', id);

      if (error) throw error;
      await loadConfigs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update configuration');
    } finally {
      setSaving(false);
    }
  };

  const renderSlotConfig = (config: GameConfig) => (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            RTP (Return to Player)
          </label>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="number"
              value={config.config.rtp}
              onChange={(e) => {
                const newConfig = {
                  ...config.config,
                  rtp: parseFloat(e.target.value)
                };
                updateConfig(config.id, newConfig);
              }}
              step="0.01"
              min="0.8"
              max="0.98"
              className="block w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-500">
              {(config.config.rtp * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Bonus Frequency
          </label>
          <input
            type="number"
            value={config.config.features?.bonusFrequency || 0}
            onChange={(e) => {
              const newConfig = {
                ...config.config,
                features: {
                  ...config.config.features,
                  bonusFrequency: parseFloat(e.target.value)
                }
              };
              updateConfig(config.id, newConfig);
            }}
            step="0.001"
            min="0"
            max="1"
            className="mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <h4 className="mb-2 font-medium">Symbol Payouts</h4>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(config.config.payouts).map(([symbol, payout]) => (
            <div key={symbol} className="flex items-center gap-2">
              <span className="text-2xl">{symbol}</span>
              <span>×</span>
              <input
                type="number"
                value={payout}
                onChange={(e) => {
                  const newConfig = {
                    ...config.config,
                    payouts: {
                      ...config.config.payouts,
                      [symbol]: parseFloat(e.target.value)
                    }
                  };
                  updateConfig(config.id, newConfig);
                }}
                className="w-20 rounded border px-2 py-1"
                min="1"
                step="0.1"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Minimum Bet
          </label>
          <input
            type="number"
            value={config.config.minBet}
            onChange={(e) => {
              const newConfig = {
                ...config.config,
                minBet: parseInt(e.target.value)
              };
              updateConfig(config.id, newConfig);
            }}
            className="mt-1 block w-full rounded-md border px-3 py-2"
            min="1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Maximum Bet
          </label>
          <input
            type="number"
            value={config.config.maxBet}
            onChange={(e) => {
              const newConfig = {
                ...config.config,
                maxBet: parseInt(e.target.value)
              };
              updateConfig(config.id, newConfig);
            }}
            className="mt-1 block w-full rounded-md border px-3 py-2"
            min="1"
          />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-gray-600" />
          <h2 className="text-xl font-bold">Game Management</h2>
        </div>
        <Button
          variant="secondary"
          onClick={loadConfigs}
          disabled={loading}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            <p className="font-medium">{error}</p>
          </div>
        </div>
      )}

      <div className="grid gap-6">
        {configs.map((config) => (
          <div
            key={config.id}
            className="rounded-lg border bg-white p-6 shadow-sm"
          >
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-gray-400" />
                <h3 className="text-lg font-semibold">{config.game}</h3>
              </div>
              <span className="text-sm text-gray-500">
                Last updated: {new Date(config.updated_at).toLocaleString()}
              </span>
            </div>

            {renderSlotConfig(config)}
          </div>
        ))}
      </div>
    </div>
  );
};