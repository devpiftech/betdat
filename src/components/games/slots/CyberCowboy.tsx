import { useState, useEffect } from 'react';
import { useStore } from '../../../store/useStore';
import { Button } from '../../ui/Button';
import { Coins, RotateCw, Plus, Minus, Trophy, Zap } from 'lucide-react';
import Confetti from 'react-confetti';
import { useSecureRNG } from '../../../hooks/useSecureRNG';
import { useBetting } from '../../../hooks/useBetting';
import { useFairness } from '../../../hooks/useFairness';
import { formatCurrency } from '../../../lib/supabase';

// Cyberpunk Western themed symbols
const SYMBOLS = {
  '🤠': { weight: 1, payout: 50, name: 'Cyber Sheriff' },
  '🔫': { weight: 2, payout: 25, name: 'Laser Gun' },
  '🐎': { weight: 3, payout: 20, name: 'Robo Horse' },
  '🎯': { weight: 4, payout: 15, name: 'Target' },
  '⚡': { weight: 5, payout: 10, name: 'Energy' },
  '💎': { weight: 6, payout: 5, name: 'Crystal' }
} as const;

const ROWS = 3;
const COLS = 5;

export const CyberCowboy = () => {
  const { user } = useStore();
  const [sessionId] = useState(() => crypto.randomUUID());
  const [currencyType, setCurrencyType] = useState<'regular' | 'sweepstakes'>('regular');
  
  const { generateNumber, initialized } = useSecureRNG(sessionId);
  const { verifyOutcome, clientSeed, initializeFairness } = useFairness(sessionId);
  const { 
    placeBet, 
    resolveBet, 
    limits,
    bet,
    setBet,
    incrementBet,
    decrementBet,
    error: betError 
  } = useBetting(sessionId, 'cyber-cowboy', currencyType);

  // Game state
  const [grid, setGrid] = useState<string[][]>(Array(ROWS).fill(Array(COLS).fill('🤠')));
  const [spinning, setSpinning] = useState(false);
  const [win, setWin] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [multiplier, setMultiplier] = useState(1);
  const [message, setMessage] = useState('');
  const [bonusSpins, setBonusSpins] = useState(0);

  // Initialize fairness and load limits
  useEffect(() => {
    if (user) {
      initializeFairness();
    }
  }, [user, currencyType]);

  const spin = async () => {
    if (!initialized || spinning || !user) return;

    setSpinning(true);
    setMessage('');
    setWin(0);
    setMultiplier(1);

    // If using bonus spins, don't charge the player
    if (bonusSpins === 0) {
      const success = await placeBet(bet);
      if (!success) {
        setSpinning(false);
        setMessage(betError || 'Failed to place bet');
        return;
      }
    } else {
      setBonusSpins(prev => prev - 1);
    }

    try {
      // Animate spinning with neon effects
      let spins = 0;
      const spinInterval = setInterval(() => {
        setGrid(generateRandomGrid());
        spins++;
        if (spins >= 20) {
          clearInterval(spinInterval);
          generateFinalSpin();
        }
      }, 100);
    } catch (error) {
      console.error('Error during spin:', error);
      setMessage('An error occurred');
      setSpinning(false);
    }
  };

  const generateRandomGrid = () => {
    return Array(ROWS).fill(0).map(() => 
      Array(COLS).fill(0).map(() => {
        const symbols = Object.keys(SYMBOLS);
        return symbols[Math.floor(Math.random() * symbols.length)];
      })
    );
  };

  const generateFinalSpin = async () => {
    try {
      // Generate final grid
      const finalGrid = await generateVerifiedGrid();
      setGrid(finalGrid);

      // Calculate wins and check for features
      const { totalWin, newBonusSpins, newMultiplier } = calculateWinnings(finalGrid);
      
      if (totalWin > 0) {
        const finalWin = totalWin * multiplier;
        setWin(finalWin);
        await resolveBet(finalWin, true);
        setShowConfetti(true);
        setMessage(`You won ${formatCurrency(finalWin)}!`);

        // Apply bonus features
        if (newBonusSpins > 0) {
          setBonusSpins(prev => prev + newBonusSpins);
          setMessage(prev => `${prev} +${newBonusSpins} Bonus Spins!`);
        }
        if (newMultiplier > 1) {
          setMultiplier(newMultiplier);
        }
      }

      finishSpin();
    } catch (error) {
      console.error('Error generating final spin:', error);
      setMessage('An error occurred');
      finishSpin();
    }
  };

  const generateVerifiedGrid = async () => {
    const newGrid: string[][] = [];
    
    for (let i = 0; i < ROWS; i++) {
      const row: string[] = [];
      for (let j = 0; j < COLS; j++) {
        const totalWeight = Object.values(SYMBOLS).reduce((sum, s) => sum + s.weight, 0);
        const random = await generateNumber(1, totalWeight);
        const isValid = await verifyOutcome('slots', random, clientSeed);
        
        if (!isValid) {
          throw new Error('Invalid spin outcome');
        }

        let runningWeight = 0;
        let symbol = Object.keys(SYMBOLS)[0];

        for (const [sym, info] of Object.entries(SYMBOLS)) {
          runningWeight += info.weight;
          if (random <= runningWeight) {
            symbol = sym;
            break;
          }
        }
        row.push(symbol);
      }
      newGrid.push(row);
    }

    return newGrid;
  };

  const calculateWinnings = (currentGrid: string[][]) => {
    let totalWin = 0;
    let newBonusSpins = 0;
    let newMultiplier = multiplier;

    // Check each payline
    for (let row = 0; row < ROWS; row++) {
      let currentSymbol = currentGrid[row][0];
      let count = 1;

      for (let col = 1; col < COLS; col++) {
        if (currentGrid[row][col] === currentSymbol) {
          count++;
        } else {
          break;
        }
      }

      if (count >= 3) {
        const symbolInfo = SYMBOLS[currentSymbol as keyof typeof SYMBOLS];
        totalWin += bet * symbolInfo.payout * (count - 2);
      }
    }

    // Check for bonus features
    const allSymbols = currentGrid.flat();
    const laserGuns = allSymbols.filter(s => s === '🔫').length;
    const energy = allSymbols.filter(s => s === '⚡').length;
    
    if (laserGuns >= 3) {
      newBonusSpins = laserGuns * 2; // 2 bonus spins per laser gun
    }
    
    if (energy >= 3) {
      newMultiplier = Math.min(multiplier + energy - 2, 5); // Increase multiplier based on energy symbols
    }

    return { totalWin, newBonusSpins, newMultiplier };
  };

  const finishSpin = () => {
    setSpinning(false);
    setShowConfetti(false);
    if (win === 0) {
      setMessage('Try again!');
    }
    setTimeout(() => setMessage(''), 2000);
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-blue-900 via-purple-900 to-indigo-900 p-8">
      {showConfetti && <Confetti />}
      
      {/* Currency Selection & Balance */}
      <div className="mb-8 flex items-center justify-between gap-4 rounded-lg bg-black/30 p-4 text-white backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <Button
            variant={currencyType === 'regular' ? 'default' : 'secondary'}
            onClick={() => setCurrencyType('regular')}
            className="gap-2"
            disabled={spinning}
          >
            <Coins className="h-4 w-4" />
            ${formatCurrency(user?.regular_balance || 0)}
          </Button>
          <Button
            variant={currencyType === 'sweepstakes' ? 'default' : 'secondary'}
            onClick={() => setCurrencyType('sweepstakes')}
            className="gap-2"
            disabled={spinning}
          >
            <Trophy className="h-4 w-4" />
            ${formatCurrency(user?.sweeps_balance || 0)} SC
          </Button>
        </div>

        {/* Bet Controls */}
        <div className="flex items-center gap-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setBet(limits.minBet)}
            disabled={spinning || bet === limits.minBet}
          >
            Min
          </Button>
          
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={decrementBet}
              disabled={spinning || bet <= limits.minBet}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="min-w-[80px] text-center font-bold">
              ${formatCurrency(bet)}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={incrementBet}
              disabled={spinning || bet >= limits.maxBet}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setBet(limits.maxBet)}
            disabled={spinning || bet === limits.maxBet}
          >
            Max
          </Button>
        </div>
      </div>

      {/* Game Grid */}
      <div className="mb-8 overflow-hidden rounded-lg bg-black/30 p-8 backdrop-blur-sm">
        <div className="grid grid-cols-5 gap-2">
          {grid.map((row, i) =>
            row.map((symbol, j) => (
              <div
                key={`${i}-${j}`}
                className={`group relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg 
                  bg-black/50 text-4xl transition-all
                  ${spinning ? 'animate-pulse' : 'hover:scale-105'}`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 opacity-0 transition-opacity group-hover:opacity-100" />
                <span className="relative z-10">{symbol}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Controls & Info */}
      <div className="flex flex-col items-center gap-4">
        <Button
          size="lg"
          onClick={spin}
          disabled={spinning || !initialized || !user || (bonusSpins === 0 && (bet < limits.minBet || bet > limits.maxBet))}
          className="min-w-[200px] gap-2 bg-gradient-to-r from-blue-600 to-purple-600"
        >
          <RotateCw className={`h-5 w-5 ${spinning ? 'animate-spin' : ''}`} />
          {!initialized ? 'Initializing...' : 
           spinning ? 'Spinning...' : 
           bonusSpins > 0 ? `Bonus Spins: ${bonusSpins}` : 'Spin'}
        </Button>
        
        {multiplier > 1 && (
          <div className="flex items-center gap-2 rounded-full bg-blue-400 px-4 py-2 text-black">
            <Zap className="h-4 w-4" />
            <span className="font-bold">
              {multiplier}x Energy Multiplier
            </span>
          </div>
        )}
        
        {message && (
          <div className={`rounded-full px-6 py-2 text-lg font-bold
            ${message.includes('won') ? 'animate-bounce bg-yellow-400 text-black' : 'bg-white/10 text-white'}`}>
            {message}
          </div>
        )}
      </div>

      {/* Paytable */}
      <div className="mt-8 rounded-lg bg-black/30 p-4 text-white backdrop-blur-sm">
        <h3 className="mb-2 text-lg font-bold">Payouts</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {Object.entries(SYMBOLS).map(([symbol, info]) => (
            <div key={symbol} className="flex items-center justify-between gap-2 rounded bg-black/20 p-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{symbol}</span>
                <span className="text-sm text-gray-300">{info.name}</span>
              </div>
              <span className="font-bold text-blue-400">×{info.payout}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-2 text-sm text-gray-300">
          <p>🔫 3 or more Laser Guns award Bonus Spins</p>
          <p>⚡ 3 or more Energy symbols increase win multiplier</p>
        </div>
      </div>
    </div>
  );
};