import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { Button } from '../ui/Button';
import { Coins, RotateCw, Plus, Minus } from 'lucide-react';
import Confetti from 'react-confetti';
import { useBetting } from '../../hooks/useBetting';
import { useSecureRNG } from '../../hooks/useSecureRNG';
import { useFairness } from '../../hooks/useFairness';
import { socket } from '../../lib/socket';
import { nanoid } from 'nanoid';

type BetType = 'straight' | 'split' | 'street' | 'corner' | 'line' | 'dozen' | 'column' | 'red' | 'black' | 'even' | 'odd' | 'low' | 'high' | 'basket';

interface Bet {
  id: string;
  type: BetType;
  numbers: number[];
  amount: number;
  playerId: string;
}

type GamePhase = 'betting' | 'spinning' | 'payout';

const INITIAL_BET = 10;
const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

export const USRoulette = () => {
  const { user, balance, updateBalance } = useStore();
  const [currentNumber, setCurrentNumber] = useState<number | null>(null);
  const [gamePhase, setGamePhase] = useState<GamePhase>('betting');
  const [bets, setBets] = useState<Bet[]>([]);
  const [bet, setBet] = useState(INITIAL_BET);
  const [message, setMessage] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [sessionId] = useState(() => nanoid());

  const { generateNumber, initialized } = useSecureRNG(sessionId);
  const { verifyOutcome, clientSeed } = useFairness(sessionId);
  const { placeBet, resolveBet } = useBetting(sessionId, 'us-roulette');

  useEffect(() => {
    socket.on('roulette_timer', (time: number) => {
      setTimeLeft(time);
      if (time === 0) {
        setGamePhase('spinning');
      }
    });

    socket.on('roulette_result', (result: number) => {
      handleSpinResult(result);
    });

    socket.on('place_bet', (newBet: Bet) => {
      setBets(prev => [...prev, newBet]);
    });

    return () => {
      socket.off('roulette_timer');
      socket.off('roulette_result');
      socket.off('place_bet');
    };
  }, []);

  const addBet = async (type: BetType, numbers: number[]) => {
    if (balance < bet || gamePhase !== 'betting') {
      setMessage('Cannot place bet at this time');
      return;
    }

    setMessage('');

    const success = await placeBet(bet);
    if (!success) {
      setMessage('Failed to place bet');
      return;
    }

    updateBalance(-bet);

    const newBet: Bet = {
      id: nanoid(),
      type,
      numbers,
      amount: bet,
      playerId: user?.id || ''
    };
    setBets(prev => [...prev, newBet]);
    socket.emit('place_bet', newBet);

    setMessage(`Bet placed: $${bet} on ${type}`);
    setTimeout(() => setMessage(''), 2000);
  };

  const handleSpinResult = async (number: number) => {
    setCurrentNumber(number);
    setGamePhase('payout');

    let totalWin = 0;
    const payouts = calculatePayouts(number, bets);
    
    for (const payout of payouts) {
      if (payout.playerId === user?.id) {
        totalWin += payout.amount;
      }
    }

    if (totalWin > 0) {
      await resolveBet(totalWin, true);
      updateBalance(totalWin);
      setShowConfetti(true);
      setMessage(`You won $${totalWin}!`);
      setTimeout(() => setShowConfetti(false), 3000);
    } else {
      setMessage('Better luck next time!');
    }

    setTimeout(() => {
      setBets([]);
      setCurrentNumber(null);
      setGamePhase('betting');
      setMessage('');
    }, 5000);
  };

  const calculatePayouts = (winningNumber: number, placedBets: Bet[]): { playerId: string; amount: number }[] => {
    const payouts: { playerId: string; amount: number }[] = [];

    for (const bet of placedBets) {
      let multiplier = 0;

      switch (bet.type) {
        case 'straight':
          if (bet.numbers.includes(winningNumber)) multiplier = 35;
          break;
        case 'split':
          if (bet.numbers.includes(winningNumber)) multiplier = 17;
          break;
        case 'street':
          if (bet.numbers.includes(winningNumber)) multiplier = 11;
          break;
        case 'corner':
          if (bet.numbers.includes(winningNumber)) multiplier = 8;
          break;
        case 'line':
          if (bet.numbers.includes(winningNumber)) multiplier = 5;
          break;
        case 'basket': // Special US roulette bet (0, 00, 1, 2, 3)
          if (bet.numbers.includes(winningNumber)) multiplier = 6;
          break;
        case 'dozen':
        case 'column':
          if (bet.numbers.includes(winningNumber)) multiplier = 2;
          break;
        case 'red':
          if (RED_NUMBERS.includes(winningNumber)) multiplier = 1;
          break;
        case 'black':
          if (BLACK_NUMBERS.includes(winningNumber)) multiplier = 1;
          break;
        case 'even':
          if (winningNumber % 2 === 0 && winningNumber !== 0 && winningNumber !== 37) multiplier = 1;
          break;
        case 'odd':
          if (winningNumber % 2 === 1) multiplier = 1;
          break;
        case 'low':
          if (winningNumber >= 1 && winningNumber <= 18) multiplier = 1;
          break;
        case 'high':
          if (winningNumber >= 19 && winningNumber <= 36) multiplier = 1;
          break;
      }

      if (multiplier > 0) {
        payouts.push({
          playerId: bet.playerId,
          amount: bet.amount * (multiplier + 1)
        });
      }
    }

    return payouts;
  };

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
              disabled={gamePhase !== 'betting'}
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
              disabled={gamePhase !== 'betting'}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {timeLeft !== null && (
        <div className="mb-4 rounded-full bg-white/10 px-6 py-2 text-lg font-bold text-white">
          Betting closes in: {timeLeft}s
        </div>
      )}

      <div className="mb-8 flex justify-center">
        <div className="relative h-48 w-48">
          <div className={`absolute inset-0 flex items-center justify-center rounded-full 
            bg-green-700 text-4xl font-bold text-white shadow-xl
            ${gamePhase === 'spinning' ? 'animate-spin' : ''}`}>
            {currentNumber === null ? '00' :
             currentNumber === 37 ? '00' :
             currentNumber}
          </div>
        </div>
      </div>

      <div className="mb-8 w-full max-w-4xl">
        {/* Numbers Grid with 00 */}
        <div className="mb-4 grid grid-cols-13 gap-1">
          <div className="col-span-2 grid grid-cols-2 gap-1">
            <button
              onClick={() => addBet('straight', [0])}
              disabled={gamePhase !== 'betting'}
              className="h-12 rounded bg-green-600 font-bold text-white transition-transform hover:scale-105 disabled:opacity-50"
            >
              0
            </button>
            <button
              onClick={() => addBet('straight', [37])} // 37 represents 00
              disabled={gamePhase !== 'betting'}
              className="h-12 rounded bg-green-600 font-bold text-white transition-transform hover:scale-105 disabled:opacity-50"
            >
              00
            </button>
          </div>
          {Array.from({ length: 36 }, (_, i) => i + 1).map(number => (
            <button
              key={number}
              onClick={() => addBet('straight', [number])}
              disabled={gamePhase !== 'betting'}
              className={`h-12 rounded font-bold text-white transition-transform hover:scale-105 disabled:opacity-50
                ${RED_NUMBERS.includes(number) ? 'bg-red-600' : 'bg-black'}`}
            >
              {number}
            </button>
          ))}
        </div>

        {/* Special US Roulette Bets */}
        <div className="mb-2 grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            onClick={() => addBet('basket', [0, 37, 1, 2, 3])} // 37 represents 00
            disabled={gamePhase !== 'betting'}
            className="bg-purple-600 text-white hover:bg-purple-700"
          >
            Basket (0-00-1-2-3)
          </Button>
          <Button
            variant="secondary"
            onClick={() => addBet('split', [0, 37])} // 0-00 split
            disabled={gamePhase !== 'betting'}
            className="bg-purple-600 text-white hover:bg-purple-700"
          >
            0-00 Split
          </Button>
        </div>

        {/* Standard Betting Options */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="secondary"
            onClick={() => addBet('dozen', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])}
            disabled={gamePhase !== 'betting'}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            1st 12
          </Button>
          <Button
            variant="secondary"
            onClick={() => addBet('dozen', [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24])}
            disabled={gamePhase !== 'betting'}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            2nd 12
          </Button>
          <Button
            variant="secondary"
            onClick={() => addBet('dozen', [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36])}
            disabled={gamePhase !== 'betting'}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            3rd 12
          </Button>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            onClick={() => addBet('red', RED_NUMBERS)}
            disabled={gamePhase !== 'betting'}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            Red
          </Button>
          <Button
            variant="secondary"
            onClick={() => addBet('black', BLACK_NUMBERS)}
            disabled={gamePhase !== 'betting'}
            className="bg-black text-white hover:bg-gray-800"
          >
            Black
          </Button>
          <Button
            variant="secondary"
            onClick={() => addBet('even', Array.from({ length: 18 }, (_, i) => (i + 1) * 2))}
            disabled={gamePhase !== 'betting'}
          >
            Even
          </Button>
          <Button
            variant="secondary"
            onClick={() => addBet('odd', Array.from({ length: 18 }, (_, i) => i * 2 + 1))}
            disabled={gamePhase !== 'betting'}
          >
            Odd
          </Button>
          <Button
            variant="secondary"
            onClick={() => addBet('low', Array.from({ length: 18 }, (_, i) => i + 1))}
            disabled={gamePhase !== 'betting'}
          >
            1-18
          </Button>
          <Button
            variant="secondary"
            onClick={() => addBet('high', Array.from({ length: 18 }, (_, i) => i + 19))}
            disabled={gamePhase !== 'betting'}
          >
            19-36
          </Button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        {bets.length > 0 && (
          <div className="rounded-full bg-white/10 px-6 py-2 text-lg font-bold text-white">
            Total Bets: ${bets.reduce((sum, bet) => sum + bet.amount, 0)}
          </div>
        )}
        
        {message && (
          <div className={`rounded-full px-6 py-2 text-lg font-bold
            ${message.includes('won') ? 'animate-bounce bg-yellow-400 text-black' : 'bg-white/10 text-white'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};