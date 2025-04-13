import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { Button } from '../ui/Button';
import { Coins, RotateCw, Plus, Minus } from 'lucide-react';
import Confetti from 'react-confetti';
import { useBetting } from '../../hooks/useBetting';
import { useSecureRNG } from '../../hooks/useSecureRNG';
import { useFairness } from '../../hooks/useFairness';

const INITIAL_BET = 10;

type BetType = 'player' | 'banker' | 'tie';
type Card = { suit: '♠' | '♥' | '♦' | '♣'; value: string; numericValue: number };
type Hand = Card[];

export const Baccarat = () => {
  const { balance, updateBalance } = useStore();
  const [playerHand, setPlayerHand] = useState<Hand>([]);
  const [bankerHand, setBankerHand] = useState<Hand>([]);
  const [bet, setBet] = useState(INITIAL_BET);
  const [selectedBet, setSelectedBet] = useState<BetType | null>(null);
  const [dealing, setDealing] = useState(false);
  const [message, setMessage] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());

  const { generateNumber, initialized } = useSecureRNG(sessionId);
  const { verifyOutcome, clientSeed } = useFairness(sessionId);
  const { placeBet, resolveBet } = useBetting(sessionId, 'baccarat');

  const deal = async () => {
    if (!initialized || dealing || !selectedBet || balance < bet) return;

    setDealing(true);
    const success = await placeBet(bet);
    if (!success) {
      setDealing(false);
      return;
    }

    try {
      updateBalance(-bet);
      setMessage('');
      setPlayerHand([]);
      setBankerHand([]);

      // Initial deal
      const pHand = [await drawCard(), await drawCard()];
      const bHand = [await drawCard(), await drawCard()];

      setPlayerHand(pHand);
      setBankerHand(bHand);

      // Calculate initial values
      let playerValue = calculateHandValue(pHand);
      let bankerValue = calculateHandValue(bHand);

      // Draw third cards according to Baccarat rules
      if (playerValue <= 5) {
        const playerCard = await drawCard();
        pHand.push(playerCard);
        playerValue = calculateHandValue(pHand);
        setPlayerHand([...pHand]);
      }

      if (shouldBankerDraw(bankerValue, playerValue)) {
        const bankerCard = await drawCard();
        bHand.push(bankerCard);
        bankerValue = calculateHandValue(bHand);
        setBankerHand([...bHand]);
      }

      // Determine winner
      const winner = determineWinner(playerValue, bankerValue);
      
      if (winner === selectedBet) {
        const multiplier = selectedBet === 'tie' ? 8 : selectedBet === 'banker' ? 0.95 : 1;
        const winAmount = Math.floor(bet * (1 + multiplier));
        await resolveBet(winAmount, true);
        updateBalance(winAmount);
        setShowConfetti(true);
        setMessage(`You won $${winAmount}!`);
      } else {
        setMessage('Better luck next time!');
      }

      setTimeout(() => {
        setShowConfetti(false);
        setDealing(false);
      }, 3000);
    } catch (error) {
      console.error('Error dealing:', error);
      setMessage('An error occurred');
      setDealing(false);
    }
  };

  const drawCard = async (): Promise<Card> => {
    const suits: ('♠' | '♥' | '♦' | '♣')[] = ['♠', '♥', '♦', '♣'];
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    
    const suitIndex = await generateNumber(0, 3);
    const valueIndex = await generateNumber(0, 12);
    
    const isValid = await verifyOutcome('baccarat', [suitIndex, valueIndex], clientSeed);
    if (!isValid) {
      throw new Error('Invalid card generation');
    }

    return {
      suit: suits[suitIndex],
      value: values[valueIndex],
      numericValue: valueIndex >= 9 ? 0 : valueIndex + 1
    };
  };

  const calculateHandValue = (hand: Hand): number => {
    return hand.reduce((sum, card) => (sum + card.numericValue) % 10, 0);
  };

  const shouldBankerDraw = (bankerValue: number, playerValue: number): boolean => {
    if (bankerValue >= 7) return false;
    if (bankerValue <= 2) return true;
    if (bankerValue === 3) return playerValue !== 8;
    if (bankerValue === 4) return [2, 3, 4, 5, 6, 7].includes(playerValue);
    if (bankerValue === 5) return [4, 5, 6, 7].includes(playerValue);
    if (bankerValue === 6) return [6, 7].includes(playerValue);
    return false;
  };

  const determineWinner = (playerValue: number, bankerValue: number): BetType => {
    if (playerValue === bankerValue) return 'tie';
    return playerValue > bankerValue ? 'player' : 'banker';
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
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setBet(Math.max(INITIAL_BET, bet - INITIAL_BET))}
              disabled={dealing}
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
              disabled={dealing}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-8 w-full max-w-4xl">
        <div className="mb-8">
          <h3 className="mb-2 text-lg font-bold text-white">Banker's Hand</h3>
          <div className="flex gap-4 overflow-x-auto p-4">
            {bankerHand.map((card, index) => (
              <div key={index} className="flex-shrink-0">
                {renderCard(card)}
              </div>
            ))}
          </div>
          {bankerHand.length > 0 && (
            <p className="mt-2 text-center text-lg font-bold text-white">
              Value: {calculateHandValue(bankerHand)}
            </p>
          )}
        </div>

        <div className="mb-8">
          <h3 className="mb-2 text-lg font-bold text-white">Player's Hand</h3>
          <div className="flex gap-4 overflow-x-auto p-4">
            {playerHand.map((card, index) => (
              <div key={index} className="flex-shrink-0">
                {renderCard(card)}
              </div>
            ))}
          </div>
          {playerHand.length > 0 && (
            <p className="mt-2 text-center text-lg font-bold text-white">
              Value: {calculateHandValue(playerHand)}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="flex gap-4">
          <Button
            variant={selectedBet === 'player' ? 'default' : 'secondary'}
            onClick={() => setSelectedBet('player')}
            disabled={dealing}
            className="w-32"
          >
            Player (1:1)
          </Button>
          <Button
            variant={selectedBet === 'banker' ? 'default' : 'secondary'}
            onClick={() => setSelectedBet('banker')}
            disabled={dealing}
            className="w-32"
          >
            Banker (0.95:1)
          </Button>
          <Button
            variant={selectedBet === 'tie' ? 'default' : 'secondary'}
            onClick={() => setSelectedBet('tie')}
            disabled={dealing}
            className="w-32"
          >
            Tie (8:1)
          </Button>
        </div>

        <Button
          size="lg"
          onClick={deal}
          disabled={dealing || !selectedBet || balance < bet || !initialized}
          className="min-w-[200px] gap-2"
        >
          <RotateCw className={`h-5 w-5 ${dealing ? 'animate-spin' : ''}`} />
          {!initialized ? 'Initializing...' : dealing ? 'Dealing...' : 'Deal'}
        </Button>
        
        {message && (
          <div className={`rounded-full px-6 py-2 text-lg font-bold
            ${message.includes('won') ? 'animate-bounce bg-yellow-400 text-black' : 'bg-white/10 text-white'}`}>
            {message}
          </div>
        )}
      </div>

      <div className="mt-8 rounded-lg bg-white/10 p-4 text-white backdrop-blur-sm">
        <h3 className="mb-2 text-lg font-bold">Baccarat Rules</h3>
        <ul className="list-disc space-y-2 pl-4">
          <li>Player and Banker each get 2-3 cards</li>
          <li>Hand values are calculated modulo 10</li>
          <li>Face cards and 10s count as 0</li>
          <li>Closest to 9 wins</li>
          <li>Third card rules follow standard Baccarat</li>
        </ul>
      </div>
    </div>
  );
};