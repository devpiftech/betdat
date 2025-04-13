import { useState, useEffect } from 'react';
import { Save, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';

interface GameConfig {
  id: string;
  game: string;
  config: {
    odds?: Record<string, number>;
    payouts?: Record<string, number>;
    minBet?: number;
    maxBet?: number;
  };
}

export const GameConfig = () => {
  const [configs, setConfigs] = useState<GameConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    const { data } = await supabase
      .from('game_configs')
      .select('*')
      .order('game');

    if (data) {
      setConfigs(data);
    }
    setLoading(false);
  };

  const updateConfig = async (id: string, newConfig: any) => {
    setSaving(true);
    const { error } = await supabase
      .from('game_configs')
      .update({ config: newConfig })
      .eq('id', id);

    if (!error) {
      await loadConfigs();
    }
    setSaving(false);
  };

  const renderSlotConfig = (config: GameConfig) => (
    <div className="space-y-4">
      <div>
        <h4 className="mb-2 font-medium">Symbol Payouts</h4>
        <div className="grid gap-2">
          {Object.entries(config.config.payouts || {}).map(([symbol, payout]) => (
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
                      [symbol]: Number(e.target.value)
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
    </div>
  );

  const renderRouletteConfig = (config: GameConfig) => (
    <div className="space-y-4">
      <div>
        <h4 className="mb-2 font-medium">Bet Payouts</h4>
        <div className="grid gap-2">
          {Object.entries(config.config.payouts || {}).map(([betType, payout]) => (
            <div key={betType} className="flex items-center gap-2">
              <span className="w-24">{betType}</span>
              <span>×</span>
              <input
                type="number"
                value={payout}
                onChange={(e) => {
                  const newConfig = {
                    ...config.config,
                    payouts: {
                      ...config.config.payouts,
                      [betType]: Number(e.target.value)
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
    </div>
  );

  const renderBlackjackConfig = (config: GameConfig) => (
    <div className="space-y-4">
      <div>
        <h4 className="mb-2 font-medium">Game Rules</h4>
        <div className="grid gap-2">
          <div className="flex items-center gap-2">
            <span>Blackjack Payout</span>
            <span>×</span>
            <input
              type="number"
              value={config.config.payouts?.blackjack || 1.5}
              onChange={(e) => {
                const newConfig = {
                  ...config.config,
                  payouts: {
                    ...config.config.payouts,
                    blackjack: Number(e.target.value)
                  }
                };
                updateConfig(config.id, newConfig);
              }}
              className="w-20 rounded border px-2 py-1"
              min="1"
              step="0.1"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderPokerConfig = (config: GameConfig) => (
    <div className="space-y-4">
      <div>
        <h4 className="mb-2 font-medium">Hand Rankings</h4>
        <div className="grid gap-2">
          {Object.entries(config.config.payouts || {}).map(([hand, payout]) => (
            <div key={hand} className="flex items-center gap-2">
              <span className="w-32">{hand}</span>
              <span>×</span>
              <input
                type="number"
                value={payout}
                onChange={(e) => {
                  const newConfig = {
                    ...config.config,
                    payouts: {
                      ...config.config.payouts,
                      [hand]: Number(e.target.value)
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
    </div>
  );

  if (loading) {
    return <div>Loading configurations...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Game Configurations</h2>
        <Button
          variant="secondary"
          onClick={loadConfigs}
          disabled={loading}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6">
        {configs.map((config) => (
          <div
            key={config.id}
            className="rounded-lg border bg-white p-6 shadow-sm"
          >
            <h3 className="mb-4 text-lg font-semibold">{config.game}</h3>
            
            <div className="mb-4 grid gap-4 sm:grid-cols-2">
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
                      minBet: Number(e.target.value)
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
                      maxBet: Number(e.target.value)
                    };
                    updateConfig(config.id, newConfig);
                  }}
                  className="mt-1 block w-full rounded-md border px-3 py-2"
                  min="1"
                />
              </div>
            </div>

            {config.game === 'slots' && renderSlotConfig(config)}
            {config.game === 'roulette' && renderRouletteConfig(config)}
            {config.game === 'blackjack' && renderBlackjackConfig(config)}
            {config.game === 'poker' && renderPokerConfig(config)}
          </div>
        ))}
      </div>
    </div>
  );
};