import { nanoid } from 'nanoid';
import { secureRNG } from '../../security/secureRNG';
import { fairnessVerifier } from '../../security/fairnessVerifier';
import { bettingSystem } from '../../betting/BettingSystem';
import { errorTracker } from '../../monitoring/errorTracker';
import EventEmitter from 'eventemitter3';

export type BetType = 'straight' | 'split' | 'street' | 'corner' | 'line' | 'dozen' | 'column' | 'red' | 'black' | 'even' | 'odd' | 'low' | 'high' | 'basket';

export type Bet = {
  id: string;
  type: BetType;
  numbers: number[];
  amount: number;
  playerId: string;
};

export type RouletteConfig = {
  minBet: number;
  maxBet: number;
  payouts: Record<BetType, number>;
  isAmerican?: boolean;
};

export class RouletteEngine extends EventEmitter {
  private readonly config: RouletteConfig;
  private readonly sessionId: string;
  private initialized: boolean = false;
  private spinning: boolean = false;
  private readonly MAX_RETRIES = 3;

  constructor(config: RouletteConfig) {
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
      errorTracker.trackError('roulette_init', error);
      throw new Error('Failed to initialize roulette');
    }
  }

  async spin(bets: Bet[]): Promise<number> {
    if (!this.initialized || this.spinning) {
      throw new Error('Roulette not ready');
    }

    try {
      this.spinning = true;
      this.emit('spinStart');

      // Validate all bets
      for (const bet of bets) {
        const isValid = await this.validateBet(bet);
        if (!isValid) {
          throw new Error(`Invalid bet: ${bet.id}`);
        }
      }

      // Generate and verify outcome
      let number: number | null = null;
      let retries = 0;

      while (number === null && retries < this.MAX_RETRIES) {
        try {
          const maxNumber = this.config.isAmerican ? 37 : 36; // 37 represents 00 in American
          number = await secureRNG.generateNumber(this.sessionId, 0, maxNumber);
          
          const isValid = await fairnessVerifier.verifyGameOutcome(
            'roulette',
            number,
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
          number = null;
        }
      }

      if (number === null) {
        throw new Error('Failed to generate valid spin outcome');
      }

      // Process payouts
      await this.processBets(bets, number);

      this.emit('spinComplete', number);
      return number;
    } catch (error) {
      errorTracker.trackError('roulette_spin', error);
      throw error;
    } finally {
      this.spinning = false;
    }
  }

  private async validateBet(bet: Bet): Promise<boolean> {
    try {
      // Validate bet amount
      if (bet.amount < this.config.minBet || bet.amount > this.config.maxBet) {
        return false;
      }

      // Validate bet type and numbers
      switch (bet.type) {
        case 'straight':
          if (bet.numbers.length !== 1) return false;
          if (this.config.isAmerican) {
            if (bet.numbers[0] < 0 || bet.numbers[0] > 37) return false;
          } else {
            if (bet.numbers[0] < 0 || bet.numbers[0] > 36) return false;
          }
          break;

        case 'split':
          if (bet.numbers.length !== 2) return false;
          if (!this.areNumbersAdjacent(bet.numbers[0], bet.numbers[1])) return false;
          break;

        case 'street':
          if (bet.numbers.length !== 3) return false;
          if (!this.isValidStreet(bet.numbers)) return false;
          break;

        case 'corner':
          if (bet.numbers.length !== 4) return false;
          if (!this.isValidCorner(bet.numbers)) return false;
          break;

        case 'line':
          if (bet.numbers.length !== 6) return false;
          if (!this.isValidLine(bet.numbers)) return false;
          break;

        case 'dozen':
        case 'column':
          if (bet.numbers.length !== 12) return false;
          if (!this.isValidDozenOrColumn(bet.numbers, bet.type)) return false;
          break;

        case 'red':
        case 'black':
        case 'even':
        case 'odd':
        case 'low':
        case 'high':
          // These are validated by the bet placement UI
          break;

        case 'basket':
          if (!this.config.isAmerican) return false;
          if (!this.isValidBasket(bet.numbers)) return false;
          break;

        default:
          return false;
      }

      return true;
    } catch (error) {
      errorTracker.trackError('validate_bet', error);
      return false;
    }
  }

  private async processBets(bets: Bet[], winningNumber: number): Promise<void> {
    for (const bet of bets) {
      try {
        const payout = this.calculatePayout(bet, winningNumber);
        
        if (payout > 0) {
          const isValidPayout = await bettingSystem.validatePayout(
            this.sessionId,
            bet.playerId,
            payout,
            'roulette'
          );

          if (!isValidPayout) {
            throw new Error('Invalid payout amount');
          }

          await bettingSystem.resolveBet(bet.playerId, this.sessionId, payout, true);
        }
      } catch (error) {
        errorTracker.trackError('process_bet', error);
      }
    }
  }

  private calculatePayout(bet: Bet, winningNumber: number): number {
    if (!this.doesBetWin(bet, winningNumber)) {
      return 0;
    }

    const multiplier = this.config.payouts[bet.type];
    return Math.floor(bet.amount * (multiplier + 1)); // Include original bet
  }

  private doesBetWin(bet: Bet, winningNumber: number): boolean {
    switch (bet.type) {
      case 'straight':
        return bet.numbers.includes(winningNumber);

      case 'split':
      case 'street':
      case 'corner':
      case 'line':
      case 'basket':
        return bet.numbers.includes(winningNumber);

      case 'dozen':
        const dozen = Math.floor((winningNumber - 1) / 12);
        return winningNumber !== 0 && dozen === Math.floor((bet.numbers[0] - 1) / 12);

      case 'column':
        const column = (winningNumber - 1) % 3;
        return winningNumber !== 0 && column === (bet.numbers[0] - 1) % 3;

      case 'red':
        return this.isRed(winningNumber);

      case 'black':
        return this.isBlack(winningNumber);

      case 'even':
        return winningNumber !== 0 && winningNumber % 2 === 0;

      case 'odd':
        return winningNumber % 2 === 1;

      case 'low':
        return winningNumber >= 1 && winningNumber <= 18;

      case 'high':
        return winningNumber >= 19 && winningNumber <= 36;

      default:
        return false;
    }
  }

  private isRed(number: number): boolean {
    const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
    return redNumbers.includes(number);
  }

  private isBlack(number: number): boolean {
    const blackNumbers = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];
    return blackNumbers.includes(number);
  }

  private areNumbersAdjacent(num1: number, num2: number): boolean {
    // Check horizontal adjacency
    if (Math.floor((num1 - 1) / 3) === Math.floor((num2 - 1) / 3)) {
      return Math.abs(num1 - num2) === 1;
    }
    // Check vertical adjacency
    return Math.abs(num1 - num2) === 3;
  }

  private isValidStreet(numbers: number[]): boolean {
    const sorted = [...numbers].sort((a, b) => a - b);
    return (
      sorted.length === 3 &&
      Math.floor((sorted[0] - 1) / 3) === Math.floor((sorted[2] - 1) / 3) &&
      sorted[1] - sorted[0] === 1 &&
      sorted[2] - sorted[1] === 1
    );
  }

  private isValidCorner(numbers: number[]): boolean {
    const sorted = [...numbers].sort((a, b) => a - b);
    return (
      sorted.length === 4 &&
      Math.floor((sorted[0] - 1) / 3) === Math.floor((sorted[1] - 1) / 3) - 1 &&
      sorted[1] - sorted[0] === 1 &&
      sorted[3] - sorted[2] === 1
    );
  }

  private isValidLine(numbers: number[]): boolean {
    const sorted = [...numbers].sort((a, b) => a - b);
    return (
      sorted.length === 6 &&
      Math.floor((sorted[0] - 1) / 3) === Math.floor((sorted[2] - 1) / 3) &&
      Math.floor((sorted[3] - 1) / 3) === Math.floor((sorted[5] - 1) / 3) &&
      sorted[1] - sorted[0] === 1 &&
      sorted[2] - sorted[1] === 1 &&
      sorted[4] - sorted[3] === 1 &&
      sorted[5] - sorted[4] === 1
    );
  }

  private isValidDozenOrColumn(numbers: number[], type: 'dozen' | 'column'): boolean {
    const sorted = [...numbers].sort((a, b) => a - b);
    if (type === 'dozen') {
      const dozen = Math.floor((sorted[0] - 1) / 12);
      return sorted.every(num => Math.floor((num - 1) / 12) === dozen);
    } else {
      const column = (sorted[0] - 1) % 3;
      return sorted.every(num => (num - 1) % 3 === column);
    }
  }

  private isValidBasket(numbers: number[]): boolean {
    const required = [0, 37, 1, 2, 3]; // 37 represents 00
    return (
      numbers.length === 5 &&
      required.every(num => numbers.includes(num))
    );
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  isSpinning(): boolean {
    return this.spinning;
  }

  getConfig(): RouletteConfig {
    return { ...this.config };
  }
}