import { nanoid } from 'nanoid';
import { secureRNG } from '../../security/secureRNG';
import { fairnessVerifier } from '../../security/fairnessVerifier';
import { bettingSystem } from '../../betting/BettingSystem';
import { errorTracker } from '../../monitoring/errorTracker';
import EventEmitter from 'eventemitter3';

export type BetType = 
  | 'pass' 
  | 'dontPass' 
  | 'come' 
  | 'dontCome' 
  | 'place' 
  | 'field' 
  | 'hardWay' 
  | 'anyCraps' 
  | 'seven';

export type Bet = {
  id: string;
  type: BetType;
  amount: number;
  point?: number;
  playerId: string;
};

export type GameState = {
  point: number | null;
  bets: Bet[];
  lastRoll: [number, number] | null;
  phase: 'comeOut' | 'point';
};

export class CrapsEngine extends EventEmitter {
  private readonly sessionId: string;
  private readonly config: {
    minBet: number;
    maxBet: number;
    payouts: Record<BetType, number>;
  };
  private state: GameState;
  private initialized: boolean = false;
  private rolling: boolean = false;
  private readonly MAX_RETRIES = 3;

  constructor(config = {
    minBet: 10,
    maxBet: 1000,
    payouts: {
      pass: 1,
      dontPass: 1,
      come: 1,
      dontCome: 1,
      place: 1.8,
      field: 2,
      hardWay: 7,
      anyCraps: 7,
      seven: 4
    }
  }) {
    super();
    this.config = config;
    this.sessionId = nanoid();
    this.state = this.getInitialState();
  }

  private getInitialState(): GameState {
    return {
      point: null,
      bets: [],
      lastRoll: null,
      phase: 'comeOut'
    };
  }

  async initialize(): Promise<void> {
    try {
      await secureRNG.initializeSession(this.sessionId);
      await fairnessVerifier.generateClientSeed();
      this.initialized = true;
      this.emit('initialized');
    } catch (error) {
      errorTracker.trackError('craps_init', error);
      throw new Error('Failed to initialize craps game');
    }
  }

  async placeBet(userId: string, type: BetType, amount: number): Promise<boolean> {
    if (!this.initialized) {
      throw new Error('Game not initialized');
    }

    try {
      // Validate bet amount
      if (amount < this.config.minBet || amount > this.config.maxBet) {
        throw new Error(`Invalid bet amount. Must be between ${this.config.minBet} and ${this.config.maxBet}`);
      }

      // Validate bet type for current phase
      if (!this.isValidBetType(type)) {
        throw new Error('Invalid bet type for current game phase');
      }

      // Place bet
      const success = await bettingSystem.placeBet(userId, this.sessionId, amount, 'craps');
      if (!success) {
        throw new Error('Failed to place bet');
      }

      // Add bet to state
      const bet: Bet = {
        id: nanoid(),
        type,
        amount,
        playerId: userId,
        point: this.state.point
      };

      this.state.bets.push(bet);
      this.emit('betPlaced', bet);

      return true;
    } catch (error) {
      errorTracker.trackError('craps_bet', error);
      return false;
    }
  }

  async roll(userId: string): Promise<[number, number]> {
    if (!this.initialized || this.rolling) {
      throw new Error('Game not ready for roll');
    }

    try {
      this.rolling = true;
      this.emit('rollStart');

      // Generate and verify dice rolls
      let dice: [number, number] | null = null;
      let retries = 0;

      while (!dice && retries < this.MAX_RETRIES) {
        try {
          const die1 = await secureRNG.generateNumber(this.sessionId, 1, 6);
          const die2 = await secureRNG.generateNumber(this.sessionId, 1, 6);
          
          const isValid = await fairnessVerifier.verifyGameOutcome(
            'craps',
            [die1, die2],
            this.sessionId
          );

          if (!isValid) {
            throw new Error('Invalid roll outcome');
          }

          dice = [die1, die2];
        } catch (error) {
          retries++;
          if (retries >= this.MAX_RETRIES) {
            throw error;
          }
        }
      }

      if (!dice) {
        throw new Error('Failed to generate valid roll');
      }

      this.state.lastRoll = dice;
      await this.resolveRoll(userId, dice);

      this.emit('rollComplete', {
        dice,
        point: this.state.point,
        phase: this.state.phase
      });

      return dice;
    } catch (error) {
      errorTracker.trackError('craps_roll', error);
      throw error;
    } finally {
      this.rolling = false;
    }
  }

  private async resolveRoll(userId: string, [die1, die2]: [number, number]): Promise<void> {
    const total = die1 + die2;

    try {
      if (this.state.phase === 'comeOut') {
        await this.resolveComeOutRoll(userId, total);
      } else {
        await this.resolvePointRoll(userId, total);
      }
    } catch (error) {
      errorTracker.trackError('craps_resolve', error);
      throw error;
    }
  }

  private async resolveComeOutRoll(userId: string, total: number): Promise<void> {
    // Handle Pass/Don't Pass bets
    if (total === 7 || total === 11) {
      // Pass line wins, Don't Pass loses
      await this.payoutBets(userId, 'pass', true);
      await this.payoutBets(userId, 'dontPass', false);
    } else if (total === 2 || total === 3 || total === 12) {
      // Pass line loses, Don't Pass wins (except 12 is a push)
      await this.payoutBets(userId, 'pass', false);
      await this.payoutBets(userId, 'dontPass', total !== 12);
    } else {
      // Point is established
      this.state.point = total;
      this.state.phase = 'point';
    }

    // Handle one-roll bets
    await this.resolveOneRollBets(userId, total);
  }

  private async resolvePointRoll(userId: string, total: number): Promise<void> {
    if (total === this.state.point) {
      // Pass line wins, Don't Pass loses
      await this.payoutBets(userId, 'pass', true);
      await this.payoutBets(userId, 'dontPass', false);
      this.resetPoint();
    } else if (total === 7) {
      // Pass line loses, Don't Pass wins
      await this.payoutBets(userId, 'pass', false);
      await this.payoutBets(userId, 'dontPass', true);
      this.resetPoint();
    }

    // Handle one-roll bets
    await this.resolveOneRollBets(userId, total);
  }

  private async resolveOneRollBets(userId: string, total: number): Promise<void> {
    // Field bets
    const fieldNumbers = [2, 3, 4, 9, 10, 11, 12];
    const isField = fieldNumbers.includes(total);
    const fieldMultiplier = total === 2 || total === 12 ? 2 : 1;
    await this.payoutBets(userId, 'field', isField, fieldMultiplier);

    // Any Craps
    const isCraps = [2, 3, 12].includes(total);
    await this.payoutBets(userId, 'anyCraps', isCraps);

    // Seven
    await this.payoutBets(userId, 'seven', total === 7);

    // Hard Ways
    if (this.state.lastRoll![0] === this.state.lastRoll![1]) {
      await this.payoutBets(userId, 'hardWay', true);
    }
  }

  private async payoutBets(
    userId: string,
    type: BetType,
    won: boolean,
    multiplier: number = 1
  ): Promise<void> {
    const bets = this.state.bets.filter(b => 
      b.type === type && 
      b.playerId === userId &&
      (b.point === null || b.point === this.state.point)
    );

    for (const bet of bets) {
      try {
        if (won) {
          const payout = Math.floor(bet.amount * this.config.payouts[type] * multiplier);
          
          const isValidPayout = await bettingSystem.validatePayout(
            this.sessionId,
            userId,
            payout,
            'craps'
          );

          if (!isValidPayout) {
            throw new Error('Invalid payout amount');
          }

          await bettingSystem.resolveBet(userId, this.sessionId, payout, true);
        }

        // Remove resolved bet
        this.state.bets = this.state.bets.filter(b => b.id !== bet.id);
      } catch (error) {
        errorTracker.trackError('craps_payout', error);
      }
    }
  }

  private resetPoint(): void {
    this.state.point = null;
    this.state.phase = 'comeOut';
  }

  private isValidBetType(type: BetType): boolean {
    if (this.state.phase === 'comeOut') {
      return ['pass', 'dontPass', 'field', 'anyCraps', 'seven'].includes(type);
    }
    return true;
  }

  getState(): GameState {
    return { ...this.state };
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  isRolling(): boolean {
    return this.rolling;
  }
}