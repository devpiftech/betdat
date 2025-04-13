import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { Button } from '../ui/Button';
import { Users, Copy, Gift, Share2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/supabase';

interface ReferralStats {
  code: string;
  timesUsed: number;
  totalEarned: {
    regular: number;
    sweeps: number;
  };
  referrals: {
    username: string;
    date: string;
    rewards: {
      regular: number;
      sweeps: number;
    };
  }[];
}

export const ReferralDashboard = () => {
  const { user } = useStore();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user) {
      loadReferralStats();
    }
  }, [user]);

  const loadReferralStats = async () => {
    try {
      // Get referral code
      const { data: codeData } = await supabase
        .from('referral_codes')
        .select('code, times_used')
        .eq('user_id', user?.id)
        .single();

      // Get referral rewards
      const { data: rewardsData } = await supabase
        .from('referral_rewards')
        .select(`
          reward_amount_referrer,
          referred:profiles!referred_id(username),
          created_at
        `)
        .eq('referrer_id', user?.id)
        .order('created_at', { ascending: false });

      if (codeData && rewardsData) {
        const totalEarned = rewardsData.reduce(
          (acc, reward) => ({
            regular: acc.regular + reward.reward_amount_referrer,
            sweeps: acc.regular / 5 // 20% of regular reward
          }),
          { regular: 0, sweeps: 0 }
        );

        const referrals = rewardsData.map(reward => ({
          username: reward.referred.username,
          date: new Date(reward.created_at).toLocaleDateString(),
          rewards: {
            regular: reward.reward_amount_referrer,
            sweeps: reward.reward_amount_referrer / 5
          }
        }));

        setStats({
          code: codeData.code,
          timesUsed: codeData.times_used,
          totalEarned,
          referrals
        });
      }
    } catch (error) {
      console.error('Error loading referral stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralCode = () => {
    if (!stats) return;
    navigator.clipboard.writeText(stats.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareReferralLink = () => {
    if (!stats) return;
    const url = `${window.location.origin}?ref=${stats.code}`;
    navigator.share({
      title: 'Join WayneWagers',
      text: 'Join me on WayneWagers and get $25 in coins + $5 in WayneBucks!',
      url
    }).catch(() => {
      // Fallback to copying link
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) {
    return <div>Loading referral stats...</div>;
  }

  if (!stats) {
    return <div>Failed to load referral stats</div>;
  }

  return (
    <div className="space-y-6 rounded-lg bg-white p-6 shadow-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Referral Program</h2>
        <Users className="h-6 w-6 text-blue-600" />
      </div>

      {/* Rewards Info */}
      <div className="rounded-lg bg-blue-50 p-4">
        <h3 className="mb-2 font-semibold text-blue-900">Referral Rewards</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <p>• You get: $50 in coins + $10 in WayneBucks</p>
          <p>• Friend gets: $25 in coins + $5 in WayneBucks</p>
        </div>
      </div>

      {/* Referral Code */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Your Referral Code
        </label>
        <div className="flex gap-2">
          <div className="flex flex-1 items-center rounded-lg border bg-gray-50 px-4 py-2 font-mono">
            {stats.code}
          </div>
          <Button
            onClick={copyReferralCode}
            variant="secondary"
            className="gap-2"
          >
            <Copy className="h-4 w-4" />
            {copied ? 'Copied!' : 'Copy'}
          </Button>
          <Button onClick={shareReferralLink} className="gap-2">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg bg-gray-50 p-4">
          <p className="text-sm text-gray-600">Total Referrals</p>
          <p className="mt-1 text-2xl font-bold">{stats.timesUsed}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-4">
          <p className="text-sm text-gray-600">Coins Earned</p>
          <p className="mt-1 text-2xl font-bold">
            ${formatCurrency(stats.totalEarned.regular)}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 p-4">
          <p className="text-sm text-gray-600">WayneBucks Earned</p>
          <p className="mt-1 text-2xl font-bold">
            ${formatCurrency(stats.totalEarned.sweeps)}
          </p>
        </div>
      </div>

      {/* Recent Referrals */}
      {stats.referrals.length > 0 && (
        <div>
          <h3 className="mb-4 font-semibold">Recent Referrals</h3>
          <div className="space-y-2">
            {stats.referrals.map((referral, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg bg-gray-50 p-4"
              >
                <div>
                  <p className="font-medium">{referral.username}</p>
                  <p className="text-sm text-gray-500">{referral.date}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-green-600">
                    +${formatCurrency(referral.rewards.regular)}
                  </p>
                  <p className="text-sm text-purple-600">
                    +${formatCurrency(referral.rewards.sweeps)} WB
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};