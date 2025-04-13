import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { Gamepad2, Trophy, History, CreditCard, Award, Users, Gift } from 'lucide-react';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { RewardsPanel } from '../rewards/RewardsPanel';
import { formatCurrency } from '../../lib/supabase';
import type { Transaction, GameStats } from '../../types';

export const UserDashboard = () => {
  const { user } = useStore();
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [gameStats, setGameStats] = useState<GameStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      const [transactionsData, statsData] = await Promise.all([
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('game_stats')
          .select('*')
          .eq('user_id', user.id)
      ]);

      if (transactionsData.data) setRecentTransactions(transactionsData.data);
      if (statsData.data) setGameStats(statsData.data);
      setLoading(false);
    };

    fetchDashboardData();
  }, [user]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-indigo-900 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">
            Welcome back, {user.username}!
          </h1>
          <p className="mt-2 text-gray-300">
            Here's an overview of your gaming activity
          </p>
        </div>

        {/* Quick Actions */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            to="/games"
            className="group rounded-lg bg-white/10 p-6 transition-colors hover:bg-white/20"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500 group-hover:bg-blue-600">
              <Gamepad2 className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">Play Games</h3>
            <p className="mt-2 text-sm text-gray-300">
              Choose from multiple casino games
            </p>
          </Link>

          <Link
            to="/tournaments"
            className="group rounded-lg bg-white/10 p-6 transition-colors hover:bg-white/20"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-500 group-hover:bg-yellow-600">
              <Trophy className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">Tournaments</h3>
            <p className="mt-2 text-sm text-gray-300">
              Join competitive tournaments
            </p>
          </Link>

          <Link
            to="/history"
            className="group rounded-lg bg-white/10 p-6 transition-colors hover:bg-white/20"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-green-500 group-hover:bg-green-600">
              <History className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">History</h3>
            <p className="mt-2 text-sm text-gray-300">
              View your gaming history
            </p>
          </Link>

          <Link
            to="/store"
            className="group rounded-lg bg-white/10 p-6 transition-colors hover:bg-white/20"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500 group-hover:bg-purple-600">
              <CreditCard className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">Buy Credits</h3>
            <p className="mt-2 text-sm text-gray-300">
              Purchase more game credits
            </p>
          </Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <div className="rounded-lg bg-white/10 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Recent Activity</h2>
                <Link to="/history">
                  <Button variant="ghost" size="sm" className="text-gray-300">
                    View All
                  </Button>
                </Link>
              </div>

              <div className="space-y-4">
                {recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between rounded-lg bg-white/5 p-4"
                  >
                    <div>
                      <p className="font-medium text-white">
                        {transaction.type === 'win' ? 'Won' : 'Lost'} at {transaction.game}
                      </p>
                      <p className="text-sm text-gray-400">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`font-bold ${
                      transaction.type === 'win' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {transaction.type === 'win' ? '+' : '-'}${formatCurrency(Math.abs(transaction.amount))}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="mt-8 rounded-lg bg-white/10 p-6">
              <h2 className="mb-4 text-xl font-bold text-white">Statistics</h2>
              <div className="space-y-4">
                {gameStats.map((stat) => (
                  <div key={stat.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-gray-300">{stat.game}</p>
                      <p className="font-medium text-white">
                        {stat.games_played} games
                      </p>
                    </div>
                    <div className="h-2 rounded-full bg-white/5">
                      <div
                        className="h-2 rounded-full bg-blue-500"
                        style={{
                          width: `${Math.min(
                            (stat.total_won / stat.total_wagered) * 100,
                            100
                          )}%`
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Rewards Panel */}
          <div className="space-y-8">
            <RewardsPanel />

            <div className="rounded-lg bg-white/10 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Achievements</h2>
                <Award className="h-6 w-6 text-yellow-400" />
              </div>
              <p className="text-gray-300">
                You've unlocked 12 out of 50 achievements
              </p>
              <div className="mt-4 h-2 rounded-full bg-white/5">
                <div
                  className="h-2 rounded-full bg-yellow-500"
                  style={{ width: '24%' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};