import { supabase, CURRENCY_MULTIPLIER, formatCurrency } from '../supabase';
import { antiCheat } from '../security/antiCheat';
import { getMinBet, getMaxBet } from '../supabase';
import { errorTracker } from '../monitoring/errorTracker';

export class BettingSystem {
  private static instance: BettingSystem;
  private initialized: boolean = false;
  private readonly PAYOUT_DELAY = 500; // ms delay between win and payout

  private constructor() {}

  public static getInstance(): BettingSystem {
    if (!BettingSystem.instance) {
      BettingSystem.instance = new BettingSystem();
    }
    return BettingSystem.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Verify connection to Supabase
      const { error } = await supabase.from('connection_test').select('id').limit(1);
      if (error) throw error;
      
      this.initialized = true;
    } catch (error) {
      errorTracker.trackError('betting_init', error);
      throw new Error('Failed to initialize betting system');
    }
  }

  async placeBet(
    userId: string,
    gameId: string,
    amount: number,
    gameType: string,
    currencyType: 'regular' | 'sweepstakes' = 'regular'
  ): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Get currency-specific limits
      const minBet = getMinBet(currencyType);
      const maxBet = getMaxBet(currencyType);

      // Validate bet amount
      if (amount < minBet || amount > maxBet) {
        throw new Error(`Invalid bet amount. Must be between $${formatCurrency(minBet)} and $${formatCurrency(maxBet)}`);
      }

      // Get user's current balance and VIP level
      const { data: profile } = await supabase
        .from('profiles')
        .select('regular_balance, sweeps_balance, vip_level')
        .eq('id', userId)
        .single();

      if (!profile) {
        throw new Error('User profile not found');
      }

      const balance = currencyType === 'regular' ? profile.regular_balance : profile.sweeps_balance;
      if (balance < amount) {
        throw new Error(`Insufficient ${currencyType} balance`);
      }

      // Anti-cheat validation
      const isValid = await antiCheat.validateAction(gameId, userId, {
        type: 'bet',
        data: { amount, currencyType },
        timestamp: new Date().toISOString(),
        sessionId: gameId,
        userId
      });

      if (!isValid) {
        throw new Error('Bet validation failed');
      }

      // Start transaction
      const { error: transactionError } = await supabase.rpc('place_bet', {
        p_user_id: userId,
        p_game_id: gameId,
        p_amount: amount,
        p_game_type: gameType,
        p_currency_type: currencyType
      });

      if (transactionError) throw transactionError;

      return true;
    } catch (error) {
      errorTracker.trackError('place_bet', error);
      return false;
    }
  }

  async resolveBet(
    userId: string,
    gameId: string,
    amount: number,
    won: boolean,
    currencyType: 'regular' | 'sweepstakes' = 'regular'
  ): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Add slight delay for UX
      await new Promise(resolve => setTimeout(resolve, this.PAYOUT_DELAY));

      if (won) {
        // Update balance using RPC function
        const { error: balanceError } = await supabase.rpc('resolve_bet', {
          p_user_id: userId,
          p_game_id: gameId,
          p_amount: amount,
          p_won: true,
          p_currency_type: currencyType
        });

        if (balanceError) throw balanceError;

        // Update daily stats
        await supabase.rpc('update_daily_stats', {
          p_user_id: userId,
          p_amount_won: amount,
          p_currency_type: currencyType
        });
      }

      return true;
    } catch (error) {
      errorTracker.trackError('resolve_bet', error);
      return false;
    }
  }

  async getPlayerLimits(userId: string, currencyType: 'regular' | 'sweepstakes' = 'regular'): Promise<{
    minBet: number;
    maxBet: number;
    dailyLimit: number;
    remainingDaily: number;
  }> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const { data: limits } = await supabase.rpc('get_betting_limits', {
        p_user_id: userId,
        p_currency_type: currencyType
      });

      if (!limits) {
        throw new Error('Failed to get betting limits');
      }

      return {
        minBet: limits.min_bet,
        maxBet: limits.max_bet,
        dailyLimit: limits.daily_limit,
        remainingDaily: limits.remaining_daily
      };
    } catch (error) {
      errorTracker.trackError('get_limits', error);
      throw error;
    }
  }

  async validatePayout(
    gameId: string,
    userId: string,
    amount: number,
    gameType: string
  ): Promise<boolean> {
    try {
      const { data: gameConfig } = await supabase
        .from('game_configs')
        .select('config')
        .eq('game', gameType)
        .single();

      if (!gameConfig) {
        throw new Error('Game configuration not found');
      }

      // Validate against max possible payout
      const maxPayout = this.calculateMaxPayout(gameConfig.config, amount);
      if (amount > maxPayout) {
        throw new Error('Invalid payout amount');
      }

      // Verify game outcome
      const { data: gameOutcome } = await supabase
        .from('game_actions')
        .select('data')
        .eq('session_id', gameId)
        .eq('player_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!gameOutcome) {
        throw new Error('Game outcome not found');
      }

      return true;
    } catch (error) {
      errorTracker.trackError('validate_payout', error);
      return false;
    }
  }

  private calculateMaxPayout(config: any, betAmount: number): number {
    const maxMultiplier = Math.max(
      ...Object.values(config.payouts || {}).map((p: any) => Number(p))
    );
    return betAmount * maxMultiplier;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  // Helper methods for bet increments
  getIncrementAmount(currencyType: 'regular' | 'sweepstakes' = 'regular'): number {
    return getMinBet(currencyType);
  }

  getDefaultBet(currencyType: 'regular' | 'sweepstakes' = 'regular'): number {
    return getMinBet(currencyType);
  }
}

export const bettingSystem = BettingSystem.getInstance();