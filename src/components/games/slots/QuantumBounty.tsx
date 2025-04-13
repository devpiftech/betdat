import { useState, useEffect } from 'react';
import { useStore } from '../../../store/useStore';
import { Button } from '../../ui/Button';
import { Coins, RotateCw, Plus, Minus, Atom, Zap, Infinity } from 'lucide-react';
import Confetti from 'react-confetti';
import { useSecureRNG } from '../../../hooks/useSecureRNG';
import { useBetting } from '../../../hooks/useBetting';
import { useFairness } from '../../../hooks/useFairness';

// Quantum-western themed symbols
const SYMBOLS = {
  '🤠': { weight: 1, payout: 50, name: 'Quantum Cowboy' },
  '⚛️': { weight: 2, payout: 25, name: 'Atom' },
  '🌌': { weight: 3, payout: 20, name: 'Quantum Realm' },
  '🎯': { weight: 4, payout: 15, name: 'Target' },
  '💫': { weight: 5, payout: 10, name: 'Entanglement' },
  '🔮': { weight: 6, payout: 5, name: 'Probability' }
} as const;

const ROWS = 3;
const COLS = 5;
const INITIAL_BET = 10;

// Quantum-inspired paylines
const PAYLINES = [
  // Standard lines
  [[0,0], [0,1], [0,2], [0,3], [0,4]],
  [[1,0], [1,1], [1,2], [1,3], [1,4]],
  [[2,0], [2,1], [2,2], [2,3], [2,4]],
  // Quantum tunneling patterns
  [[0,0], [2,1], [0,2], [2,3], [0,4]],
  [[2,0], [0,1], [2,2], [0,3], [2,4]],
  // Entanglement patterns
  [[0,0], [1,0], [2,0], [1,1], [0,2]],
  [[2,0], [1,0], [0,0], [1,1], [2,2]]
];

export const QuantumBounty = () => {
  const { balance, updateBalance } = useStore();
  const [reels, setReels] = useState<string[][]>(Array(ROWS).fill(Array(COLS).fill('⚛️')));
  const [spinning, setSpinning] = useState(false);
  const [bet, setBet] = useState(INITIAL_BET);
  const [win, setWin] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [activeLines, setActiveLines] = useState(3);
  const [quantumState, setQuantumState] = useState<'normal' | 'superposition' | 'entangled'>('normal');
  const [parallelWins, setParallelWins] = useState<number[]>([]);
  const [sessionId] = useState(() => crypto.randomUUID());

  const { generateNumber, initialized } = useSecureRNG(sessionId);
  const { placeBet, resolveBet } = useBetting(sessionId, 'quantum-bounty');
  const { verifyOutcome, clientSeed } = useFairness(sessionId);

  const spin = async () => {
    if (!initialized || spinning || balance < getTotalBet()) return;
    
    setSpinning(true);
    const success = await placeBet(getTotalBet());
    if (!success) {
      setSpinning(false);
      return;
    }
    
    updateBalance(-getTotalBet());
    setWin(0);
    setParallelWins([]);
    setQuantumState('normal');

    // Animate spinning with quantum effects
    const spinDuration = 2000;
    const intervals = 100;
    let spins = 0;
    
    const spinInterval = setInterval(() => {
      setReels(Array(ROWS).fill(0).map(() => 
        Array(COLS).fill(0).map(() => 
          Object.keys(SYMBOLS)[Math.floor(Math.random() * Object.keys(SYMBOLS).length)]
        )
      ));
      
      // Random quantum state changes during spin
      if (Math.random() < 0.3) {
        setQuantumState(Math.random() < 0.5 ? 'superposition' : 'entangled');
      }
      
      spins += intervals;
      if (spins >= spinDuration) {
        clearInterval(spinInterval);
        finalizeSpinResult();
      }
    }, intervals);
  };

  const finalizeSpinResult = async () => {
    try {
      const finalReels = await generateFinalReels();
      const outcome = await verifyOutcome('slots', finalReels, clientSeed);
      
      if (!outcome) {
        throw new Error('Invalid game outcome');
      }

      setReels(finalReels);
      
      // Check for quantum bonus features
      const { totalWin, quantumState: newState, parallelUniverseWins } = 
        calculateQuantumWinnings(finalReels);
      
      if (totalWin > 0 || parallelUniverseWins.length > 0) {
        handleWin(totalWin, newState, parallelUniverseWins);
      } else {
        setSpinning(false);
        setQuantumState('normal');
      }
    } catch (error) {
      console.error('Error finalizing spin:', error);
      setSpinning(false);
    }
  };

  const handleWin = async (
    totalWin: number,
    newState: 'normal' | 'superposition' | 'entangled',
    parallelWins: number[]
  ) => {
    setQuantumState(newState);
    setParallelWins(parallelWins);

    // Apply quantum multipliers
    const multiplier = newState === 'superposition' ? 2 : 
                      newState === 'entangled' ? 3 : 1;
    
    const finalWin = totalWin * multiplier;
    setWin(finalWin);
    
    // Add parallel universe wins
    const totalParallelWins = parallelWins.reduce((sum, win) => sum + win, 0);
    
    const grandTotal = finalWin + totalParallelWins;
    await resolveBet(grandTotal, true);
    updateBalance(grandTotal);
    
    setShowConfetti(true);
    setTimeout(() => {
      setShowConfetti(false);
      setSpinning(false);
      setQuantumState('normal');
    }, 3000);
  };

  const generateFinalReels = async () => {
    const finalReels: string[][] = [];
    for (let i = 0; i < ROWS; i++) {
      const row: string[] = [];
      for (let j = 0; j < COLS; j++) {
        const totalWeight = Object.values(SYMBOLS).reduce((sum, s) => sum + s.weight, 0);
        let random = await generateNumber(1, totalWeight);
        let symbol = Object.keys(SYMBOLS)[0];
        
        for (const [sym, info] of Object.entries(SYMBOLS)) {
          random -= info.weight;
          if (random <= 0) {
            symbol = sym;
            break;
          }
        }
        row.push(symbol);
      }
      finalReels.push(row);
    }
    return finalReels;
  };

  const calculateQuantumWinnings = (currentReels: string[][]) => {
    let totalWin = 0;
    let newState: 'normal' | 'superposition' | 'entangled' = 'normal';
    const parallelUniverseWins: number[] = [];

    // Check active paylines
    const activePaylines = PAYLINES.slice(0, activeLines);
    activePaylines.forEach(line => {
      const symbols = line.map(([row, col]) => currentReels[row][col]);
      const firstSymbol = symbols[0];
      
      let matchingCount = 1;
      for (let i = 1; i < symbols.length; i++) {
        if (symbols[i] === firstSymbol) {
          matchingCount++;
        } else {
          break;
        }
      }

      if (matchingCount >= 3) {
        const symbolInfo = SYMBOLS[firstSymbol as keyof typeof SYMBOLS];
        totalWin += bet * symbolInfo.payout * (matchingCount - 2);
      }
    });

    // Check for quantum features
    const allSymbols = currentReels.flat();
    const atomCount = allSymbols.filter(s => s === '⚛️').length;
    const realmCount = allSymbols.filter(s => s === '🌌').length;
    
    if (atomCount >= 3) {
      newState = 'superposition';
      // Generate parallel universe wins
      for (let i = 0; i < atomCount - 2; i++) {
        parallelUniverseWins.push(Math.floor(totalWin * Math.random()));
      }
    }
    
    if (realmCount >= 3) {
      newState = 'entangled';
      // Entangled wins are synchronized
      const entangledWin = Math.floor(totalWin * 0.5);
      parallelUniverseWins.push(entangledWin, entangledWin);
    }

    return { totalWin, quantumState: newState, parallelUniverseWins };
  };

  const getTotalBet = () => bet * activeLines;

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-indigo-900 via-purple-900 to-blue-900 p-8">
      {showConfetti && <Confetti />}
      
      <div className="mb-8 flex items-center justify-between gap-4 rounded-lg bg-black/30 p-4 text-white backdrop-blur-sm">
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
              disabled={spinning}
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
              disabled={spinning}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-8 overflow-hidden rounded-lg bg-black/30 p-8 backdrop-blur-sm">
        <div className="grid grid-cols-5 gap-2">
          {reels.map((row, i) =>
            row.map((symbol, j) => (
              <div
                key={`${i}-${j}`}
                className={`group relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg 
                  ${quantumState === 'superposition' 
                    ? 'animate-pulse bg-indigo-900/80' 
                    : quantumState === 'entangled'
                    ? 'animate-pulse bg-purple-900/80'
                    : 'bg-black/80'} 
                  text-4xl transition-transform hover:scale-105`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 opacity-0 transition-opacity group-hover:opacity-100" />
                <span className={`relative z-10 ${
                  quantumState === 'superposition' ? 'animate-bounce' :
                  quantumState === 'entangled' ? 'animate-spin' : ''
                }`}>{symbol}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mb-4 flex gap-4">
        <Button
          variant="secondary"
          onClick={() => setActiveLines(Math.max(1, activeLines - 1))}
          disabled={spinning}
        >
          Lines: {activeLines}
        </Button>
      </div>

      <div className="flex flex-col items-center gap-4">
        <Button
          size="lg"
          onClick={spin}
          disabled={spinning || balance < getTotalBet() || !initialized}
          className="min-w-[200px] gap-2 bg-gradient-to-r from-indigo-600 to-purple-600"
        >
          {spinning ? (
            <Atom className="h-5 w-5 animate-spin" />
          ) : (
            <RotateCw className="h-5 w-5" />
          )}
          {!initialized ? 'Initializing...' : 
           spinning ? 'Quantum Spin...' : 'Spin'}
        </Button>
        
        {quantumState !== 'normal' && (
          <div className="flex items-center gap-2 rounded-full bg-indigo-400 px-4 py-2 text-black">
            {quantumState === 'superposition' ? (
              <>
                <Infinity className="h-4 w-4" />
                <span className="font-bold">Superposition Mode</span>
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                <span className="font-bold">Quantum Entanglement</span>
              </>
            )}
          </div>
        )}
        
        {win > 0 && (
          <div className="animate-bounce rounded-full bg-yellow-400 px-6 py-2 text-lg font-bold text-black">
            You won ${win}!
          </div>
        )}

        {parallelWins.length > 0 && (
          <div className="space-y-2">
            {parallelWins.map((parallelWin, index) => (
              <div
                key={index}
                className="rounded-full bg-purple-400 px-6 py-2 text-sm font-bold text-black"
              >
                Parallel Universe Win: ${parallelWin}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 rounded-lg bg-black/30 p-4 text-white backdrop-blur-sm">
        <h3 className="mb-2 text-lg font-bold">Quantum Payouts</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Object.entries(SYMBOLS).map(([symbol, info]) => (
            <div key={symbol} className="flex items-center gap-2">
              <span className="text-2xl">{symbol}</span>
              <span>×{info.payout}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};