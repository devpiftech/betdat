import EventEmitter from 'eventemitter3';
import { nanoid } from 'nanoid';
import { supabase } from '../../supabase';
import { socket } from '../../socket';
import { secureRNG } from '../../security/secureRNG';
import { HandEvaluator, HandRank } from './HandEvaluator';

export type Card = {
  suit: '♠' | '♥' | '♦' | '♣';
  value: string;
  rank: number;
};

export type Player = {
  id: string;
  username: string;
  chips: number;
  cards: Card[];
  bet: number;
  folded: boolean;
  isAllIn: boolean;
  position: number;
};

export type GameState = {
  id: string;
  players: Player[];
  pot: number;
  communityCards: Card[];
  currentPlayer: number;
  dealer: number;
  smallBlind: number;
  bigBlind: number;
  round: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  lastAction?: {
    playerId: string;
    type: 'fold' | 'check' | 'call' | 'raise' | 'all-in';
    amount?: number;
  };
};

export class PokerEngine extends EventEmitter {
  private state: GameState;
  private deck: Card[];
  private timer: NodeJS.Timeout | null = null;
  private readonly TURN_TIMEOUT = 30000; // 30 seconds
  private readonly sessionId: string;

  constructor(players: Player[], smallBlind: number = 10) {
    super();
    this.sessionId = nanoid();
    this.state = {
      id: nanoid(),
      players,
      pot: 0,
      communityCards: [],
      currentPlayer: 0,
      dealer: 0,
      smallBlind,
      bigBlind: smallBlind * 2,
      round: 'preflop'
    };
    this.deck = this.createDeck();
    this.initializeGame();
  }

  private async initializeGame() {
    await secureRNG.initializeSession(this.sessionId);
    this.shuffleDeck();
    this.dealInitialCards();
    this.postBlinds();
    this.startTurnTimer();
    this.emitState();
  }

  private createDeck(): Card[] {
    const suits: ('♠' | '♥' | '♦' | '♣')[] = ['♠', '♥', '♦', '♣'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const deck: Card[] = [];

    suits.forEach(suit => {
      values.forEach((value, index) => {
        deck.push({ suit, value, rank: index + 2 });
      });
    });

    return deck;
  }

  private async shuffleDeck() {
    const newDeck: Card[] = [];
    const indices = Array.from({ length: this.deck.length }, (_, i) => i);
    
    while (indices.length > 0) {
      const randomIndex = await secureRNG.generateNumber(this.sessionId, 0, indices.length - 1);
      const index = indices.splice(randomIndex, 1)[0];
      newDeck.push(this.deck[index]);
    }
    
    this.deck = newDeck;
  }

  private dealInitialCards() {
    this.state.players.forEach(player => {
      player.cards = [this.deck.pop()!, this.deck.pop()!];
    });
  }

  private postBlinds() {
    const { players, smallBlind, bigBlind } = this.state;
    const sbPosition = (this.state.dealer + 1) % players.length;
    const bbPosition = (this.state.dealer + 2) % players.length;

    // Post small blind
    this.placeBet(players[sbPosition].id, smallBlind);
    
    // Post big blind
    this.placeBet(players[bbPosition].id, bigBlind);
    
    // Set first to act
    this.state.currentPlayer = (bbPosition + 1) % players.length;
  }

  private startTurnTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.timer = setTimeout(() => {
      this.autoPlay();
    }, this.TURN_TIMEOUT);
  }

  private autoPlay() {
    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer) return;

    // Auto-fold if no action taken
    this.fold(currentPlayer.id);
  }

  public async placeBet(playerId: string, amount: number) {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player) return;

    const maxBet = Math.min(amount, player.chips);
    player.chips -= maxBet;
    player.bet += maxBet;
    this.state.pot += maxBet;

    if (player.chips === 0) {
      player.isAllIn = true;
    }

    this.state.lastAction = {
      playerId,
      type: player.isAllIn ? 'all-in' : 'raise',
      amount: maxBet
    };

    this.emitState();
  }

  public fold(playerId: string) {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player) return;

    player.folded = true;
    this.state.lastAction = {
      playerId,
      type: 'fold'
    };

    const activePlayers = this.getActivePlayers();
    if (activePlayers.length === 1) {
      this.endHand(activePlayers[0].id);
    } else {
      this.nextTurn();
    }
  }

  public check(playerId: string) {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player) return;

    this.state.lastAction = {
      playerId,
      type: 'check'
    };

    this.nextTurn();
  }

  public call(playerId: string) {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player) return;

    const maxBet = Math.max(...this.state.players.map(p => p.bet));
    const toCall = maxBet - player.bet;
    
    this.placeBet(playerId, toCall);
    this.nextTurn();
  }

  private nextTurn() {
    do {
      this.state.currentPlayer = (this.state.currentPlayer + 1) % this.state.players.length;
    } while (
      this.state.players[this.state.currentPlayer].folded ||
      this.state.players[this.state.currentPlayer].isAllIn
    );

    const allBetsEqual = this.checkAllBetsEqual();
    if (allBetsEqual) {
      this.nextRound();
    } else {
      this.startTurnTimer();
      this.emitState();
    }
  }

  private nextRound() {
    switch (this.state.round) {
      case 'preflop':
        this.dealFlop();
        break;
      case 'flop':
        this.dealTurn();
        break;
      case 'turn':
        this.dealRiver();
        break;
      case 'river':
        this.showdown();
        break;
    }
  }

  private dealFlop() {
    this.deck.pop(); // Burn card
    this.state.communityCards = [
      this.deck.pop()!,
      this.deck.pop()!,
      this.deck.pop()!
    ];
    this.state.round = 'flop';
    this.resetBets();
    this.emitState();
  }

  private dealTurn() {
    this.deck.pop(); // Burn card
    this.state.communityCards.push(this.deck.pop()!);
    this.state.round = 'turn';
    this.resetBets();
    this.emitState();
  }

  private dealRiver() {
    this.deck.pop(); // Burn card
    this.state.communityCards.push(this.deck.pop()!);
    this.state.round = 'river';
    this.resetBets();
    this.emitState();
  }

  private async showdown() {
    this.state.round = 'showdown';
    
    const winners = await this.determineWinners();
    const winAmount = Math.floor(this.state.pot / winners.length);
    
    winners.forEach(winner => {
      const player = this.state.players.find(p => p.id === winner);
      if (player) {
        player.chips += winAmount;
      }
    });

    this.emitState();
    
    // Start new hand after delay
    setTimeout(() => this.newHand(), 5000);
  }

  private async determineWinners(): Promise<string[]> {
    const activePlayers = this.getActivePlayers();
    const handStrengths = await Promise.all(
      activePlayers.map(async player => {
        const hand = HandEvaluator.evaluate([...player.cards, ...this.state.communityCards]);
        return { playerId: player.id, hand };
      })
    );

    // Sort hands by strength
    handStrengths.sort((a, b) => HandEvaluator.compareHands(a.hand, b.hand));

    // Get all players with the highest hand
    const bestHand = handStrengths[handStrengths.length - 1].hand;
    return handStrengths
      .filter(h => HandEvaluator.compareHands(h.hand, bestHand) === 0)
      .map(h => h.playerId);
  }

  private resetBets() {
    this.state.players.forEach(player => {
      player.bet = 0;
    });
  }

  private checkAllBetsEqual(): boolean {
    const activePlayers = this.getActivePlayers();
    const firstBet = activePlayers[0].bet;
    return activePlayers.every(player => player.bet === firstBet);
  }

  private getActivePlayers(): Player[] {
    return this.state.players.filter(player => !player.folded);
  }

  private getCurrentPlayer(): Player | undefined {
    return this.state.players[this.state.currentPlayer];
  }

  private emitState() {
    this.emit('stateUpdate', this.state);
    
    // Persist state
    supabase
      .from('game_sessions')
      .update({
        state: this.state,
        updated_at: new Date().toISOString()
      })
      .eq('id', this.state.id)
      .then(() => {
        // Notify clients through WebSocket
        socket.emit('gameStateUpdate', {
          gameId: this.state.id,
          state: this.state
        });
      });
  }

  private async newHand() {
    // Move dealer button
    this.state.dealer = (this.state.dealer + 1) % this.state.players.length;
    
    // Reset state
    this.state.pot = 0;
    this.state.communityCards = [];
    this.state.round = 'preflop';
    this.state.lastAction = undefined;
    
    this.state.players.forEach(player => {
      player.cards = [];
      player.bet = 0;
      player.folded = false;
      player.isAllIn = false;
    });

    // Start new hand
    this.deck = this.createDeck();
    await this.shuffleDeck();
    this.dealInitialCards();
    this.postBlinds();
    this.startTurnTimer();
    this.emitState();
  }

  public getState(): GameState {
    return { ...this.state };
  }

  public cleanup() {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.removeAllListeners();
  }
}