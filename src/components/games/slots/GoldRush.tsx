import { useState, useEffect } from 'react';
import { useStore } from '../../../store/useStore';
import { Button } from '../../ui/Button';
import { Coins, RotateCw, Plus, Minus, Trophy, Zap } from 'lucide-react';
import Confetti from 'react-confetti';
import { useSecureRNG } from '../../../hooks/useSecureRNG';
import { useBetting } from '../../../hooks/useBetting';
import { useFairness } from '../../../hooks/useFairness';
import { formatCurrency } from '../../../lib/supabase';

// Mining-themed symbols with cascading mechanics
const SYMBOLS = {
  '💎': { weight: 1, payout: 50, name: 'Diamond' },
  '🪙': { weight: 2, payout: 25, name: 'Gold Coin' },
  '⛏️': { weight: 3, payout: 20, name: 'Pickaxe' },
  '🧨': { weight: 4, payout: 15, name: 'Dynamite' },
  '🪨': { weight: 5, payout: 10, name: 'Rock' },
  '⚒️': { weight: 6, payout: 5, name: 'Tools' }
} as const;

const ROWS = 3;
const COLS = 5;

export const GoldRush = () => {
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
  } = useBetting(sessionId, 'gold-rush', currencyType);

  // Game state
  const [grid, setGrid] = useState<string[][]>(Array(ROWS).fill(Array(COLS).fill('💎')));
  const [spinning, setSpinning] = useState(false);
  const [win, setWin] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [cascadeLevel, setCascadeLevel] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [message, setMessage] = useState('');
  const [maxBet, setMaxBet] = useState(false);

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
    setCascadeLevel(0);
    setMultiplier(1);

    const success = await placeBet(bet);
    if (!success) {
      setSpinning(false);
      setMessage(betError || 'Failed to place bet');
      return;
    }

    try {
      // Animate spinning
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

      // Calculate wins
      const { wins, matches } = calculateWins(finalGrid);
      
      if (wins > 0) {
        const finalWin = wins * multiplier;
        setWin(prev => prev + finalWin);
        await resolveBet(finalWin, true);
        setShowConfetti(true);
        setMessage(`You won ${formatCurrency(finalWin)}!`);

        // Handle cascading if matches found
        if (matches.length > 0) {
          setTimeout(() => handleCascade(finalGrid, matches), 1000);
        } else {
          finishSpin();
        }
      } else {
        finishSpin();
      }
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

  const handleCascade = async (currentGrid: string[][], matches: number[][]) => {
    // Remove matching symbols and cascade
    const newGrid = cascadeSymbols(currentGrid, matches);
    setCascadeLevel(prev => prev + 1);
    setMultiplier(prev => Math.min(prev + 0.5, 5));
    setGrid(newGrid);
    
    // Check for new wins after cascade
    const { wins, matches: newMatches } = calculateWins(newGrid);
    
    if (wins > 0) {
      const cascadeWin = wins * multiplier;
      setWin(prev => prev + cascadeWin);
      await resolveBet(cascadeWin, true);
      setMessage(`Cascade Win: ${formatCurrency(cascadeWin)}!`);

      if (newMatches.length > 0) {
        setTimeout(() => handleCascade(newGrid, newMatches), 1000);
      } else {
        finishSpin();
      }
    } else {
      finishSpin();
    }
  };

  const cascadeSymbols = (currentGrid: string[][], matches: number[][]): string[][] => {
    const newGrid = currentGrid.map(row => [...row]);
    
    // Remove matches and shift symbols down
    matches.forEach(match => {
      match.forEach(([row, col]) => {
        // Shift symbols down
        for (let r = row; r > 0; r--) {
          newGrid[r][col] = newGrid[r-1][col];
        }
        // Add new symbol at top
        newGrid[0][col] = generateNewSymbol();
      });
    });

    return newGrid;
  };

  const generateNewSymbol = (): string => {
    const symbols = Object.keys(SYMBOLS);
    return symbols[Math.floor(Math.random() * symbols.length)];
  };

  const calculateWins = (currentGrid: string[][]) => {
    let totalWin = 0;
    const matches: number[][] = [];

    // Check each payline
    for (let row = 0; row < ROWS; row++) {
      let currentSymbol = currentGrid[row][0];
      let count = 1;
      let lineMatches = [[row, 0]];

      for (let col = 1; col < COLS; col++) {
        if (currentGrid[row][col] === currentSymbol) {
          count++;
          lineMatches.push([row, col]);
        } else {
          break;
        }
      }

      if (count >= 3) {
        const symbolInfo = SYMBOLS[currentSymbol as keyof typeof SYMBOLS];
        totalWin += bet * symbolInfo.payout * (count - 2);
        matches.push(lineMatches);
      }
    }

    return { wins: totalWin, matches };
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
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-yellow-900 via-amber-800 to-orange-900 p-8">
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
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 to-amber-500/20 opacity-0 transition-opacity group-hover:opacity-100" />
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
          disabled={spinning || !initialized || !user || bet < limits.minBet || bet > limits.maxBet}
          className="min-w-[200px] gap-2 bg-gradient-to-r from-yellow-600 to-amber-600"
        >
          <RotateCw className={`h-5 w-5 ${spinning ? 'animate-spin' : ''}`} />
          {!initialized ? 'Initializing...' : 
           spinning ? 'Mining...' : 'Spin'}
        </Button>
        
        {multiplier > 1 && (
          <div className="flex items-center gap-2 rounded-full bg-yellow-400 px-4 py-2 text-black">
            <Zap className="h-4 w-4" />
            <span className="font-bold">
              {multiplier}x Multiplier (Cascade {cascadeLevel})
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
              <span className="font-bold text-yellow-400">×{info.payout}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};