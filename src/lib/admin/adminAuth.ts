import { supabase } from '../supabase';

export const isAdmin = async (userId: string): Promise<boolean> => {
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  return data?.role === 'admin';
};

export const requireAdmin = async (userId: string | undefined): Promise<void> => {
  if (!userId || !await isAdmin(userId)) {
    throw new Error('Unauthorized: Admin access required');
  }
};