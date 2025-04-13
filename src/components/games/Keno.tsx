import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { Button } from '../ui/Button';
import { Coins, Play, Plus, Minus } from 'lucide-react';
import Confetti from 'react-confetti';
import { useBetting } from '../../hooks/useBetting';
import { useSecureRNG } from '../../hooks/useSecureRNG';
import { useFairness } from '../../hooks/useFairness';

const INITIAL_BET = 10;
const MAX_SELECTIONS = 10;
const TOTAL_NUMBERS = 80;
const DRAWN_NUMBERS = 20;

const PAYTABLE = {
  1: [0, 3],
  2: [0, 0, 12],
  3: [0, 0, 2, 40],
  4: [0, 0, 1, 6, 120],
  5: [0, 0, 1, 3, 15, 300],
  6: [0, 0, 1, 3, 7, 30, 600],
  7: [0, 0, 1, 2, 4, 20, 100, 1200],
  8: [0, 0, 1, 2, 4, 10, 50, 200, 2400],
  9: [0, 0, 1, 2, 3, 5, 25, 100, 500, 4000],
  10: [0, 0, 1, 2, 3, 4, 10, 50, 200, 1000, 10000]
};

export const Keno = () => {
  const { balance, updateBalance } = useStore();
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([]);
  const [bet, setBet] = useState(INITIAL_BET);
  const [drawing, setDrawing] = useState(false);
  const [win, setWin] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());

  const { generateNumber, initialized } = useSecureRNG(sessionId);
  const { verifyOutcome, clientSeed } = useFairness(sessionId);
  const { placeBet, resolveBet } = useBetting(sessionId, 'keno');

  const toggleNumber = (number: number) => {
    if (drawing) return;

    if (selectedNumbers.includes(number)) {
      setSelectedNumbers(prev => prev.filter(n => n !== number));
    } else if (selectedNumbers.length < MAX_SELECTIONS) {
      setSelectedNumbers(prev => [...prev, number]);
    }
  };

  const draw = async () => {
    if (!initialized || drawing || selectedNumbers.length === 0 || balance < bet) return;

    setDrawing(true);
    const success = await placeBet(bet);
    if (!success) {
      setDrawing(false);
      return;
    }

    try {
      updateBalance(-bet);
      setWin(0);
      setDrawnNumbers([]);

      // Draw numbers one by one
      const drawn: number[] = [];
      for (let i = 0; i < DRAWN_NUMBERS; i++) {
        let number: number;
        do {
          number = await generateNumber(1, TOTAL_NUMBERS);
          const isValid = await verifyOutcome('keno', number, clientSeed);
          if (!isValid) throw new Error('Invalid number generation');
        } while (drawn.includes(number));

        drawn.push(number);
        setDrawnNumbers(prev => [...prev, number]);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Calculate matches
      const matches = selectedNumbers.filter(n => drawn.includes(n)).length;
      const multiplier = PAYTABLE[selectedNumbers.length as keyof typeof PAYTABLE][matches];
      const winAmount = bet * multiplier;

      if (winAmount > 0) {
        await resolveBet(winAmount, true);
        updateBalance(winAmount);
        setWin(winAmount);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
    } catch (error) {
      console.error('Error during draw:', error);
    } finally {
      setDrawing(false);
    }
  };

  const quickPick = async () => {
    if (drawing) return;

    const picks: number[] = [];
    while (picks.length < MAX_SELECTIONS) {
      const number = await generateNumber(1, TOTAL_NUMBERS);
      if (!picks.includes(number)) {
        picks.push(number);
      }
    }
    setSelectedNumbers(picks);
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-purple-900 to-indigo-900 p-8">
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
              disabled={drawing}
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
              disabled={drawing}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-8 w-full max-w-4xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            Select up to {MAX_SELECTIONS} numbers
          </h2>
          <Button
            variant="secondary"
            onClick={quickPick}
            disabled={drawing}
          >
            Quick Pick
          </Button>
        </div>

        <div className="grid grid-cols-8 gap-2 sm:grid-cols-10">
          {Array.from({ length: TOTAL_NUMBERS }, (_, i) => i + 1).map(number => (
            <button
              key={number}
              onClick={() => toggleNumber(number)}
              disabled={drawing}
              className={`aspect-square rounded-lg text-lg font-bold transition-all
                ${selectedNumbers.includes(number)
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/10 text-white hover:bg-white/20'}
                ${drawnNumbers.includes(number) &&
                  (selectedNumbers.includes(number)
                    ? 'animate-pulse ring-4 ring-green-400'
                    : 'ring-4 ring-red-400')}
              `}
            >
              {number}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <Button
          size="lg"
          onClick={draw}
          disabled={
            drawing ||
            selectedNumbers.length === 0 ||
            balance < bet ||
            !initialized
          }
          className="min-w-[200px] gap-2"
        >
          <Play className={`h-5 w-5 ${drawing ? 'animate-spin' : ''}`} />
          {!initialized ? 'Initializing...' : 
           drawing ? 'Drawing...' : 'Draw'}
        </Button>

        {selectedNumbers.length > 0 && (
          <div className="rounded-full bg-white/10 px-6 py-2 text-lg font-bold text-white">
            Selected: {selectedNumbers.length} numbers
          </div>
        )}
        
        {win > 0 && (
          <div className="animate-bounce rounded-full bg-yellow-400 px-6 py-2 text-lg font-bold text-black">
            You won ${win}!
          </div>
        )}
      </div>

      <div className="mt-8 rounded-lg bg-white/10 p-4 text-white backdrop-blur-sm">
        <h3 className="mb-4 text-lg font-bold">Paytable</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {Object.entries(PAYTABLE).map(([spots, multipliers]) => (
            <div key={spots} className="rounded bg-black/20 p-2">
              <div className="mb-2 font-bold">Pick {spots}</div>
              <div className="grid grid-cols-2 gap-1 text-sm">
                {multipliers.map((multiplier, matches) => (
                  multiplier > 0 && (
                    <div key={matches} className="flex justify-between">
                      <span>{matches} matches:</span>
                      <span className="font-bold text-yellow-400">
                        {multiplier}x
                      </span>
                    </div>
                  )
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};