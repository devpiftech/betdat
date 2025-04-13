import { nanoid } from 'nanoid';
import { secureRNG } from '../../security/secureRNG';
import { fairnessVerifier } from '../../security/fairnessVerifier';
import { bettingSystem } from '../../betting/BettingSystem';
import { errorTracker } from '../../monitoring/errorTracker';
import EventEmitter from 'eventemitter3';

export type SlotSymbol = {
  id: string;
  weight: number;
  payout: number;
  name: string;
};

export type PaylinePattern = number[][];

export type SlotConfig = {
  id: string;
  name: string;
  symbols: Record<string, SlotSymbol>;
  rows: number;
  cols: number;
  paylines: PaylinePattern[];
  rtp: number;
  minBet: number;
  maxBet: number;
  features?: {
    bonusFrequency?: number;
    multiplierFrequency?: number;
    maxMultiplier?: number;
    cascading?: boolean;
    expanding?: boolean;
  };
};

export type SpinResult = {
  grid: string[][];
  wins: {
    payline: number[];
    symbol: string;
    amount: number;
  }[];
  totalWin: number;
  multiplier: number;
  features: {
    bonus?: boolean;
    multiplier?: number;
    cascade?: boolean;
    expand?: boolean;
  };
};

export class SlotMachineEngine extends EventEmitter {
  private readonly config: SlotConfig;
  private readonly sessionId: string;
  private initialized: boolean = false;
  private spinning: boolean = false;
  private readonly MAX_RETRIES = 3;

  constructor(config: SlotConfig) {
    super();
    this.config = config;
    this.sessionId = nanoid();
  }

  async initialize(): Promise<void> {
    try {
      await secureRNG.initializeSession(this.sessionId);
      await fairnessVerifier.generateClientSeed();
      this.initialized = true;
      this.emit('initialized');
    } catch (error) {
      errorTracker.trackError('slot_init', error);
      throw new Error('Failed to initialize slot machine');
    }
  }

  async spin(bet: number, userId: string): Promise<SpinResult> {
    if (!this.initialized || this.spinning) {
      throw new Error('Slot machine not ready');
    }

    if (bet < this.config.minBet || bet > this.config.maxBet) {
      throw new Error('Invalid bet amount');
    }

    try {
      this.spinning = true;
      this.emit('spinStart');

      // Place bet
      const success = await bettingSystem.placeBet(userId, this.sessionId, bet, 'slots');
      if (!success) {
        throw new Error('Failed to place bet');
      }

      // Generate and verify spin outcome
      let result: SpinResult | null = null;
      let retries = 0;

      while (!result && retries < this.MAX_RETRIES) {
        try {
          result = await this.generateSpinOutcome(bet);
          const isValid = await fairnessVerifier.verifyGameOutcome(
            'slots',
            result.grid,
            this.sessionId
          );

          if (!isValid) {
            throw new Error('Invalid spin outcome');
          }
        } catch (error) {
          retries++;
          if (retries >= this.MAX_RETRIES) {
            throw error;
          }
        }
      }

      if (!result) {
        throw new Error('Failed to generate valid spin outcome');
      }

      // Validate and handle winnings
      if (result.totalWin > 0) {
        const isValidPayout = await bettingSystem.validatePayout(
          this.sessionId,
          userId,
          result.totalWin,
          'slots'
        );

        if (!isValidPayout) {
          throw new Error('Invalid payout amount');
        }

        await bettingSystem.resolveBet(userId, this.sessionId, result.totalWin, true);
      }

      this.emit('spinComplete', result);
      return result;
    } catch (error) {
      errorTracker.trackError('slot_spin', error);
      throw error;
    } finally {
      this.spinning = false;
    }
  }

  private async generateSpinOutcome(bet: number): Promise<SpinResult> {
    const grid: string[][] = [];
    const { rows, cols, symbols } = this.config;

    // Generate random grid
    for (let i = 0; i < rows; i++) {
      const row: string[] = [];
      for (let j = 0; j < cols; j++) {
        const symbol = await this.generateRandomSymbol();
        row.push(symbol);
      }
      grid.push(row);
    }

    // Calculate wins
    const wins = this.calculateWins(grid, bet);
    const totalWin = wins.reduce((sum, win) => sum + win.amount, 0);

    // Apply features
    const features = await this.applyFeatures(totalWin, bet);

    // Apply multiplier to total win
    const finalWin = Math.floor(totalWin * features.multiplier);

    return {
      grid,
      wins,
      totalWin: finalWin,
      multiplier: features.multiplier,
      features
    };
  }

  private async generateRandomSymbol(): Promise<string> {
    const totalWeight = Object.values(this.config.symbols)
      .reduce((sum, symbol) => sum + symbol.weight, 0);

    const random = await secureRNG.generateNumber(this.sessionId, 1, totalWeight);
    let runningWeight = 0;

    for (const [symbol, info] of Object.entries(this.config.symbols)) {
      runningWeight += info.weight;
      if (random <= runningWeight) {
        return symbol;
      }
    }

    return Object.keys(this.config.symbols)[0];
  }

  private calculateWins(grid: string[][], bet: number): SpinResult['wins'] {
    const wins: SpinResult['wins'] = [];

    this.config.paylines.forEach((payline, index) => {
      const symbols = payline.map(([row, col]) => grid[row][col]);
      const firstSymbol = symbols[0];
      let matchCount = 1;

      for (let i = 1; i < symbols.length; i++) {
        if (symbols[i] === firstSymbol) {
          matchCount++;
        } else {
          break;
        }
      }

      if (matchCount >= 3) {
        const symbolInfo = this.config.symbols[firstSymbol];
        const win = Math.floor(bet * symbolInfo.payout * (matchCount - 2));
        wins.push({
          payline,
          symbol: firstSymbol,
          amount: win
        });
      }
    });

    return wins;
  }

  private async applyFeatures(totalWin: number, bet: number): Promise<SpinResult['features']> {
    const features: SpinResult['features'] = {
      multiplier: 1
    };

    if (!this.config.features) {
      return features;
    }

    // Check for bonus feature
    if (this.config.features.bonusFrequency) {
      const bonusRoll = await secureRNG.generateNumber(this.sessionId, 1, 100);
      features.bonus = bonusRoll <= this.config.features.bonusFrequency * 100;
    }

    // Check for multiplier
    if (this.config.features.multiplierFrequency) {
      const multiplierRoll = await secureRNG.generateNumber(this.sessionId, 1, 100);
      if (multiplierRoll <= this.config.features.multiplierFrequency * 100) {
        const maxMultiplier = this.config.features.maxMultiplier || 5;
        features.multiplier = await secureRNG.generateNumber(this.sessionId, 2, maxMultiplier);
      }
    }

    // Apply cascading wins
    if (this.config.features.cascading && totalWin > 0) {
      features.cascade = true;
    }

    // Apply expanding symbols
    if (this.config.features.expanding && totalWin > bet) {
      features.expand = true;
    }

    return features;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  isSpinning(): boolean {
    return this.spinning;
  }

  getConfig(): SlotConfig {
    return { ...this.config };
  }
}