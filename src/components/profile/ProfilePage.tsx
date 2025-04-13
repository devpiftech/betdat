import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Button } from '../ui/Button';
import { Trophy, Gamepad2, History, Award, Users } from 'lucide-react';
import { updateProfile } from '../../lib/supabase';
import { ReferralDashboard } from './ReferralDashboard';
import { CashbackHistory } from './CashbackHistory';

export const ProfilePage = () => {
  const { user, setUser } = useStore();
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const [error, setError] = useState('');

  if (!user) return null;

  const handleSave = async () => {
    try {
      const updatedProfile = await updateProfile(user.id, { username });
      setUser(updatedProfile);
      setEditing(false);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="grid gap-8 md:grid-cols-3">
        {/* Profile Overview */}
        <div className="space-y-6 md:col-span-2">
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                {editing ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="rounded-md border px-3 py-2"
                    />
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <div className="space-x-2">
                      <Button onClick={handleSave}>Save</Button>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setEditing(false);
                          setUsername(user.username);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold">{user.username}</h2>
                    <Button
                      variant="ghost"
                      onClick={() => setEditing(true)}
                    >
                      Edit Profile
                    </Button>
                  </>
                )}
              </div>
              <div className="flex items-center space-x-2 rounded-full bg-blue-50 px-4 py-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <span className="font-medium">VIP Level {user.vip_level}</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="flex items-center space-x-2">
                <Gamepad2 className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold">Games Played</h3>
              </div>
              <p className="mt-2 text-3xl font-bold">247</p>
            </div>
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="flex items-center space-x-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <h3 className="font-semibold">Total Winnings</h3>
              </div>
              <p className="mt-2 text-3xl font-bold">${user.regular_balance}</p>
            </div>
          </div>

          {/* Referral Dashboard */}
          <ReferralDashboard />

          {/* Cashback History */}
          <CashbackHistory />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Achievements */}
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Award className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold">Achievements</h3>
              </div>
              <span className="text-sm text-gray-500">12/50</span>
            </div>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100">
                  <Trophy className="h-4 w-4 text-yellow-600" />
                </div>
                <div>
                  <p className="font-medium">High Roller</p>
                  <p className="text-sm text-gray-500">Win 1000 chips in one game</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                  <Gamepad2 className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Game Master</p>
                  <p className="text-sm text-gray-500">Play all game types</p>
                </div>
              </div>
            </div>
          </div>

          {/* Friends */}
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="mb-4 flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold">Friends</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 rounded-full bg-gray-200" />
                  <div>
                    <p className="font-medium">Alex Smith</p>
                    <p className="text-sm text-gray-500">Online</p>
                  </div>
                </div>
                <Button variant="secondary" size="sm">Challenge</Button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 rounded-full bg-gray-200" />
                  <div>
                    <p className="font-medium">Sarah Johnson</p>
                    <p className="text-sm text-gray-500">Last seen 2h ago</p>
                  </div>
                </div>
                <Button variant="secondary" size="sm">Challenge</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};