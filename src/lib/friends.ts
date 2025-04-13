import { supabase } from './supabase';
import { socket } from './socket';
import type { Friend, Profile } from '../types';

export const sendFriendRequest = async (
  userId: string,
  friendId: string
) => {
  const { error } = await supabase
    .from('friends')
    .insert([{
      user_id: userId,
      friend_id: friendId,
      status: 'pending',
    }]);

  if (!error) {
    socket.emit('friend_request', {
      to: friendId,
      from: userId,
    });
  }

  return !error;
};

export const acceptFriendRequest = async (
  userId: string,
  friendId: string
) => {
  const { error } = await supabase
    .from('friends')
    .update({ status: 'accepted' })
    .eq('user_id', friendId)
    .eq('friend_id', userId);

  if (!error) {
    await supabase
      .from('friends')
      .insert([{
        user_id: userId,
        friend_id: friendId,
        status: 'accepted',
      }]);
  }

  return !error;
};

export const getFriendRequests = async (userId: string) => {
  const { data } = await supabase
    .from('friends')
    .select(`
      *,
      profile:profiles!friend_id(*)
    `)
    .eq('friend_id', userId)
    .eq('status', 'pending');

  return data as (Friend & { profile: Profile })[] | null;
};

export const getFriends = async (userId: string) => {
  const { data } = await supabase
    .from('friends')
    .select(`
      *,
      profile:profiles!friend_id(*)
    `)
    .eq('user_id', userId)
    .eq('status', 'accepted');

  return data as (Friend & { profile: Profile })[] | null;
};