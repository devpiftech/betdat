import { nanoid } from 'nanoid';
import { secureRNG } from '../../security/secureRNG';
import { fairnessVerifier } from '../../security/fairnessVerifier';
import { bettingSystem } from '../../betting/BettingSystem';
import { errorTracker } from '../../monitoring/errorTracker';
import EventEmitter from 'eventemitter3';

export type Card = {
  suit: '♠' | '♥' | '♦' | '♣';
  value: string;
  numericValue: number;
};

export type Hand = {
  cards: Card[];
  bet: number;
  isDoubled: boolean;
  isSplit: boolean;
  isSurrendered: boolean;
  isInsured: boolean;
};

export type GameState = {
  playerHands: Hand[];
  dealerHand: Card[];
  currentHand: number;
  deck: Card[];
  phase: 'betting' | 'player' | 'dealer' | 'complete';
};

export class BlackjackEngine extends EventEmitter {
  private readonly sessionId: string;
  private readonly config: {
    minBet: number;
    maxBet: number;
    decks: number;
    blackjackPayout: number;
    insurancePayout: number;
  };
  private state: GameState;
  private initialized: boolean = false;
  private readonly MAX_RETRIES = 3;

  constructor(config = {
    minBet: 10,
    maxBet: 1000,
    decks: 6,
    blackjackPayout: 1.5,
    insurancePayout: 2
  }) {
    super();
    this.config = config;
    this.sessionId = nanoid();
    this.state = this.getInitialState();
  }

  private getInitialState(): GameState {
    return {
      playerHands: [],
      dealerHand: [],
      currentHand: 0,
      deck: [],
      phase: 'betting'
    };
  }

  async initialize(): Promise<void> {
    try {
      await secureRNG.initializeSession(this.sessionId);
      await fairnessVerifier.generateClientSeed();
      this.state.deck = await this.createShuffledDeck();
      this.initialized = true;
      this.emit('initialized');
    } catch (error) {
      errorTracker.trackError('blackjack_init', error);
      throw new Error('Failed to initialize blackjack game');
    }
  }

  async placeBet(userId: string, amount: number): Promise<boolean> {
    if (!this.initialized || this.state.phase !== 'betting') {
      throw new Error('Game not ready for betting');
    }

    try {
      const success = await bettingSystem.placeBet(userId, this.sessionId, amount, 'blackjack');
      if (!success) {
        throw new Error('Failed to place bet');
      }

      this.state.playerHands = [{
        cards: [],
        bet: amount,
        isDoubled: false,
        isSplit: false,
        isSurrendered: false,
        isInsured: false
      }];

      return true;
    } catch (error) {
      errorTracker.trackError('blackjack_bet', error);
      return false;
    }
  }

  async deal(): Promise<void> {
    if (this.state.phase !== 'betting' || this.state.playerHands.length === 0) {
      throw new Error('Invalid game state for dealing');
    }

    try {
      // Deal initial cards
      const playerHand = this.state.playerHands[0];
      playerHand.cards = [await this.drawCard(), await this.drawCard()];
      this.state.dealerHand = [await this.drawCard()];
      
      this.state.phase = 'player';
      this.emit('dealt', {
        playerCards: playerHand.cards,
        dealerCards: this.state.dealerHand
      });
    } catch (error) {
      errorTracker.trackError('blackjack_deal', error);
      throw error;
    }
  }

  async hit(userId: string): Promise<void> {
    if (this.state.phase !== 'player') {
      throw new Error('Invalid game state for hit');
    }

    try {
      const hand = this.state.playerHands[this.state.currentHand];
      hand.cards.push(await this.drawCard());

      const value = this.calculateHandValue(hand.cards);
      if (value > 21) {
        await this.handleBust(userId, hand);
      }

      this.emit('hit', {
        handIndex: this.state.currentHand,
        cards: hand.cards,
        value
      });
    } catch (error) {
      errorTracker.trackError('blackjack_hit', error);
      throw error;
    }
  }

  async stand(userId: string): Promise<void> {
    if (this.state.phase !== 'player') {
      throw new Error('Invalid game state for stand');
    }

    try {
      if (this.state.currentHand < this.state.playerHands.length - 1) {
        this.state.currentHand++;
      } else {
        await this.dealerPlay(userId);
      }

      this.emit('stand', {
        handIndex: this.state.currentHand
      });
    } catch (error) {
      errorTracker.trackError('blackjack_stand', error);
      throw error;
    }
  }

  async double(userId: string): Promise<void> {
    if (this.state.phase !== 'player') {
      throw new Error('Invalid game state for double');
    }

    try {
      const hand = this.state.playerHands[this.state.currentHand];
      if (hand.cards.length !== 2 || hand.isDoubled) {
        throw new Error('Invalid hand for double down');
      }

      // Place additional bet
      const success = await bettingSystem.placeBet(userId, this.sessionId, hand.bet, 'blackjack');
      if (!success) {
        throw new Error('Failed to place double down bet');
      }

      hand.bet *= 2;
      hand.isDoubled = true;
      hand.cards.push(await this.drawCard());

      const value = this.calculateHandValue(hand.cards);
      if (value > 21) {
        await this.handleBust(userId, hand);
      } else if (this.state.currentHand < this.state.playerHands.length - 1) {
        this.state.currentHand++;
      } else {
        await this.dealerPlay(userId);
      }

      this.emit('double', {
        handIndex: this.state.currentHand,
        cards: hand.cards,
        value
      });
    } catch (error) {
      errorTracker.trackError('blackjack_double', error);
      throw error;
    }
  }

  async split(userId: string): Promise<void> {
    if (this.state.phase !== 'player') {
      throw new Error('Invalid game state for split');
    }

    try {
      const hand = this.state.playerHands[this.state.currentHand];
      if (
        hand.cards.length !== 2 ||
        hand.cards[0].value !== hand.cards[1].value ||
        hand.isSplit
      ) {
        throw new Error('Invalid hand for split');
      }

      // Place additional bet
      const success = await bettingSystem.placeBet(userId, this.sessionId, hand.bet, 'blackjack');
      if (!success) {
        throw new Error('Failed to place split bet');
      }

      // Create new hand
      const newHand: Hand = {
        cards: [hand.cards[1], await this.drawCard()],
        bet: hand.bet,
        isDoubled: false,
        isSplit: true,
        isSurrendered: false,
        isInsured: false
      };

      // Update original hand
      hand.cards = [hand.cards[0], await this.drawCard()];
      hand.isSplit = true;

      // Add new hand
      this.state.playerHands.splice(this.state.currentHand + 1, 0, newHand);

      this.emit('split', {
        handIndex: this.state.currentHand,
        hands: this.state.playerHands
      });
    } catch (error) {
      errorTracker.trackError('blackjack_split', error);
      throw error;
    }
  }

  async surrender(userId: string): Promise<void> {
    if (this.state.phase !== 'player' || this.state.currentHand !== 0) {
      throw new Error('Invalid game state for surrender');
    }

    try {
      const hand = this.state.playerHands[0];
      if (hand.cards.length !== 2 || hand.isSurrendered) {
        throw new Error('Invalid hand for surrender');
      }

      hand.isSurrendered = true;
      
      // Return half the bet
      await bettingSystem.resolveBet(
        userId,
        this.sessionId,
        Math.floor(hand.bet / 2),
        true
      );

      this.state.phase = 'complete';
      this.emit('surrender');
    } catch (error) {
      errorTracker.trackError('blackjack_surrender', error);
      throw error;
    }
  }

  async insurance(userId: string): Promise<void> {
    if (
      this.state.phase !== 'player' ||
      this.state.currentHand !== 0 ||
      this.state.dealerHand[0].value !== 'A'
    ) {
      throw new Error('Invalid game state for insurance');
    }

    try {
      const hand = this.state.playerHands[0];
      if (hand.cards.length !== 2 || hand.isInsured) {
        throw new Error('Invalid hand for insurance');
      }

      // Place insurance bet (half the original bet)
      const insuranceBet = Math.floor(hand.bet / 2);
      const success = await bettingSystem.placeBet(userId, this.sessionId, insuranceBet, 'blackjack');
      if (!success) {
        throw new Error('Failed to place insurance bet');
      }

      hand.isInsured = true;

      // Check for dealer blackjack
      if (this.calculateHandValue(this.state.dealerHand) === 21) {
        // Pay insurance
        await bettingSystem.resolveBet(
          userId,
          this.sessionId,
          insuranceBet * this.config.insurancePayout,
          true
        );
      }

      this.emit('insurance', {
        handIndex: this.state.currentHand,
        insuranceBet
      });
    } catch (error) {
      errorTracker.trackError('blackjack_insurance', error);
      throw error;
    }
  }

  private async dealerPlay(userId: string): Promise<void> {
    this.state.phase = 'dealer';

    try {
      // Deal dealer's hole card
      this.state.dealerHand.push(await this.drawCard());

      // Dealer hits on soft 17
      while (this.calculateHandValue(this.state.dealerHand) < 17) {
        this.state.dealerHand.push(await this.drawCard());
      }

      await this.resolveHands(userId);
      this.state.phase = 'complete';

      this.emit('dealerComplete', {
        dealerCards: this.state.dealerHand,
        dealerValue: this.calculateHandValue(this.state.dealerHand)
      });
    } catch (error) {
      errorTracker.trackError('blackjack_dealer', error);
      throw error;
    }
  }

  private async resolveHands(userId: string): Promise<void> {
    const dealerValue = this.calculateHandValue(this.state.dealerHand);
    const dealerHasBlackjack = this.isBlackjack(this.state.dealerHand);

    for (const hand of this.state.playerHands) {
      if (hand.isSurrendered) continue;

      const playerValue = this.calculateHandValue(hand.cards);
      const playerHasBlackjack = this.isBlackjack(hand.cards);

      try {
        if (playerHasBlackjack && !dealerHasBlackjack) {
          // Player blackjack
          await bettingSystem.resolveBet(
            userId,
            this.sessionId,
            Math.floor(hand.bet * this.config.blackjackPayout),
            true
          );
        } else if (!playerHasBlackjack && dealerHasBlackjack) {
          // Dealer blackjack - no payout
          continue;
        } else if (playerValue > 21) {
          // Player bust - no payout
          continue;
        } else if (dealerValue > 21 || playerValue > dealerValue) {
          // Player wins
          await bettingSystem.resolveBet(
            userId,
            this.sessionId,
            hand.bet * 2,
            true
          );
        } else if (playerValue === dealerValue) {
          // Push
          await bettingSystem.resolveBet(
            userId,
            this.sessionId,
            hand.bet,
            true
          );
        }
      } catch (error) {
        errorTracker.trackError('blackjack_resolve', error);
      }
    }
  }

  private async handleBust(userId: string, hand: Hand): Promise<void> {
    if (this.state.currentHand < this.state.playerHands.length - 1) {
      this.state.currentHand++;
    } else {
      this.state.phase = 'complete';
    }
  }

  private async createShuffledDeck(): Promise<Card[]> {
    const deck: Card[] = [];
    const suits: ('♠' | '♥' | '♦' | '♣')[] = ['♠', '♥', '♦', '♣'];
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

    // Create multiple decks
    for (let d = 0; d < this.config.decks; d++) {
      for (const suit of suits) {
        for (const value of values) {
          deck.push({
            suit,
            value,
            numericValue: this.getNumericValue(value)
          });
        }
      }
    }

    // Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = await secureRNG.generateNumber(this.sessionId, 0, i);
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    return deck;
  }

  private async drawCard(): Promise<Card> {
    if (this.state.deck.length === 0) {
      this.state.deck = await this.createShuffledDeck();
    }
    return this.state.deck.pop()!;
  }

  private getNumericValue(value: string): number {
    if (value === 'A') return 11;
    if (['K', 'Q', 'J'].includes(value)) return 10;
    return parseInt(value);
  }

  private calculateHandValue(cards: Card[]): number {
    let value = 0;
    let aces = 0;

    for (const card of cards) {
      if (card.value === 'A') {
        aces++;
      }
      value += card.numericValue;
    }

    // Adjust for aces
    while (value > 21 && aces > 0) {
      value -= 10;
      aces--;
    }

    return value;
  }

  private isBlackjack(cards: Card[]): boolean {
    return (
      cards.length === 2 &&
      this.calculateHandValue(cards) === 21
    );
  }

  getState():GameState {
    return { ...this.state };
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}