import { supabase } from '../supabase';

export type CurrencyType = 'regular' | 'sweepstakes';

class CurrencyManager {
  async getBalance(userId: string, type: CurrencyType): Promise<number> {
    const { data } = await supabase.rpc('get_currency_balance', {
      p_user_id: userId,
      p_currency_code: type === 'regular' ? 'COINS' : 'SWEEPS'
    });

    return data || 0;
  }

  async updateBalance(
    userId: string,
    type: CurrencyType,
    amount: number,
    transactionType: 'bet' | 'win' | 'purchase' | 'bonus'
  ): Promise<number> {
    const { data, error } = await supabase.rpc('update_currency_balance', {
      p_user_id: userId,
      p_currency_code: type === 'regular' ? 'COINS' : 'SWEEPS',
      p_amount: amount,
      p_type: transactionType
    });

    if (error) throw error;
    return data;
  }

  async purchasePackage(
    userId: string,
    packageId: string,
    paymentMethod: string
  ): Promise<string> {
    const { data, error } = await supabase.rpc('purchase_currency_package', {
      p_user_id: userId,
      p_package_id: packageId,
      p_payment_method: paymentMethod
    });

    if (error) throw error;
    return data;
  }
}

export const currencyManager = new CurrencyManager();