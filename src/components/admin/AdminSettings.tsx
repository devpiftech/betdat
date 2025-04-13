import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { Button } from '../ui/Button';
import { Settings, Save, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SystemSettings {
  referral_rewards: {
    referrer_regular: number;
    referrer_sweeps: number;
    referred_regular: number;
    referred_sweeps: number;
  };
  cashback: {
    rate: number;
    min_loss: number;
    processing_time: string;
  };
  email_notifications: {
    referral_enabled: boolean;
    cashback_enabled: boolean;
    welcome_enabled: boolean;
  };
}

export const AdminSettings = () => {
  const { user } = useStore();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (err) {
      console.error('Error loading settings:', err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      setError(null);

      const { error } = await supabase
        .from('system_settings')
        .update(settings)
        .eq('id', 1); // Assuming single settings row

      if (error) throw error;
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Loading settings...</div>;
  }

  if (!settings) {
    return <div>Failed to load settings</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-gray-600" />
          <h2 className="text-xl font-bold">System Settings</h2>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={loadSettings}
            disabled={loading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button
            onClick={saveSettings}
            disabled={saving}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-800">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Referral Settings */}
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-semibold">Referral Rewards</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Referrer Regular Coins
              </label>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-gray-500">$</span>
                <input
                  type="number"
                  value={settings.referral_rewards.referrer_regular / 100}
                  onChange={(e) => setSettings({
                    ...settings,
                    referral_rewards: {
                      ...settings.referral_rewards,
                      referrer_regular: Math.round(parseFloat(e.target.value) * 100)
                    }
                  })}
                  className="block w-full rounded-md border px-3 py-2"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Referrer WayneBucks
              </label>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-gray-500">$</span>
                <input
                  type="number"
                  value={settings.referral_rewards.referrer_sweeps / 100}
                  onChange={(e) => setSettings({
                    ...settings,
                    referral_rewards: {
                      ...settings.referral_rewards,
                      referrer_sweeps: Math.round(parseFloat(e.target.value) * 100)
                    }
                  })}
                  className="block w-full rounded-md border px-3 py-2"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Friend Regular Coins
              </label>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-gray-500">$</span>
                <input
                  type="number"
                  value={settings.referral_rewards.referred_regular / 100}
                  onChange={(e) => setSettings({
                    ...settings,
                    referral_rewards: {
                      ...settings.referral_rewards,
                      referred_regular: Math.round(parseFloat(e.target.value) * 100)
                    }
                  })}
                  className="block w-full rounded-md border px-3 py-2"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Friend WayneBucks
              </label>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-gray-500">$</span>
                <input
                  type="number"
                  value={settings.referral_rewards.referred_sweeps / 100}
                  onChange={(e) => setSettings({
                    ...settings,
                    referral_rewards: {
                      ...settings.referral_rewards,
                      referred_sweeps: Math.round(parseFloat(e.target.value) * 100)
                    }
                  })}
                  className="block w-full rounded-md border px-3 py-2"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Cashback Settings */}
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-semibold">Cashback Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Cashback Rate (%)
              </label>
              <input
                type="number"
                value={settings.cashback.rate * 100}
                onChange={(e) => setSettings({
                  ...settings,
                  cashback: {
                    ...settings.cashback,
                    rate: parseFloat(e.target.value) / 100
                  }
                })}
                className="mt-1 block w-full rounded-md border px-3 py-2"
                min="0"
                max="100"
                step="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Minimum Loss for Cashback
              </label>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-gray-500">$</span>
                <input
                  type="number"
                  value={settings.cashback.min_loss / 100}
                  onChange={(e) => setSettings({
                    ...settings,
                    cashback: {
                      ...settings.cashback,
                      min_loss: Math.round(parseFloat(e.target.value) * 100)
                    }
                  })}
                  className="block w-full rounded-md border px-3 py-2"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Processing Time
              </label>
              <select
                value={settings.cashback.processing_time}
                onChange={(e) => setSettings({
                  ...settings,
                  cashback: {
                    ...settings.cashback,
                    processing_time: e.target.value
                  }
                })}
                className="mt-1 block w-full rounded-md border px-3 py-2"
              >
                <option value="01:00">1:00 AM</option>
                <option value="02:00">2:00 AM</option>
                <option value="03:00">3:00 AM</option>
                <option value="04:00">4:00 AM</option>
                <option value="05:00">5:00 AM</option>
              </select>
            </div>
          </div>
        </div>

        {/* Email Settings */}
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-semibold">Email Notifications</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Referral Rewards
              </label>
              <div className="relative inline-block w-12 select-none">
                <input
                  type="checkbox"
                  checked={settings.email_notifications.referral_enabled}
                  onChange={(e) => setSettings({
                    ...settings,
                    email_notifications: {
                      ...settings.email_notifications,
                      referral_enabled: e.target.checked
                    }
                  })}
                  className="toggle-checkbox absolute block h-6 w-6 cursor-pointer appearance-none rounded-full border-4 border-gray-300 bg-white checked:right-0 checked:border-blue-600"
                />
                <div className="toggle-label h-6 rounded-full bg-gray-300 checked:bg-blue-600"></div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Cashback Credited
              </label>
              <div className="relative inline-block w-12 select-none">
                <input
                  type="checkbox"
                  checked={settings.email_notifications.cashback_enabled}
                  onChange={(e) => setSettings({
                    ...settings,
                    email_notifications: {
                      ...settings.email_notifications,
                      cashback_enabled: e.target.checked
                    }
                  })}
                  className="toggle-checkbox absolute block h-6 w-6 cursor-pointer appearance-none rounded-full border-4 border-gray-300 bg-white checked:right-0 checked:border-blue-600"
                />
                <div className="toggle-label h-6 rounded-full bg-gray-300 checked:bg-blue-600"></div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Welcome Email
              </label>
              <div className="relative inline-block w-12 select-none">
                <input
                  type="checkbox"
                  checked={settings.email_notifications.welcome_enabled}
                  onChange={(e) => setSettings({
                    ...settings,
                    email_notifications: {
                      ...settings.email_notifications,
                      welcome_enabled: e.target.checked
                    }
                  })}
                  className="toggle-checkbox absolute block h-6 w-6 cursor-pointer appearance-none rounded-full border-4 border-gray-300 bg-white checked:right-0 checked:border-blue-600"
                />
                <div className="toggle-label h-6 rounded-full bg-gray-300 checked:bg-blue-600"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};