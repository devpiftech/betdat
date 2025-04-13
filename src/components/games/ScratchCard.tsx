import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { Button } from '../ui/Button';
import { Coins, Eraser, RefreshCw } from 'lucide-react';
import Confetti from 'react-confetti';
import { useSecureRNG } from '../../hooks/useSecureRNG';
import { useBetting } from '../../hooks/useBetting';
import { useFairness } from '../../hooks/useFairness';

const CARD_PRICE = 5;
const GRID_SIZE = 3;
const SYMBOLS = ['💎', '💰', '🎰', '🎲', '🎯', '🎪'];
const PAYOUTS = {
  '💎': 100,
  '💰': 50,
  '🎰': 25,
  '🎲': 15,
  '🎯': 10,
  '🎪': 5
};

export const ScratchCard = () => {
  const { balance, updateBalance } = useStore();
  const [grid, setGrid] = useState<string[][]>(
    Array(GRID_SIZE).fill(Array(GRID_SIZE).fill('?'))
  );
  const [revealed, setRevealed] = useState<boolean[][]>(
    Array(GRID_SIZE).fill(Array(GRID_SIZE).fill(false))
  );
  const [scratching, setScratching] = useState(false);
  const [win, setWin] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());

  const { generateNumber, initialized } = useSecureRNG(sessionId);
  const { placeBet, resolveBet } = useBetting(sessionId, 'scratch-card');
  const { verifyOutcome, clientSeed } = useFairness(sessionId);

  const buyCard = async () => {
    if (!initialized || scratching || balance < CARD_PRICE) return;

    setScratching(true);
    const success = await placeBet(CARD_PRICE);
    if (!success) {
      setScratching(false);
      return;
    }

    try {
      // Generate new card
      const newGrid: string[][] = [];
      for (let i = 0; i < GRID_SIZE; i++) {
        const row: string[] = [];
        for (let j = 0; j < GRID_SIZE; j++) {
          const symbolIndex = await generateNumber(0, SYMBOLS.length - 1);
          const isValid = await verifyOutcome('scratch-card', symbolIndex, clientSeed);
          if (!isValid) throw new Error('Invalid symbol generation');
          row.push(SYMBOLS[symbolIndex]);
        }
        newGrid.push(row);
      }

      setGrid(newGrid);
      setRevealed(Array(GRID_SIZE).fill(Array(GRID_SIZE).fill(false)));
      setWin(0);
      updateBalance(-CARD_PRICE);
    } catch (error) {
      console.error('Error generating card:', error);
      await resolveBet(CARD_PRICE, false);
    } finally {
      setScratching(false);
    }
  };

  const revealCell = async (row: number, col: number) => {
    if (revealed[row][col]) return;

    const newRevealed = revealed.map((r, i) =>
      i === row ? r.map((c, j) => j === col ? true : c) : r
    );
    setRevealed(newRevealed);

    // Check for win after reveal
    const symbol = grid[row][col];
    const payout = PAYOUTS[symbol as keyof typeof PAYOUTS] || 0;
    
    if (payout > 0) {
      const winAmount = CARD_PRICE * payout;
      setWin(prev => prev + winAmount);
      await resolveBet(winAmount, true);
      updateBalance(winAmount);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
  };

  const revealAll = () => {
    setRevealed(Array(GRID_SIZE).fill(Array(GRID_SIZE).fill(true)));
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-yellow-900 to-red-900 p-8">
      {showConfetti && <Confetti />}
      
      <div className="mb-8 flex items-center justify-between gap-4 rounded-lg bg-white/10 p-4 text-white backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Coins className="h-6 w-6 text-yellow-400" />
          <span className="text-xl font-bold">${balance}</span>
        </div>
        <div className="text-lg font-bold">
          Card Price: ${CARD_PRICE}
        </div>
      </div>

      <div className="w-full max-w-lg">
        <div className="mb-8 grid grid-cols-3 gap-4">
          {grid.map((row, i) =>
            row.map((symbol, j) => (
              <button
                key={`${i}-${j}`}
                onClick={() => revealCell(i, j)}
                disabled={scratching}
                className={`aspect-square rounded-lg text-4xl transition-all
                  ${revealed[i][j]
                    ? 'bg-white/20 backdrop-blur-sm'
                    : 'bg-gradient-to-br from-gray-700 to-gray-900 hover:from-gray-600 hover:to-gray-800'
                  }`}
              >
                {revealed[i][j] ? symbol : '?'}
              </button>
            ))
          )}
        </div>

        <div className="flex gap-4">
          <Button
            className="flex-1 gap-2"
            onClick={buyCard}
            disabled={scratching || balance < CARD_PRICE || !initialized}
          >
            <RefreshCw className={`h-5 w-5 ${scratching ? 'animate-spin' : ''}`} />
            {scratching ? 'Generating...' : 'New Card'}
          </Button>

          <Button
            variant="secondary"
            className="gap-2"
            onClick={revealAll}
            disabled={scratching}
          >
            <Eraser className="h-5 w-5" />
            Reveal All
          </Button>
        </div>

        {win > 0 && (
          <div className="mt-6 text-center">
            <div className="animate-bounce rounded-full bg-yellow-400 px-6 py-2 text-lg font-bold text-black">
              You won ${win}!
            </div>
          </div>
        )}

        <div className="mt-8 rounded-lg bg-black/20 p-4 text-white backdrop-blur-sm">
          <h3 className="mb-4 text-lg font-bold">Payouts</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {Object.entries(PAYOUTS).map(([symbol, multiplier]) => (
              <div key={symbol} className="flex items-center gap-2">
                <span className="text-2xl">{symbol}</span>
                <span>×{multiplier}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};