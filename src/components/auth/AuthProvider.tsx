import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../store/useStore';
import { getProfile } from '../../lib/supabase';
import { connectSocket, disconnectSocket } from '../../lib/socket';
import { FriendRequests } from '../social/FriendRequests';
import { AchievementNotification } from '../social/AchievementNotification';
import type { Achievement } from '../../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { setUser: setStoreUser, reset } = useStore();
  const [achievement, setAchievement] = useState<Achievement | null>(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        getProfile(session.user.id).then((profile) => {
          if (profile) {
            setStoreUser(profile);
            connectSocket(session.user.id);
          }
        });
      } else {
        reset(); // Clear store if no session
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const profile = await getProfile(session.user.id);
        if (profile) {
          setStoreUser(profile);
          connectSocket(session.user.id);
        }
      } else {
        reset(); // Clear store on sign out
        disconnectSocket();
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      disconnectSocket();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
      <FriendRequests />
      {achievement && (
        <AchievementNotification
          achievement={achievement}
          onClose={() => setAchievement(null)}
        />
      )}
    </AuthContext.Provider>
  );
};