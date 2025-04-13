import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { CreditCard, Package, Shield, Check, Coins, Gift, Trophy } from 'lucide-react';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/supabase';

interface CurrencyPackage {
  id: string;
  name: string;
  amount: number;
  bonus_amount: number;
  price: number;
  featured: boolean;
  currency: {
    code: string;
    name: string;
    type: 'regular' | 'sweepstakes';
  };
}

export const CurrencyStore = () => {
  const { user } = useStore();
  const [packages, setPackages] = useState<CurrencyPackage[]>([]);
  const [selectedType, setSelectedType] = useState<'regular' | 'sweepstakes'>('regular');
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPackages();
  }, [selectedType]);

  const loadPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('currency_packages')
        .select(`
          *,
          currency:currencies(code, name, type)
        `)
        .eq('active', true)
        .eq('currency.type', selectedType)
        .order('price');

      if (error) throw error;
      if (data) setPackages(data);
    } catch (err) {
      console.error('Error loading packages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (pkg: CurrencyPackage) => {
    if (!user) return;

    try {
      setPurchasing(true);
      setError(null);

      // Create purchase record
      const { data: purchase, error: purchaseError } = await supabase.rpc(
        'purchase_currency_package',
        {
          p_package_id: pkg.id,
          p_payment_method: 'card'
        }
      );

      if (purchaseError) throw purchaseError;

      // TODO: Integrate with payment processor
      // For now, simulate successful payment
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Complete purchase
      const { error: completeError } = await supabase.rpc(
        'complete_currency_purchase',
        {
          p_purchase_id: purchase,
          p_status: 'completed'
        }
      );

      if (completeError) throw completeError;

      // Refresh packages
      await loadPackages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process purchase');
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-indigo-900 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            Purchase Game Credits
          </h1>
          <p className="mt-4 text-lg text-gray-300">
            Choose a package that suits your gaming needs
          </p>
        </div>

        <div className="mt-8 flex justify-center gap-4">
          <Button
            variant={selectedType === 'regular' ? 'default' : 'secondary'}
            onClick={() => setSelectedType('regular')}
            className="gap-2"
          >
            <Coins className="h-4 w-4" />
            Game Coins
          </Button>
          <Button
            variant={selectedType === 'sweepstakes' ? 'default' : 'secondary'}
            onClick={() => setSelectedType('sweepstakes')}
            className="gap-2"
          >
            <Gift className="h-4 w-4" />
            WayneBucks
          </Button>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`relative rounded-lg ${
                pkg.featured
                  ? 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 ring-2 ring-blue-500'
                  : 'bg-white/10'
              } p-8 backdrop-blur-sm`}
            >
              {pkg.featured && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-blue-500 px-4 py-1 text-sm font-medium text-white">
                  Most Popular
                </div>
              )}

              <div className="text-center">
                <h3 className="text-xl font-bold text-white">{pkg.name}</h3>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-white">
                    ${pkg.price}
                  </span>
                </div>

                <ul className="mt-8 space-y-4 text-left">
                  <li className="flex items-center text-gray-300">
                    <Check className="mr-3 h-5 w-5 text-green-400" />
                    {formatCurrency(pkg.amount)} {pkg.currency.type === 'regular' ? 'Coins' : 'WayneBucks'}
                  </li>
                  {pkg.bonus_amount > 0 && (
                    <li className="flex items-center text-gray-300">
                      <Check className="mr-3 h-5 w-5 text-green-400" />
                      {formatCurrency(pkg.bonus_amount)} Bonus {pkg.currency.type === 'regular' ? 'Coins' : 'WayneBucks'}
                    </li>
                  )}
                  <li className="flex items-center text-gray-300">
                    <Check className="mr-3 h-5 w-5 text-green-400" />
                    Instant Delivery
                  </li>
                </ul>

                <Button
                  className="mt-8 w-full gap-2"
                  variant={pkg.featured ? 'default' : 'secondary'}
                  onClick={() => handlePurchase(pkg)}
                  disabled={purchasing}
                >
                  <CreditCard className="h-4 w-4" />
                  {purchasing ? 'Processing...' : 'Purchase Now'}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-8 rounded-lg bg-red-500/10 p-4 text-center text-red-400">
            {error}
          </div>
        )}

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg bg-white/10 p-6 backdrop-blur-sm">
            <div className="flex items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <h3 className="font-semibold text-white">Secure Payments</h3>
                <p className="mt-1 text-sm text-gray-300">
                  All transactions are encrypted and secure
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white/10 p-6 backdrop-blur-sm">
            <div className="flex items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500">
                <Package className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <h3 className="font-semibold text-white">Instant Delivery</h3>
                <p className="mt-1 text-sm text-gray-300">
                  Credits are added to your account immediately
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white/10 p-6 backdrop-blur-sm">
            <div className="flex items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500">
                <Trophy className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <h3 className="font-semibold text-white">VIP Benefits</h3>
                <p className="mt-1 text-sm text-gray-300">
                  Earn VIP points with every purchase
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};