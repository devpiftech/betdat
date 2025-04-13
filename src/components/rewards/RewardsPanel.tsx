import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { Button } from '../ui/Button';
import { Gift, Clock, Award, Share2, Users, Video, Trophy } from 'lucide-react';
import { rewardsSystem, type RewardType } from '../../lib/rewards/rewardsSystem';
import { formatCurrency } from '../../lib/supabase';
import Confetti from 'react-confetti';

export const RewardsPanel = () => {
  const { user } = useStore();
  const [availableRewards, setAvailableRewards] = useState<RewardType[]>([]);
  const [rewardHistory, setRewardHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) {
      loadRewards();
    }
  }, [user]);

  const loadRewards = async () => {
    if (!user) return;

    const [available, history] = await Promise.all([
      rewardsSystem.getAvailableRewards(user.id),
      rewardsSystem.getRewardHistory(user.id)
    ]);

    setAvailableRewards(available);
    setRewardHistory(history);
  };

  const claimReward = async (type: RewardType) => {
    if (!user || loading) return;

    setLoading(true);
    const success = await rewardsSystem.claimReward(user.id, type);
    
    if (success) {
      const config = rewardsSystem.getRewardConfig(type);
      if (config) {
        setShowConfetti(true);
        setMessage(`Claimed ${formatCurrency(config.regular_amount)} coins and ${formatCurrency(config.sweeps_amount)} SC!`);
        setTimeout(() => {
          setShowConfetti(false);
          setMessage('');
        }, 3000);
      }
      await loadRewards();
    }
    setLoading(false);
  };

  const getRewardIcon = (type: RewardType) => {
    switch (type) {
      case 'daily_login':
        return <Clock className="h-5 w-5" />;
      case 'ad_view':
        return <Video className="h-5 w-5" />;
      case 'achievement':
        return <Award className="h-5 w-5" />;
      case 'friend_referral':
        return <Users className="h-5 w-5" />;
      case 'social_share':
        return <Share2 className="h-5 w-5" />;
      case 'tournament_entry':
        return <Trophy className="h-5 w-5" />;
      default:
        return <Gift className="h-5 w-5" />;
    }
  };

  const getRewardTitle = (type: RewardType): string => {
    switch (type) {
      case 'daily_login':
        return 'Daily Login Bonus';
      case 'ad_view':
        return 'Watch Ad Reward';
      case 'level_up':
        return 'Level Up Bonus';
      case 'achievement':
        return 'Achievement Reward';
      case 'friend_referral':
        return 'Friend Referral Bonus';
      case 'first_purchase':
        return 'First Purchase Bonus';
      case 'social_share':
        return 'Social Share Reward';
      case 'tournament_entry':
        return 'Tournament Entry Bonus';
      case 'vip_bonus':
        return 'VIP Weekly Bonus';
      default:
        return 'Bonus Reward';
    }
  };

  if (!user) return null;

  return (
    <div className="rounded-lg bg-white p-6 shadow-lg">
      {showConfetti && <Confetti />}

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold">Available Rewards</h2>
        <Button
          variant="secondary"
          size="sm"
          onClick={loadRewards}
          disabled={loading}
        >
          Refresh
        </Button>
      </div>

      {message && (
        <div className="mb-4 rounded-lg bg-green-100 p-4 text-green-700">
          {message}
        </div>
      )}

      <div className="space-y-4">
        {availableRewards.map((type) => {
          const config = rewardsSystem.getRewardConfig(type);
          if (!config) return null;

          return (
            <div
              key={type}
              className="flex items-center justify-between rounded-lg border bg-gray-50 p-4"
            >
              <div className="flex items-center space-x-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  {getRewardIcon(type)}
                </div>
                <div>
                  <h3 className="font-medium">{getRewardTitle(type)}</h3>
                  <p className="text-sm text-gray-500">
                    {formatCurrency(config.regular_amount)} coins + {formatCurrency(config.sweeps_amount)} SC
                  </p>
                </div>
              </div>
              <Button
                onClick={() => claimReward(type)}
                disabled={loading}
              >
                Claim
              </Button>
            </div>
          );
        })}

        {availableRewards.length === 0 && (
          <p className="text-center text-gray-500">
            No rewards available right now. Check back later!
          </p>
        )}
      </div>

      {rewardHistory.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-4 font-semibold">Recent Rewards</h3>
          <div className="space-y-2">
            {rewardHistory.map((reward) => (
              <div
                key={reward.id}
                className="flex items-center justify-between rounded-lg bg-gray-50 p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{getRewardTitle(reward.reward_type)}</p>
                  <p className="text-gray-500">
                    {new Date(reward.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-green-600">
                    +{formatCurrency(reward.regular_amount)} coins
                  </p>
                  <p className="text-sm text-purple-600">
                    +{formatCurrency(reward.sweeps_amount)} SC
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