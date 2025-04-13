import { useState, useEffect } from 'react';
import { useStore } from '../../../store/useStore';
import { Button } from '../../ui/Button';
import { Coins, RotateCw, Plus, Minus, Trophy, Gauge, Cog } from 'lucide-react';
import Confetti from 'react-confetti';
import { useSecureRNG } from '../../../hooks/useSecureRNG';
import { useBetting } from '../../../hooks/useBetting';
import { useFairness } from '../../../hooks/useFairness';
import { formatCurrency } from '../../../lib/supabase';

// Steampunk-themed symbols
const SYMBOLS = {
  '⚙️': { weight: 1, payout: 50, name: 'Gear' },
  '🔧': { weight: 2, payout: 25, name: 'Wrench' },
  '⚡': { weight: 3, payout: 20, name: 'Steam Power' },
  '🎭': { weight: 4, payout: 15, name: 'Mask' },
  '🗝️': { weight: 5, payout: 10, name: 'Key' },
  '🧭': { weight: 6, payout: 5, name: 'Compass' }
} as const;

const ROWS = 3;
const COLS = 5;

// Define paylines for steampunk theme
const PAYLINES = [
  // Horizontal lines
  [[0,0], [0,1], [0,2], [0,3], [0,4]], // Top row
  [[1,0], [1,1], [1,2], [1,3], [1,4]], // Middle row
  [[2,0], [2,1], [2,2], [2,3], [2,4]], // Bottom row
  
  // Gear patterns (V-shapes)
  [[0,0], [1,1], [2,2], [1,3], [0,4]], // V-shape down then up
  [[2,0], [1,1], [0,2], [1,3], [2,4]], // V-shape up then down
  
  // Steam pipe patterns (zigzag)
  [[0,0], [1,1], [1,2], [1,3], [2,4]], // Zigzag down
  [[2,0], [1,1], [1,2], [1,3], [0,4]], // Zigzag up
  
  // Mechanical patterns
  [[0,0], [0,1], [1,2], [2,3], [2,4]], // Diagonal down
  [[2,0], [2,1], [1,2], [0,3], [0,4]], // Diagonal up
  [[1,0], [0,1], [1,2], [2,3], [1,4]]  // Wave pattern
];

export const SteamPunk = () => {
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
  } = useBetting(sessionId, 'steampunk', currencyType);

  // Game state
  const [grid, setGrid] = useState<string[][]>(Array(ROWS).fill(Array(COLS).fill('⚙️')));
  const [spinning, setSpinning] = useState(false);
  const [win, setWin] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [gearRatio, setGearRatio] = useState(1);
  const [steamPressure, setSteamPressure] = useState(0);
  const [message, setMessage] = useState('');
  const [activePaylines, setActivePaylines] = useState<number[]>([]);

  // Steam pressure builds up over time
  useEffect(() => {
    if (!spinning) {
      const interval = setInterval(() => {
        setSteamPressure(prev => Math.min(prev + 1, 100));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [spinning]);

  // Initialize fairness
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
    setActivePaylines([]);

    const success = await placeBet(bet);
    if (!success) {
      setSpinning(false);
      setMessage(betError || 'Failed to place bet');
      return;
    }

    try {
      // Animate spinning with mechanical effects
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
      const { totalWin, winningLines, newGearRatio } = calculateWinnings(finalGrid);
      
      if (totalWin > 0) {
        // Apply steam pressure bonus if available
        const pressureBonus = steamPressure >= 100 ? 2 : 1;
        const finalWin = totalWin * gearRatio * pressureBonus;
        
        setWin(finalWin);
        await resolveBet(finalWin, true);
        setShowConfetti(true);
        setMessage(`You won ${formatCurrency(finalWin)}!`);
        
        // Show winning paylines
        setActivePaylines(winningLines);

        // Update gear ratio and steam pressure
        setGearRatio(newGearRatio);
        if (pressureBonus > 1) {
          setSteamPressure(0);
          setMessage(prev => `${prev} Steam Power Bonus!`);
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
    let newGearRatio = gearRatio;
    const winningLines: number[] = [];

    // Check each payline
    PAYLINES.forEach((payline, index) => {
      const symbols = payline.map(([row, col]) => currentGrid[row][col]);
      const firstSymbol = symbols[0];
      let count = 1;

      for (let i = 1; i < symbols.length; i++) {
        if (symbols[i] === firstSymbol) {
          count++;
        } else {
          break;
        }
      }

      if (count >= 3) {
        const symbolInfo = SYMBOLS[firstSymbol as keyof typeof SYMBOLS];
        const lineWin = bet * symbolInfo.payout * (count - 2);
        totalWin += lineWin;
        winningLines.push(index);
      }
    });

    // Check for gear symbols to increase ratio
    const gearCount = currentGrid.flat().filter(s => s === '⚙️').length;
    if (gearCount >= 3) {
      newGearRatio = Math.min(gearRatio + 0.5, 3);
    }

    return { totalWin, winningLines, newGearRatio };
  };

  const finishSpin = () => {
    setSpinning(false);
    setShowConfetti(false);
    if (win === 0) {
      setMessage('Try again!');
    }
    setTimeout(() => {
      setMessage('');
      setActivePaylines([]);
    }, 2000);
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-amber-900 via-orange-800 to-red-900 p-8">
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

      {/* Steam Pressure Gauge */}
      <div className="mb-4 flex items-center gap-4 rounded-lg bg-black/30 p-4 text-white backdrop-blur-sm">
        <Gauge className="h-6 w-6 text-amber-400" />
        <div className="h-4 w-48 overflow-hidden rounded-full bg-gray-700">
          <div
            className="h-full bg-gradient-to-r from-yellow-500 to-red-500 transition-all duration-1000"
            style={{ width: `${steamPressure}%` }}
          />
        </div>
        <span className="font-bold">{Math.floor(steamPressure)}%</span>
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
                  ${spinning ? 'animate-spin' : 'hover:scale-105'}
                  ${activePaylines.some(line => 
                    PAYLINES[line].some(([r, c]) => r === i && c === j)
                  ) ? 'ring-2 ring-yellow-400' : ''}`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-red-500/20 opacity-0 transition-opacity group-hover:opacity-100" />
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
          className="min-w-[200px] gap-2 bg-gradient-to-r from-amber-600 to-red-600"
        >
          <RotateCw className={`h-5 w-5 ${spinning ? 'animate-spin' : ''}`} />
          {!initialized ? 'Initializing...' : spinning ? 'Spinning...' : 'Spin'}
        </Button>
        
        {gearRatio > 1 && (
          <div className="flex items-center gap-2 rounded-full bg-amber-400 px-4 py-2 text-black">
            <Cog className="h-4 w-4" />
            <span className="font-bold">
              {gearRatio.toFixed(1)}x Gear Ratio
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
              <span className="font-bold text-amber-400">×{info.payout}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-2 text-sm text-gray-300">
          <p>⚙️ 3 or more Gears increase win multiplier</p>
          <p>🔧 Full Steam Pressure doubles wins</p>
        </div>
      </div>
    </div>
  );
};