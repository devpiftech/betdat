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

type GameState = 'betting' | 'preFlop' | 'flop' | 'turn' | 'river' | 'showdown';

const SUITS: Card['suit'][] = ['♠', '♥', '♦', '♣'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const INITIAL_BET = 20;

export const Poker = () => {
  const { balance, updateBalance } = useStore();
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [communityCards, setCommunityCards] = useState<Card[]>([]);
  const [computerHand, setComputerHand] = useState<Card[]>([]);
  const [pot, setPot] = useState(0);
  const [bet, setBet] = useState(INITIAL_BET);
  const [gameState, setGameState] = useState<GameState>('betting');
  const [message, setMessage] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);

  const createDeck = () => {
    const newDeck: Card[] = [];
    SUITS.forEach(suit => {
      VALUES.forEach(value => {
        const numericValue = 
          value === 'A' ? 14 :
          value === 'K' ? 13 :
          value === 'Q' ? 12 :
          value === 'J' ? 11 :
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

  const startGame = () => {
    if (balance < bet) return;
    
    updateBalance(-bet);
    setPot(bet * 2); // Computer matches the bet
    
    const newDeck = createDeck();
    const playerCards = [newDeck[0], newDeck[1]];
    const computerCards = [newDeck[2], newDeck[3]];
    
    setDeck(newDeck.slice(4));
    setPlayerHand(playerCards);
    setComputerHand(computerCards);
    setCommunityCards([]);
    setGameState('preFlop');
    setMessage('');
  };

  const dealFlop = () => {
    const flop = deck.slice(0, 3);
    setCommunityCards(flop);
    setDeck(deck.slice(3));
    setGameState('flop');
  };

  const dealTurn = () => {
    const turn = [...communityCards, deck[0]];
    setCommunityCards(turn);
    setDeck(deck.slice(1));
    setGameState('turn');
  };

  const dealRiver = () => {
    const river = [...communityCards, deck[0]];
    setCommunityCards(river);
    setDeck(deck.slice(1));
    setGameState('river');
  };

  const check = () => {
    switch (gameState) {
      case 'preFlop':
        dealFlop();
        break;
      case 'flop':
        dealTurn();
        break;
      case 'turn':
        dealRiver();
        break;
      case 'river':
        showdown();
        break;
    }
  };

  const fold = () => {
    setGameState('betting');
    setMessage('You folded. Computer wins the pot!');
  };

  const showdown = () => {
    setGameState('showdown');
    // Simple poker hand evaluation (just for demonstration)
    const playerHighCard = Math.max(...playerHand.map(card => card.numericValue));
    const computerHighCard = Math.max(...computerHand.map(card => card.numericValue));
    
    if (playerHighCard > computerHighCard) {
      setMessage('You win with a higher card!');
      updateBalance(pot);
      setShowConfetti(true);
    } else if (playerHighCard < computerHighCard) {
      setMessage('Computer wins with a higher card!');
    } else {
      setMessage('It\'s a tie! Split pot.');
      updateBalance(pot / 2);
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
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-purple-900 to-indigo-900 p-8">
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

      <div className="mb-8 w-full max-w-4xl">
        <div className="mb-8">
          <h3 className="mb-2 text-lg font-bold text-white">Computer's Hand</h3>
          <div className="flex gap-4 overflow-x-auto p-4">
            {computerHand.map((card, index) => (
              <div key={index} className="flex-shrink-0">
                {gameState === 'showdown' ? renderCard(card) : (
                  <div className="h-32 w-24 rounded-lg bg-blue-600" />
                )}
              </div>
            ))}
          </div>
        </div>

        {communityCards.length > 0 && (
          <div className="mb-8">
            <h3 className="mb-2 text-lg font-bold text-white">Community Cards</h3>
            <div className="flex gap-4 overflow-x-auto p-4">
              {communityCards.map((card, index) => (
                <div key={index} className="flex-shrink-0">
                  {renderCard(card)}
                </div>
              ))}
            </div>
          </div>
        )}

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
        
        {['preFlop', 'flop', 'turn', 'river'].includes(gameState) && (
          <div className="flex gap-4">
            <Button onClick={check}>Check</Button>
            <Button variant="secondary" onClick={fold}>Fold</Button>
          </div>
        )}
        
        {pot > 0 && (
          <div className="rounded-full bg-white/10 px-6 py-2 text-lg font-bold text-white">
            Pot: ${pot}
          </div>
        )}
        
        {message && (
          <div className={`rounded-full px-6 py-2 text-lg font-bold
            ${message.includes('win') ? 'animate-bounce bg-yellow-400 text-black' : 'bg-white/10 text-white'}`}>
            {message}
          </div>
        )}
        
        {gameState === 'showdown' && (
          <Button
            onClick={() => {
              setGameState('betting');
              setPlayerHand([]);
              setComputerHand([]);
              setCommunityCards([]);
              setMessage('');
              setPot(0);
            }}
          >
            New Game
          </Button>
        )}
      </div>
    </div>
  );
};