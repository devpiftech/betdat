import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { Coins, Trophy } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/supabase';

interface CashbackRecord {
  date: string;
  lossAmount: number;
  cashbackAmount: number;
  currencyType: 'regular' | 'sweepstakes';
}

export const CashbackHistory = () => {
  const { user } = useStore();
  const [history, setHistory] = useState<CashbackRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({
    regular: { loss: 0, cashback: 0 },
    sweeps: { loss: 0, cashback: 0 }
  });

  useEffect(() => {
    if (user) {
      loadCashbackHistory();
    }
  }, [user]);

  const loadCashbackHistory = async () => {
    try {
      const { data } = await supabase
        .from('cashback_rewards')
        .select('*')
        .eq('user_id', user?.id)
        .order('date', { ascending: false });

      if (data) {
        const records = data.map(record => ({
          date: new Date(record.date).toLocaleDateString(),
          lossAmount: record.loss_amount,
          cashbackAmount: record.cashback_amount,
          currencyType: record.currency_type
        }));

        setHistory(records);

        // Calculate totals
        const newTotals = records.reduce(
          (acc, record) => {
            if (record.currencyType === 'regular') {
              acc.regular.loss += record.lossAmount;
              acc.regular.cashback += record.cashbackAmount;
            } else {
              acc.sweeps.loss += record.lossAmount;
              acc.sweeps.cashback += record.cashbackAmount;
            }
            return acc;
          },
          {
            regular: { loss: 0, cashback: 0 },
            sweeps: { loss: 0, cashback: 0 }
          }
        );

        setTotals(newTotals);
      }
    } catch (error) {
      console.error('Error loading cashback history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading cashback history...</div>;
  }

  return (
    <div className="space-y-6 rounded-lg bg-white p-6 shadow-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Daily Cashback</h2>
        <Coins className="h-6 w-6 text-green-600" />
      </div>

      {/* Info Box */}
      <div className="rounded-lg bg-green-50 p-4">
        <h3 className="mb-2 font-semibold text-green-900">Cashback Program</h3>
        <p className="text-sm text-green-800">
          Get 40% cashback on your net daily losses, automatically credited at 1 AM
          the next day.
        </p>
      </div>

      {/* Totals */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-4 rounded-lg bg-gray-50 p-4">
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold">Regular Coins</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Losses</p>
              <p className="text-xl font-bold text-red-600">
                ${formatCurrency(totals.regular.loss)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Cashback</p>
              <p className="text-xl font-bold text-green-600">
                ${formatCurrency(totals.regular.cashback)}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-lg bg-gray-50 p-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold">WayneBucks</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Losses</p>
              <p className="text-xl font-bold text-red-600">
                ${formatCurrency(totals.sweeps.loss)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Cashback</p>
              <p className="text-xl font-bold text-green-600">
                ${formatCurrency(totals.sweeps.cashback)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* History */}
      {history.length > 0 ? (
        <div>
          <h3 className="mb-4 font-semibold">Cashback History</h3>
          <div className="space-y-2">
            {history.map((record, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg bg-gray-50 p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    {record.currencyType === 'regular' ? (
                      <Coins className="h-4 w-4 text-blue-600" />
                    ) : (
                      <Trophy className="h-4 w-4 text-purple-600" />
                    )}
                    <p className="font-medium">
                      {record.currencyType === 'regular'
                        ? 'Regular Coins'
                        : 'WayneBucks'}
                    </p>
                  </div>
                  <p className="text-sm text-gray-500">{record.date}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-red-600">
                    Loss: ${formatCurrency(record.lossAmount)}
                  </p>
                  <p className="text-sm text-green-600">
                    Cashback: ${formatCurrency(record.cashbackAmount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-center text-gray-500">No cashback history yet</p>
      )}
    </div>
  );
};