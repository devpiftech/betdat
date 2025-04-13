import { supabase } from '../supabase';
import { socket } from '../socket';

export type RewardType = 
  | 'daily_login'
  | 'ad_view'
  | 'level_up'
  | 'achievement'
  | 'friend_referral'
  | 'first_purchase'
  | 'social_share'
  | 'tournament_entry'
  | 'vip_bonus';

interface RewardConfig {
  type: RewardType;
  regular_amount: number;
  sweeps_amount: number;
  cooldown?: number; // In hours
  max_daily?: number;
}

const REWARDS: Record<RewardType, RewardConfig> = {
  daily_login: {
    type: 'daily_login',
    regular_amount: 1000, // $10.00
    sweeps_amount: 200,   // $2.00
    cooldown: 24
  },
  ad_view: {
    type: 'ad_view',
    regular_amount: 100,  // $1.00
    sweeps_amount: 20,    // $0.20
    cooldown: 1,
    max_daily: 5
  },
  level_up: {
    type: 'level_up',
    regular_amount: 5000, // $50.00
    sweeps_amount: 1000,  // $10.00
  },
  achievement: {
    type: 'achievement',
    regular_amount: 500,  // $5.00
    sweeps_amount: 100,   // $1.00
  },
  friend_referral: {
    type: 'friend_referral',
    regular_amount: 2000, // $20.00
    sweeps_amount: 400,   // $4.00
  },
  first_purchase: {
    type: 'first_purchase',
    regular_amount: 2000, // $20.00
    sweeps_amount: 400,   // $4.00
  },
  social_share: {
    type: 'social_share',
    regular_amount: 200,  // $2.00
    sweeps_amount: 40,    // $0.40
    cooldown: 24
  },
  tournament_entry: {
    type: 'tournament_entry',
    regular_amount: 300,  // $3.00
    sweeps_amount: 60,    // $0.60
  },
  vip_bonus: {
    type: 'vip_bonus',
    regular_amount: 10000, // $100.00
    sweeps_amount: 2000,   // $20.00
    cooldown: 168 // Weekly
  }
};

class RewardsSystem {
  async claimReward(userId: string, type: RewardType): Promise<boolean> {
    try {
      const reward = REWARDS[type];
      if (!reward) return false;

      // Check cooldown and daily limits
      if (!await this.canClaimReward(userId, type)) {
        return false;
      }

      // Record reward claim
      const { error: claimError } = await supabase
        .from('reward_claims')
        .insert([{
          user_id: userId,
          reward_type: type,
          regular_amount: reward.regular_amount,
          sweeps_amount: reward.sweeps_amount
        }]);

      if (claimError) throw claimError;

      // Update balances
      const { error: balanceError } = await supabase.rpc('update_balances', {
        p_user_id: userId,
        p_regular_amount: reward.regular_amount,
        p_sweeps_amount: reward.sweeps_amount
      });

      if (balanceError) throw balanceError;

      // Notify client
      socket.emit('reward_claimed', {
        userId,
        type,
        regular_amount: reward.regular_amount,
        sweeps_amount: reward.sweeps_amount
      });

      return true;
    } catch (error) {
      console.error('Error claiming reward:', error);
      return false;
    }
  }

  private async canClaimReward(userId: string, type: RewardType): Promise<boolean> {
    const reward = REWARDS[type];
    if (!reward) return false;

    // Check cooldown
    if (reward.cooldown) {
      const cooldownHours = reward.cooldown;
      const { data: lastClaim } = await supabase
        .from('reward_claims')
        .select('created_at')
        .eq('user_id', userId)
        .eq('reward_type', type)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (lastClaim) {
        const lastClaimTime = new Date(lastClaim.created_at).getTime();
        const cooldownTime = cooldownHours * 60 * 60 * 1000;
        if (Date.now() - lastClaimTime < cooldownTime) {
          return false;
        }
      }
    }

    // Check daily limit
    if (reward.max_daily) {
      const today = new Date().toISOString().split('T')[0];
      const { count } = await supabase
        .from('reward_claims')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('reward_type', type)
        .gte('created_at', today);

      if (count && count >= reward.max_daily) {
        return false;
      }
    }

    return true;
  }

  async getAvailableRewards(userId: string): Promise<RewardType[]> {
    const available: RewardType[] = [];

    for (const type of Object.keys(REWARDS) as RewardType[]) {
      if (await this.canClaimReward(userId, type)) {
        available.push(type);
      }
    }

    return available;
  }

  async getRewardHistory(userId: string, limit: number = 10): Promise<any[]> {
    const { data } = await supabase
      .from('reward_claims')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    return data || [];
  }

  getRewardConfig(type: RewardType): RewardConfig | null {
    return REWARDS[type] || null;
  }
}

export const rewardsSystem = new RewardsSystem();