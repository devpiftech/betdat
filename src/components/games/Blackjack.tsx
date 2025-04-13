import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { Button } from '../ui/Button';
import { Coins, HandMetal, Plus, Minus } from 'lucide-react';
import Confetti from 'react-confetti';

type Card = {
  suit: '♠' | '♥' | '♦' | '♣';
  value: string;
  numericValue: number;
};

type GameState = 'betting' | 'playing' | 'dealerTurn' | 'gameOver';

const SUITS: Card['suit'][] = ['♠', '♥', '♦', '♣'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const INITIAL_BET = 10;

export const Blackjack = () => {
  const { balance, updateBalance } = useStore();
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [bet, setBet] = useState(INITIAL_BET);
  const [gameState, setGameState] = useState<GameState>('betting');
  const [message, setMessage] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);

  const createDeck = () => {
    const newDeck: Card[] = [];
    SUITS.forEach(suit => {
      VALUES.forEach(value => {
        const numericValue = 
          value === 'A' ? 11 :
          ['K', 'Q', 'J'].includes(value) ? 10 :
          parseInt(value);
        newDeck.push({ suit, value, numericValue });
      });
    });
    return shuffle(newDeck);
  };

  const shuffle = (cards: Card[]) => {
    const newCards = [...cards];
    for (let i = newCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newCards[i], newCards[j]] = [newCards[j], newCards[i]];
    }
    return newCards;
  };

  const dealCard = () => {
    if (deck.length === 0) {
      setDeck(createDeck());
      return deck[0];
    }
    const card = deck[0];
    setDeck(deck.slice(1));
    return card;
  };

  const calculateHandValue = (hand: Card[]) => {
    let value = 0;
    let aces = 0;
    
    hand.forEach(card => {
      if (card.value === 'A') {
        aces += 1;
      }
      value += card.numericValue;
    });

    while (value > 21 && aces > 0) {
      value -= 10;
      aces -= 1;
    }

    return value;
  };

  const startGame = () => {
    if (balance < bet) return;
    
    updateBalance(-bet);
    const newDeck = createDeck();
    const playerCards = [newDeck[0], newDeck[1]];
    const dealerCards = [newDeck[2]];
    
    setDeck(newDeck.slice(3));
    setPlayerHand(playerCards);
    setDealerHand(dealerCards);
    setGameState('playing');
    setMessage('');
  };

  const hit = () => {
    const card = dealCard();
    const newHand = [...playerHand, card];
    setPlayerHand(newHand);
    
    const value = calculateHandValue(newHand);
    if (value > 21) {
      endGame('bust');
    }
  };

  const stand = () => {
    setGameState('dealerTurn');
  };

  useEffect(() => {
    if (gameState === 'dealerTurn') {
      const dealerPlay = () => {
        let currentHand = [...dealerHand];
        let value = calculateHandValue(currentHand);
        
        while (value < 17) {
          const card = dealCard();
          currentHand = [...currentHand, card];
          value = calculateHandValue(currentHand);
        }
        
        setDealerHand(currentHand);
        
        if (value > 21) {
          endGame('dealerBust');
        } else {
          const playerValue = calculateHandValue(playerHand);
          if (value > playerValue) {
            endGame('dealerWins');
          } else if (value < playerValue) {
            endGame('playerWins');
          } else {
            endGame('push');
          }
        }
      };
      
      setTimeout(dealerPlay, 1000);
    }
  }, [gameState]);

  const endGame = (result: string) => {
    setGameState('gameOver');
    switch (result) {
      case 'bust':
        setMessage('Bust! You lose!');
        break;
      case 'dealerBust':
        setMessage('Dealer busts! You win!');
        updateBalance(bet * 2);
        setShowConfetti(true);
        break;
      case 'playerWins':
        setMessage('You win!');
        updateBalance(bet * 2);
        setShowConfetti(true);
        break;
      case 'dealerWins':
        setMessage('Dealer wins!');
        break;
      case 'push':
        setMessage('Push! Bet returned.');
        updateBalance(bet);
        break;
    }
    setTimeout(() => setShowConfetti(false), 3000);
  };

  const renderCard = (card: Card) => (
    <div className={`flex h-32 w-24 flex-col items-center justify-center rounded-lg 
      ${card.suit === '♥' || card.suit === '♦' ? 'text-red-500' : 'text-black'} 
      bg-white shadow-lg`}>
      <div className="text-2xl font-bold">{card.value}</div>
      <div className="text-4xl">{card.suit}</div>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-green-900 to-emerald-900 p-8">
      {showConfetti && <Confetti />}
      
      <div className="mb-8 flex items-center justify-between gap-4 rounded-lg bg-white/10 p-4 text-white backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Coins className="h-6 w-6 text-yellow-400" />
          <span className="text-xl font-bold">${balance}</span>
        </div>
        {gameState === 'betting' && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setBet(Math.max(INITIAL_BET, bet - INITIAL_BET))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="min-w-[60px] text-center font-bold">
                Bet: ${bet}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setBet(bet + INITIAL_BET)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="mb-8 w-full max-w-3xl">
        <div className="mb-8">
          <h3 className="mb-2 text-lg font-bold text-white">Dealer's Hand</h3>
          <div className="flex gap-4 overflow-x-auto p-4">
            {dealerHand.map((card, index) => (
              <div key={index} className="flex-shrink-0">
                {renderCard(card)}
              </div>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <h3 className="mb-2 text-lg font-bold text-white">Your Hand</h3>
          <div className="flex gap-4 overflow-x-auto p-4">
            {playerHand.map((card, index) => (
              <div key={index} className="flex-shrink-0">
                {renderCard(card)}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        {gameState === 'betting' && (
          <Button
            size="lg"
            onClick={startGame}
            disabled={balance < bet}
            className="min-w-[200px] gap-2"
          >
            <HandMetal className="h-5 w-5" />
            Deal
          </Button>
        )}
        
        {gameState === 'playing' && (
          <div className="flex gap-4">
            <Button onClick={hit}>Hit</Button>
            <Button onClick={stand}>Stand</Button>
          </div>
        )}
        
        {message && (
          <div className={`rounded-full px-6 py-2 text-lg font-bold
            ${message.includes('win') ? 'animate-bounce bg-yellow-400 text-black' : 'bg-white/10 text-white'}`}>
            {message}
          </div>
        )}
        
        {gameState === 'gameOver' && (
          <Button
            onClick={() => {
              setGameState('betting');
              setPlayerHand([]);
              setDealerHand([]);
              setMessage('');
            }}
          >
            New Game
          </Button>
        )}
      </div>
    </div>
  );
};