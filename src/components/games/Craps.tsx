import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { Button } from '../ui/Button';
import { Coins, Dice1 as Dice, Plus, Minus } from 'lucide-react';
import Confetti from 'react-confetti';
import { useBetting } from '../../hooks/useBetting';
import { useSecureRNG } from '../../hooks/useSecureRNG';
import { useFairness } from '../../hooks/useFairness';

const INITIAL_BET = 10;

type BetType = 'pass' | 'dontPass' | 'come' | 'dontCome' | 'field' | 'place';

interface Bet {
  type: BetType;
  amount: number;
}

export const Craps = () => {
  const { balance, updateBalance } = useStore();
  const [dice, setDice] = useState<[number, number]>([1, 1]);
  const [point, setPoint] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);
  const [bets, setBets] = useState<Bet[]>([]);
  const [currentBet, setCurrentBet] = useState(INITIAL_BET);
  const [message, setMessage] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());

  const { generateNumber, initialized } = useSecureRNG(sessionId);
  const { verifyOutcome, clientSeed } = useFairness(sessionId);
  const { placeBet, resolveBet } = useBetting(sessionId, 'craps');

  const addBet = async (type: BetType) => {
    if (balance < currentBet) return;

    const success = await placeBet(currentBet);
    if (!success) return;

    setBets([...bets, { type, amount: currentBet }]);
    setMessage(`Placed ${type} bet: $${currentBet}`);
  };

  const rollDice = async () => {
    if (!initialized || rolling || bets.length === 0) return;

    setRolling(true);
    setMessage('');

    // Animate rolling
    const rollInterval = setInterval(() => {
      setDice([
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1
      ]);
    }, 100);

    // Generate final roll after delay
    setTimeout(async () => {
      clearInterval(rollInterval);
      const die1 = await generateNumber(1, 6);
      const die2 = await generateNumber(1, 6);
      
      const isValid = await verifyOutcome('craps', [die1, die2], clientSeed);
      if (!isValid) {
        setMessage('Error: Invalid roll');
        setRolling(false);
        return;
      }

      setDice([die1, die2]);
      resolveDice(die1 + die2);
    }, 2000);
  };

  const resolveDice = async (total: number) => {
    let winnings = 0;
    const newBets: Bet[] = [];

    for (const bet of bets) {
      let won = false;

      switch (bet.type) {
        case 'pass':
          if (!point) {
            // Come out roll
            if (total === 7 || total === 11) {
              won = true;
              winnings += bet.amount * 2;
            } else if (total === 2 || total === 3 || total === 12) {
              // Craps - lose
            } else {
              setPoint(total);
              newBets.push(bet);
              continue;
            }
          } else {
            // Point established
            if (total === point) {
              won = true;
              winnings += bet.amount * 2;
              setPoint(null);
            } else if (total === 7) {
              setPoint(null);
            } else {
              newBets.push(bet);
              continue;
            }
          }
          break;

        case 'dontPass':
          if (!point) {
            // Come out roll
            if (total === 7 || total === 11) {
              // Lose
            } else if (total === 2 || total === 3) {
              won = true;
              winnings += bet.amount * 2;
            } else if (total === 12) {
              // Push
              winnings += bet.amount;
            } else {
              setPoint(total);
              newBets.push(bet);
              continue;
            }
          } else {
            // Point established
            if (total === 7) {
              won = true;
              winnings += bet.amount * 2;
              setPoint(null);
            } else if (total === point) {
              setPoint(null);
            } else {
              newBets.push(bet);
              continue;
            }
          }
          break;

        case 'field':
          if (total === 2) {
            won = true;
            winnings += bet.amount * 3;
          } else if (total === 12) {
            won = true;
            winnings += bet.amount * 4;
          } else if ([3, 4, 9, 10, 11].includes(total)) {
            won = true;
            winnings += bet.amount * 2;
          }
          break;
      }

      if (won) {
        await resolveBet(bet.amount, true);
      }
    }

    setBets(newBets);
    
    if (winnings > 0) {
      updateBalance(winnings);
      setMessage(`You won $${winnings}!`);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    } else if (newBets.length < bets.length) {
      setMessage('Better luck next time!');
    }

    setRolling(false);
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
              onClick={() => setCurrentBet(Math.max(INITIAL_BET, currentBet - INITIAL_BET))}
              disabled={rolling}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="min-w-[60px] text-center font-bold">
              Bet: ${currentBet}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCurrentBet(currentBet + INITIAL_BET)}
              disabled={rolling}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-8 w-full max-w-4xl">
        {/* Dice Display */}
        <div className="mb-8 flex justify-center gap-8">
          {dice.map((value, i) => (
            <div
              key={i}
              className={`flex h-24 w-24 items-center justify-center rounded-lg bg-white text-4xl font-bold shadow-lg
                ${rolling ? 'animate-bounce' : ''}`}
            >
              {value}
            </div>
          ))}
        </div>

        {point !== null && (
          <div className="mb-8 text-center">
            <div className="inline-block rounded-full bg-yellow-500 px-6 py-2 text-xl font-bold text-white">
              Point: {point}
            </div>
          </div>
        )}

        {/* Betting Options */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Button
            onClick={() => addBet('pass')}
            disabled={rolling || balance < currentBet}
            className="h-auto flex-col gap-2 p-4"
          >
            <Dice className="h-6 w-6" />
            <span className="text-lg font-bold">Pass Line</span>
            <span className="text-sm">Win on 7 or 11</span>
          </Button>

          <Button
            onClick={() => addBet('dontPass')}
            disabled={rolling || balance < currentBet}
            className="h-auto flex-col gap-2 p-4"
          >
            <Dice className="h-6 w-6" />
            <span className="text-lg font-bold">Don't Pass</span>
            <span className="text-sm">Win on 2 or 3</span>
          </Button>

          <Button
            onClick={() => addBet('field')}
            disabled={rolling || balance < currentBet}
            className="h-auto flex-col gap-2 p-4"
          >
            <Dice className="h-6 w-6" />
            <span className="text-lg font-bold">Field</span>
            <span className="text-sm">2,3,4,9,10,11,12</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <Button
          size="lg"
          onClick={rollDice}
          disabled={rolling || bets.length === 0 || !initialized}
          className="min-w-[200px] gap-2"
        >
          <Dice className={`h-5 w-5 ${rolling ? 'animate-spin' : ''}`} />
          {!initialized ? 'Initializing...' : rolling ? 'Rolling...' : 'Roll Dice'}
        </Button>
        
        {bets.length > 0 && (
          <div className="rounded-full bg-white/10 px-6 py-2 text-lg font-bold text-white">
            Active Bets: {bets.length}
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