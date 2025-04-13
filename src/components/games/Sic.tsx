import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Button } from '../ui/Button';
import { Coins, RotateCw, Plus, Minus } from 'lucide-react';
import Confetti from 'react-confetti';
import { useBetting } from '../../hooks/useBetting';
import { useSecureRNG } from '../../hooks/useSecureRNG';
import { useFairness } from '../../hooks/useFairness';

const INITIAL_BET = 10;

type BetType = 'small' | 'big' | 'triple' | 'double' | 'any' | 'specific';

interface Bet {
  type: BetType;
  numbers?: number[];
  amount: number;
}

const PAYOUTS = {
  small: 1,    // 4-10 (except triples)
  big: 1,      // 11-17 (except triples)
  triple: 30,  // All three dice same number
  double: 10,  // Any specific double
  any: 6,      // Any triple
  specific: 60 // Specific triple
};

export const Sic = () => {
  const { balance, updateBalance } = useStore();
  const [dice, setDice] = useState<[number, number, number]>([1, 1, 1]);
  const [bet, setBet] = useState(INITIAL_BET);
  const [bets, setBets] = useState<Bet[]>([]);
  const [rolling, setRolling] = useState(false);
  const [message, setMessage] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());

  const { generateNumber, initialized } = useSecureRNG(sessionId);
  const { verifyOutcome, clientSeed } = useFairness(sessionId);
  const { placeBet, resolveBet } = useBetting(sessionId, 'sic-bo');

  const addBet = async (type: BetType, numbers?: number[]) => {
    if (balance < bet) return;

    const success = await placeBet(bet);
    if (!success) return;

    setBets([...bets, { type, numbers, amount: bet }]);
    updateBalance(-bet);
  };

  const roll = async () => {
    if (!initialized || rolling || bets.length === 0) return;

    setRolling(true);
    setMessage('');

    try {
      // Animate rolling
      let rolls = 0;
      const rollInterval = setInterval(() => {
        setDice([
          Math.floor(Math.random() * 6) + 1,
          Math.floor(Math.random() * 6) + 1,
          Math.floor(Math.random() * 6) + 1
        ]);
        rolls++;
        if (rolls >= 20) {
          clearInterval(rollInterval);
          generateFinalRoll();
        }
      }, 100);
    } catch (error) {
      console.error('Error rolling dice:', error);
      setMessage('An error occurred');
      setRolling(false);
    }
  };

  const generateFinalRoll = async () => {
    try {
      // Generate final roll
      const die1 = await generateNumber(1, 6);
      const die2 = await generateNumber(1, 6);
      const die3 = await generateNumber(1, 6);

      const isValid = await verifyOutcome('sic-bo', [die1, die2, die3], clientSeed);
      if (!isValid) {
        throw new Error('Invalid roll outcome');
      }

      const finalDice: [number, number, number] = [die1, die2, die3];
      setDice(finalDice);

      // Process wins
      let totalWin = 0;
      const total = finalDice.reduce((sum, die) => sum + die, 0);
      const isTriple = finalDice[0] === finalDice[1] && finalDice[1] === finalDice[2];
      const hasDouble = finalDice.some((die, i) => 
        finalDice.some((d, j) => i !== j && die === d)
      );

      for (const bet of bets) {
        let win = 0;

        switch (bet.type) {
          case 'small':
            if (total >= 4 && total <= 10 && !isTriple) {
              win = bet.amount * (1 + PAYOUTS.small);
            }
            break;

          case 'big':
            if (total >= 11 && total <= 17 && !isTriple) {
              win = bet.amount * (1 + PAYOUTS.big);
            }
            break;

          case 'triple':
            if (isTriple && bet.numbers?.includes(finalDice[0])) {
              win = bet.amount * (1 + PAYOUTS.triple);
            }
            break;

          case 'double':
            if (hasDouble && !isTriple) {
              const double = finalDice.find((die, i) => 
                finalDice.some((d, j) => i !== j && die === d)
              );
              if (bet.numbers?.includes(double!)) {
                win = bet.amount * (1 + PAYOUTS.double);
              }
            }
            break;

          case 'any':
            if (isTriple) {
              win = bet.amount * (1 + PAYOUTS.any);
            }
            break;

          case 'specific':
            if (isTriple && bet.numbers?.every(n => finalDice.includes(n))) {
              win = bet.amount * (1 + PAYOUTS.specific);
            }
            break;
        }

        if (win > 0) {
          await resolveBet(win, true);
          totalWin += win;
        }
      }

      if (totalWin > 0) {
        updateBalance(totalWin);
        setShowConfetti(true);
        setMessage(`You won $${totalWin}!`);
        setTimeout(() => setShowConfetti(false), 3000);
      } else {
        setMessage('Better luck next time!');
      }

      setBets([]);
      setRolling(false);
    } catch (error) {
      console.error('Error generating final roll:', error);
      setMessage('An error occurred');
      setRolling(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-red-900 to-amber-900 p-8">
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
              disabled={rolling}
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
              disabled={rolling}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-8 flex justify-center gap-8">
        {dice.map((value, i) => (
          <div
            key={i}
            className={`flex h-24 w-24 items-center justify-center rounded-lg 
              bg-white text-4xl font-bold shadow-lg
              ${rolling ? 'animate-bounce' : ''}`}
          >
            {value}
          </div>
        ))}
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Button
          onClick={() => addBet('small')}
          disabled={rolling}
          className="h-auto flex-col gap-2 p-4"
        >
          <span className="text-lg font-bold">Small (4-10)</span>
          <span className="text-sm">1:1</span>
        </Button>

        <Button
          onClick={() => addBet('big')}
          disabled={rolling}
          className="h-auto flex-col gap-2 p-4"
        >
          <span className="text-lg font-bold">Big (11-17)</span>
          <span className="text-sm">1:1</span>
        </Button>

        <Button
          onClick={() => addBet('any')}
          disabled={rolling}
          className="h-auto flex-col gap-2 p-4"
        >
          <span className="text-lg font-bold">Any Triple</span>
          <span className="text-sm">6:1</span>
        </Button>

        {[1, 2, 3, 4, 5, 6].map(number => (
          <Button
            key={number}
            onClick={() => addBet('triple', [number])}
            disabled={rolling}
            className="h-auto flex-col gap-2 p-4"
          >
            <span className="text-lg font-bold">Triple {number}</span>
            <span className="text-sm">30:1</span>
          </Button>
        ))}
      </div>

      <div className="flex flex-col items-center gap-4">
        <Button
          size="lg"
          onClick={roll}
          disabled={rolling || bets.length === 0 || !initialized}
          className="min-w-[200px] gap-2"
        >
          <RotateCw className={`h-5 w-5 ${rolling ? 'animate-spin' : ''}`} />
          {!initialized ? 'Initializing...' : rolling ? 'Rolling...' : 'Roll Dice'}
        </Button>
        
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

      <div className="mt-8 rounded-lg bg-white/10 p-4 text-white backdrop-blur-sm">
        <h3 className="mb-2 text-lg font-bold">Payouts</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="flex items-center justify-between">
            <span>Small/Big</span>
            <span>1:1</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Any Triple</span>
            <span>6:1</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Specific Triple</span>
            <span>30:1</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Double</span>
            <span>10:1</span>
          </div>
        </div>
      </div>
    </div>
  );
};