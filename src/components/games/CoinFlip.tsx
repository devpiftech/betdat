import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Button } from '../ui/Button';
import { Coins, RotateCw, Plus, Minus } from 'lucide-react';
import Confetti from 'react-confetti';
import { useSecureRNG } from '../../hooks/useSecureRNG';
import { useBetting } from '../../hooks/useBetting';
import { useFairness } from '../../hooks/useFairness';

const INITIAL_BET = 10;
const PAYOUT_MULTIPLIER = 1.95;

type CoinSide = 'heads' | 'tails';

export const CoinFlip = () => {
  const { balance, updateBalance } = useStore();
  const [flipping, setFlipping] = useState(false);
  const [bet, setBet] = useState(INITIAL_BET);
  const [selectedSide, setSelectedSide] = useState<CoinSide | null>(null);
  const [result, setResult] = useState<CoinSide | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());

  const { generateNumber, initialized } = useSecureRNG(sessionId);
  const { placeBet, resolveBet } = useBetting(sessionId, 'coin-flip');
  const { verifyOutcome, clientSeed } = useFairness(sessionId);

  const flip = async () => {
    if (!initialized || flipping || !selectedSide || balance < bet) return;

    setFlipping(true);
    const success = await placeBet(bet);
    if (!success) {
      setFlipping(false);
      return;
    }

    try {
      // Animate flipping
      let flips = 0;
      const flipInterval = setInterval(() => {
        setResult(Math.random() < 0.5 ? 'heads' : 'tails');
        flips++;
        if (flips >= 10) clearInterval(flipInterval);
      }, 100);

      // Generate final result
      setTimeout(async () => {
        const random = await generateNumber(0, 1);
        const isValid = await verifyOutcome('coin-flip', random, clientSeed);
        
        if (!isValid) {
          throw new Error('Invalid flip result');
        }

        const finalResult: CoinSide = random === 0 ? 'heads' : 'tails';
        setResult(finalResult);

        // Handle win/loss
        if (finalResult === selectedSide) {
          const winAmount = Math.floor(bet * PAYOUT_MULTIPLIER);
          await resolveBet(winAmount, true);
          updateBalance(winAmount);
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 3000);
        }

        setFlipping(false);
      }, 1100);

      updateBalance(-bet);
    } catch (error) {
      console.error('Error flipping coin:', error);
      setFlipping(false);
      await resolveBet(bet, false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-blue-900 to-indigo-900 p-8">
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
              disabled={flipping}
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
              disabled={flipping}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <div className={`relative h-48 w-48 rounded-full bg-yellow-400 
          ${flipping ? 'animate-[flip_0.1s_linear_infinite]' : 
            result ? 'animate-bounce' : ''}`}
        >
          <div className="absolute inset-0 flex items-center justify-center text-6xl">
            {result === 'heads' ? '👑' : result === 'tails' ? '🌟' : '?'}
          </div>
        </div>
      </div>

      <div className="mb-8 flex gap-4">
        <Button
          size="lg"
          variant={selectedSide === 'heads' ? 'default' : 'secondary'}
          onClick={() => setSelectedSide('heads')}
          disabled={flipping}
          className="w-32"
        >
          Heads
        </Button>
        <Button
          size="lg"
          variant={selectedSide === 'tails' ? 'default' : 'secondary'}
          onClick={() => setSelectedSide('tails')}
          disabled={flipping}
          className="w-32"
        >
          Tails
        </Button>
      </div>

      <Button
        size="lg"
        onClick={flip}
        disabled={flipping || !selectedSide || balance < bet || !initialized}
        className="min-w-[200px] gap-2"
      >
        <RotateCw className={`h-5 w-5 ${flipping ? 'animate-spin' : ''}`} />
        {!initialized ? 'Initializing...' : 
         flipping ? 'Flipping...' : 'Flip Coin'}
      </Button>

      {result && !flipping && (
        <div className="mt-6 text-center">
          <div className={`rounded-full px-6 py-2 text-lg font-bold
            ${result === selectedSide 
              ? 'animate-bounce bg-yellow-400 text-black'
              : 'bg-white/10 text-white'}`}
          >
            {result === selectedSide
              ? `You won $${Math.floor(bet * PAYOUT_MULTIPLIER)}!`
              : 'Better luck next time!'}
          </div>
        </div>
      )}

      <div className="mt-8 rounded-lg bg-white/10 p-4 text-white backdrop-blur-sm">
        <h3 className="mb-2 text-lg font-bold">Payout</h3>
        <p>Win {(PAYOUT_MULTIPLIER - 1) * 100}% of your bet</p>
      </div>
    </div>
  );
};