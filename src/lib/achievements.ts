import { supabase } from './supabase';
import { socket } from './socket';
import type { Achievement } from '../types';

export const checkAchievement = async (
  userId: string,
  type: string,
  value: number
) => {
  const { data: achievements } = await supabase
    .from('achievements')
    .select('*')
    .eq('requirement_type', type)
    .lte('requirement_value', value)
    .not('id', 'in', (
      supabase
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_id', userId)
    ));

  if (achievements && achievements.length > 0) {
    for (const achievement of achievements) {
      await unlockAchievement(userId, achievement);
    }
  }
};

export const unlockAchievement = async (
  userId: string,
  achievement: Achievement
) => {
  const { error } = await supabase
    .from('user_achievements')
    .insert([{
      user_id: userId,
      achievement_id: achievement.id,
    }]);

  if (!error) {
    socket.emit('achievement_unlocked', {
      userId,
      achievement,
    });
  }
};