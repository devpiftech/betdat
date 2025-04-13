import { useState, useEffect } from 'react';
import { LineChart, BarChart, DollarSign, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface GameStats {
  date: string;
  totalPlayers: number;
  totalWagered: number;
  totalPayout: number;
}

export const GameAnalytics = () => {
  const [stats, setStats] = useState<GameStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const { data } = await supabase
        .from('game_stats')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(7);

      if (data) {
        // Transform data for display
        const formattedStats = data.map(stat => ({
          date: new Date(stat.created_at).toLocaleDateString(),
          totalPlayers: stat.games_played,
          totalWagered: stat.total_wagered,
          totalPayout: stat.total_won
        }));
        setStats(formattedStats);
      }
      setLoading(false);
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Daily Active Users</p>
              <p className="mt-1 text-2xl font-semibold">1,234</p>
            </div>
            <div className="rounded-full bg-blue-100 p-3 text-blue-600">
              <LineChart className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-green-600">
            <TrendingUp className="mr-1 h-4 w-4" />
            <span>+12.5% from yesterday</span>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Wagered</p>
              <p className="mt-1 text-2xl font-semibold">$45,678</p>
            </div>
            <div className="rounded-full bg-green-100 p-3 text-green-600">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-green-600">
            <TrendingUp className="mr-1 h-4 w-4" />
            <span>+8.3% from yesterday</span>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Average Session</p>
              <p className="mt-1 text-2xl font-semibold">24m 32s</p>
            </div>
            <div className="rounded-full bg-purple-100 p-3 text-purple-600">
              <BarChart className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-green-600">
            <TrendingUp className="mr-1 h-4 w-4" />
            <span>+5.2% from yesterday</span>
          </div>
        </div>
      </div>

      {/* Add more detailed analytics components here */}
    </div>
  );
};