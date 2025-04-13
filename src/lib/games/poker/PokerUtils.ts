import { Card } from './PokerEngine';
import { HandEvaluator, HandRank } from './HandEvaluator';

export class PokerUtils {
  static calculateEquity(playerCards: Card[], communityCards: Card[], iterations: number = 1000): {
    win: number;
    tie: number;
    lose: number;
    handOdds: Record<string, number>;
  } {
    let wins = 0;
    let ties = 0;
    let losses = 0;
    const handCounts: Record<string, number> = {};

    // Create deck excluding known cards
    const deck = this.createDeck().filter(card => 
      !this.isCardInArray(card, playerCards) && 
      !this.isCardInArray(card, communityCards)
    );

    for (let i = 0; i < iterations; i++) {
      const shuffledDeck = this.shuffleDeck([...deck]);
      
      // Complete community cards
      const remainingCommunityCards = 5 - communityCards.length;
      const simulatedCommunityCards = [
        ...communityCards,
        ...shuffledDeck.slice(0, remainingCommunityCards)
      ];

      // Deal opponent cards
      const opponentCards = shuffledDeck.slice(remainingCommunityCards, remainingCommunityCards + 2);

      // Evaluate hands
      const playerHand = HandEvaluator.evaluate([...playerCards, ...simulatedCommunityCards]);
      const opponentHand = HandEvaluator.evaluate([...opponentCards, ...simulatedCommunityCards]);

      // Count hand types
      handCounts[playerHand.name] = (handCounts[playerHand.name] || 0) + 1;

      // Compare hands
      const comparison = HandEvaluator.compareHands(playerHand, opponentHand);
      if (comparison > 0) wins++;
      else if (comparison < 0) losses++;
      else ties++;
    }

    // Convert counts to percentages
    const handOdds: Record<string, number> = {};
    Object.entries(handCounts).forEach(([hand, count]) => {
      handOdds[hand] = (count / iterations) * 100;
    });

    return {
      win: (wins / iterations) * 100,
      tie: (ties / iterations) * 100,
      lose: (losses / iterations) * 100,
      handOdds
    };
  }

  static getPotOdds(potSize: number, toCall: number): number {
    return (toCall / (potSize + toCall)) * 100;
  }

  static getImpliedOdds(potSize: number, toCall: number, stackSizes: number[]): number {
    const totalPotential = potSize + stackSizes.reduce((a, b) => a + b, 0);
    return (toCall / totalPotential) * 100;
  }

  private static createDeck(): Card[] {
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

  private static shuffleDeck(deck: Card[]): Card[] {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  private static isCardInArray(card: Card, array: Card[]): boolean {
    return array.some(c => c.suit === card.suit && c.rank === card.rank);
  }

  static formatHandStrength(hand: HandRank): string {
    const strengthDescriptions: Record<string, string> = {
      'Royal Flush': 'The best possible hand!',
      'Straight Flush': 'An incredibly strong hand',
      'Four of a Kind': 'A monster hand',
      'Full House': 'A very strong hand',
      'Flush': 'A strong hand',
      'Straight': 'A good hand',
      'Three of a Kind': 'A decent hand',
      'Two Pair': 'A playable hand',
      'One Pair': 'A marginal hand',
      'High Card': 'A weak hand'
    };

    return strengthDescriptions[hand.name] || 'Unknown hand';
  }

  static getHandAdvice(hand: HandRank, position: string, potOdds: number): string {
    const handStrength = hand.rank;
    const isPositional = ['Button', 'Cutoff', 'Hijack'].includes(position);

    if (handStrength >= 8) { // Four of a Kind or better
      return 'Raise for value. Consider slow-playing if opponents are aggressive.';
    }

    if (handStrength >= 6) { // Flush or better
      return 'Raise for value and protection. Call raises with caution.';
    }

    if (handStrength >= 4) { // Three of a Kind or better
      if (isPositional) {
        return 'Raise for value, especially in position.';
      }
      return 'Call raises and consider raising for value.';
    }

    if (handStrength >= 2) { // One Pair or better
      if (potOdds < 20) {
        return 'Call if the price is right. Consider folding to heavy action.';
      }
      return 'Fold to heavy action. Call with good pot odds.';
    }

    return 'Check/Fold unless you have a strong draw or good bluffing opportunity.';
  }
}