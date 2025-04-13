import { useState, useEffect } from 'react';
import { Trophy, Award, Coins, Gamepad2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';
import type { Profile } from '../../types';

type LeaderboardFilter = 'daily' | 'weekly' | 'monthly' | 'all-time';
type LeaderboardCategory = 'winnings' | 'games' | 'tournaments';

interface LeaderboardEntry extends Profile {
  total_winnings: number;
  games_played: number;
  tournaments_won: number;
  rank: number;
}

export const Leaderboard = () => {
  const [filter, setFilter] = useState<LeaderboardFilter>('weekly');
  const [category, setCategory] = useState<LeaderboardCategory>('winnings');
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      
      // Fetch leaderboard data based on filter and category
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          avatar_url,
          balance,
          vip_level,
          game_stats (games_played, total_won),
          tournament_participants (tournament_id)
        `)
        .order('balance', { ascending: false })
        .limit(100);

      if (!error && data) {
        const leaderboardData = data.map((profile, index) => ({
          ...profile,
          total_winnings: profile.balance,
          games_played: profile.game_stats?.reduce((total, stat) => total + stat.games_played, 0) || 0,
          tournaments_won: profile.tournament_participants?.length || 0,
          rank: index + 1,
        }));

        setLeaders(leaderboardData);
      }
      
      setLoading(false);
    };

    fetchLeaderboard();
  }, [filter, category]);

  const renderRankBadge = (rank: number) => {
    const badgeClasses = rank === 1 ? 'bg-yellow-100 text-yellow-800' :
      rank === 2 ? 'bg-gray-100 text-gray-800' :
      rank === 3 ? 'bg-amber-100 text-amber-800' :
      'bg-blue-100 text-blue-800';

    return (
      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${badgeClasses} font-bold`}>
        {rank}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Leaderboard</h1>
        <div className="flex gap-4">
          <div className="flex rounded-lg bg-white p-1 shadow-sm">
            {(['daily', 'weekly', 'monthly', 'all-time'] as LeaderboardFilter[]).map((f) => (
              <Button
                key={f}
                variant={filter === f ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilter(f)}
                className="capitalize"
              >
                {f.replace('-', ' ')}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-4">
        <div className="lg:col-span-3">
          {/* Main Leaderboard */}
          <div className="rounded-lg bg-white p-6 shadow-lg">
            <div className="mb-6 flex gap-4">
              {[
                { id: 'winnings', icon: Coins, label: 'Total Winnings' },
                { id: 'games', icon: Gamepad2, label: 'Games Played' },
                { id: 'tournaments', icon: Trophy, label: 'Tournaments Won' },
              ].map((cat) => (
                <Button
                  key={cat.id}
                  variant={category === cat.id ? 'default' : 'secondary'}
                  onClick={() => setCategory(cat.id as LeaderboardCategory)}
                  className="flex-1"
                >
                  <cat.icon className="mr-2 h-4 w-4" />
                  {cat.label}
                </Button>
              ))}
            </div>

            <div className="space-y-4">
              {loading ? (
                <div className="flex h-64 items-center justify-center">
                  <p className="text-gray-500">Loading leaderboard...</p>
                </div>
              ) : (
                leaders.map((leader) => (
                  <div
                    key={leader.id}
                    className="flex items-center justify-between rounded-lg bg-gray-50 p-4 transition-colors hover:bg-gray-100"
                  >
                    <div className="flex items-center space-x-4">
                      {renderRankBadge(leader.rank)}
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-medium">{leader.username}</p>
                          {leader.vip_level > 1 && (
                            <Trophy className="h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          VIP Level {leader.vip_level}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {category === 'winnings' && (
                        <p className="font-bold text-green-600">
                          ${leader.total_winnings}
                        </p>
                      )}
                      {category === 'games' && (
                        <p className="font-bold text-blue-600">
                          {leader.games_played} games
                        </p>
                      )}
                      {category === 'tournaments' && (
                        <p className="font-bold text-purple-600">
                          {leader.tournaments_won} wins
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Your Rank */}
          <div className="rounded-lg bg-white p-6 shadow-lg">
            <h3 className="mb-4 font-semibold">Your Rankings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Coins className="h-4 w-4 text-yellow-500" />
                  <span>Winnings</span>
                </div>
                <span className="font-bold">#42</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Gamepad2 className="h-4 w-4 text-blue-500" />
                  <span>Games</span>
                </div>
                <span className="font-bold">#67</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Trophy className="h-4 w-4 text-purple-500" />
                  <span>Tournaments</span>
                </div>
                <span className="font-bold">#28</span>
              </div>
            </div>
          </div>

          {/* Hall of Fame */}
          <div className="rounded-lg bg-white p-6 shadow-lg">
            <h3 className="mb-4 font-semibold">Hall of Fame</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Award className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="font-medium">Highest Single Win</p>
                  <p className="text-sm text-gray-500">
                    PlayerOne - $25,000
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Award className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="font-medium">Most Games Played</p>
                  <p className="text-sm text-gray-500">
                    GameMaster - 1,547 games
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Award className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="font-medium">Tournament Champion</p>
                  <p className="text-sm text-gray-500">
                    ProPlayer - 12 wins
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};