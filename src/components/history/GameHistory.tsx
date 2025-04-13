import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { Calendar, Search, Filter } from 'lucide-react';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';
import type { Transaction } from '../../types';

export const GameHistory = () => {
  const { user } = useStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'wins' | 'losses'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) return;

      const query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (filter === 'wins') {
        query.eq('type', 'win');
      } else if (filter === 'losses') {
        query.eq('type', 'loss');
      }

      const { data } = await query;
      if (data) setTransactions(data);
      setLoading(false);
    };

    fetchHistory();
  }, [user, filter]);

  const filteredTransactions = transactions.filter(transaction =>
    transaction.game.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-indigo-900 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-bold text-white">Gaming History</h1>
          
          <div className="flex gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search games..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-lg bg-white/10 pl-10 pr-4 py-2 text-white placeholder-gray-400 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <Button variant="secondary" className="gap-2">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </div>
        </div>

        <div className="mb-8 flex gap-2">
          {(['all', 'wins', 'losses'] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'secondary'}
              onClick={() => setFilter(f)}
              className="capitalize"
            >
              {f}
            </Button>
          ))}
        </div>

        <div className="space-y-4">
          {filteredTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className="rounded-lg bg-white/10 p-6 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {transaction.game}
                  </h3>
                  <div className="mt-1 flex items-center text-sm text-gray-400">
                    <Calendar className="mr-1 h-4 w-4" />
                    {new Date(transaction.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-xl font-bold ${
                    transaction.type === 'win' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {transaction.type === 'win' ? '+' : '-'}${Math.abs(transaction.amount)}
                  </p>
                  <p className="text-sm text-gray-400">
                    {transaction.type === 'win' ? 'Won' : 'Lost'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};