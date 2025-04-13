import { Card } from './PokerEngine';

export type HandRank = {
  rank: number;
  name: string;
  cards: Card[];
};

export class HandEvaluator {
  private static readonly HAND_RANKINGS = {
    ROYAL_FLUSH: 10,
    STRAIGHT_FLUSH: 9,
    FOUR_OF_A_KIND: 8,
    FULL_HOUSE: 7,
    FLUSH: 6,
    STRAIGHT: 5,
    THREE_OF_A_KIND: 4,
    TWO_PAIR: 3,
    ONE_PAIR: 2,
    HIGH_CARD: 1
  };

  static evaluate(cards: Card[]): HandRank {
    if (cards.length < 5) {
      throw new Error('Need at least 5 cards to evaluate a poker hand');
    }

    // Sort cards by rank (high to low)
    const sortedCards = [...cards].sort((a, b) => b.rank - a.rank);

    // Check each hand type from highest to lowest
    const royalFlush = this.checkRoyalFlush(sortedCards);
    if (royalFlush) return royalFlush;

    const straightFlush = this.checkStraightFlush(sortedCards);
    if (straightFlush) return straightFlush;

    const fourOfAKind = this.checkFourOfAKind(sortedCards);
    if (fourOfAKind) return fourOfAKind;

    const fullHouse = this.checkFullHouse(sortedCards);
    if (fullHouse) return fullHouse;

    const flush = this.checkFlush(sortedCards);
    if (flush) return flush;

    const straight = this.checkStraight(sortedCards);
    if (straight) return straight;

    const threeOfAKind = this.checkThreeOfAKind(sortedCards);
    if (threeOfAKind) return threeOfAKind;

    const twoPair = this.checkTwoPair(sortedCards);
    if (twoPair) return twoPair;

    const onePair = this.checkOnePair(sortedCards);
    if (onePair) return onePair;

    // If no other hand, return high card
    return {
      rank: this.HAND_RANKINGS.HIGH_CARD,
      name: 'High Card',
      cards: sortedCards.slice(0, 5)
    };
  }

  private static checkRoyalFlush(cards: Card[]): HandRank | null {
    const flush = this.checkFlush(cards);
    if (!flush) return null;

    const straight = this.checkStraight(flush.cards);
    if (!straight) return null;

    if (straight.cards[0].rank === 14) { // Ace high
      return {
        rank: this.HAND_RANKINGS.ROYAL_FLUSH,
        name: 'Royal Flush',
        cards: straight.cards
      };
    }

    return null;
  }

  private static checkStraightFlush(cards: Card[]): HandRank | null {
    const flush = this.checkFlush(cards);
    if (!flush) return null;

    const straight = this.checkStraight(flush.cards);
    if (!straight) return null;

    return {
      rank: this.HAND_RANKINGS.STRAIGHT_FLUSH,
      name: 'Straight Flush',
      cards: straight.cards
    };
  }

  private static checkFourOfAKind(cards: Card[]): HandRank | null {
    for (let i = 0; i <= cards.length - 4; i++) {
      const quad = cards.filter(c => c.rank === cards[i].rank);
      if (quad.length === 4) {
        const kicker = cards.find(c => c.rank !== quad[0].rank);
        return {
          rank: this.HAND_RANKINGS.FOUR_OF_A_KIND,
          name: 'Four of a Kind',
          cards: [...quad, kicker!]
        };
      }
    }
    return null;
  }

  private static checkFullHouse(cards: Card[]): HandRank | null {
    const three = this.checkThreeOfAKind(cards);
    if (!three) return null;

    const remainingCards = cards.filter(c => 
      !three.cards.some(tc => tc.rank === c.rank)
    );

    const pair = this.checkOnePair(remainingCards);
    if (!pair) return null;

    return {
      rank: this.HAND_RANKINGS.FULL_HOUSE,
      name: 'Full House',
      cards: [...three.cards.slice(0, 3), ...pair.cards.slice(0, 2)]
    };
  }

  private static checkFlush(cards: Card[]): HandRank | null {
    for (const suit of ['♠', '♥', '♦', '♣'] as const) {
      const suited = cards.filter(c => c.suit === suit);
      if (suited.length >= 5) {
        return {
          rank: this.HAND_RANKINGS.FLUSH,
          name: 'Flush',
          cards: suited.slice(0, 5)
        };
      }
    }
    return null;
  }

  private static checkStraight(cards: Card[]): HandRank | null {
    // Handle Ace-low straight
    const aceLowCards = cards[0].rank === 14 
      ? [...cards, { ...cards[0], rank: 1 }]
      : cards;

    for (let i = 0; i <= aceLowCards.length - 5; i++) {
      const potentialStraight = aceLowCards.slice(i, i + 5);
      let isStraight = true;
      
      for (let j = 1; j < potentialStraight.length; j++) {
        if (potentialStraight[j].rank !== potentialStraight[j-1].rank - 1) {
          isStraight = false;
          break;
        }
      }

      if (isStraight) {
        return {
          rank: this.HAND_RANKINGS.STRAIGHT,
          name: 'Straight',
          cards: potentialStraight
        };
      }
    }
    return null;
  }

  private static checkThreeOfAKind(cards: Card[]): HandRank | null {
    for (let i = 0; i <= cards.length - 3; i++) {
      const trips = cards.filter(c => c.rank === cards[i].rank);
      if (trips.length === 3) {
        const kickers = cards
          .filter(c => c.rank !== trips[0].rank)
          .slice(0, 2);
        return {
          rank: this.HAND_RANKINGS.THREE_OF_A_KIND,
          name: 'Three of a Kind',
          cards: [...trips, ...kickers]
        };
      }
    }
    return null;
  }

  private static checkTwoPair(cards: Card[]): HandRank | null {
    const firstPair = this.checkOnePair(cards);
    if (!firstPair) return null;

    const remainingCards = cards.filter(c => 
      !firstPair.cards.some(pc => pc.rank === c.rank)
    );

    const secondPair = this.checkOnePair(remainingCards);
    if (!secondPair) return null;

    const kicker = cards.find(c => 
      !firstPair.cards.some(pc => pc.rank === c.rank) &&
      !secondPair.cards.some(pc => pc.rank === c.rank)
    );

    return {
      rank: this.HAND_RANKINGS.TWO_PAIR,
      name: 'Two Pair',
      cards: [...firstPair.cards.slice(0, 2), ...secondPair.cards.slice(0, 2), kicker!]
    };
  }

  private static checkOnePair(cards: Card[]): HandRank | null {
    for (let i = 0; i <= cards.length - 2; i++) {
      const pair = cards.filter(c => c.rank === cards[i].rank);
      if (pair.length === 2) {
        const kickers = cards
          .filter(c => c.rank !== pair[0].rank)
          .slice(0, 3);
        return {
          rank: this.HAND_RANKINGS.ONE_PAIR,
          name: 'One Pair',
          cards: [...pair, ...kickers]
        };
      }
    }
    return null;
  }

  static compareHands(hand1: HandRank, hand2: HandRank): number {
    // Compare hand ranks first
    if (hand1.rank !== hand2.rank) {
      return hand1.rank - hand2.rank;
    }

    // If ranks are equal, compare cards in order
    for (let i = 0; i < hand1.cards.length; i++) {
      if (hand1.cards[i].rank !== hand2.cards[i].rank) {
        return hand1.cards[i].rank - hand2.cards[i].rank;
      }
    }

    // If all cards are equal, hands are tied
    return 0;
  }
}