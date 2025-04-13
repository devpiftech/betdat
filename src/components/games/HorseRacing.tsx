import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { Button } from '../ui/Button';
import { Coins, Users as Horse, Plus, Minus, Flag } from 'lucide-react';
import Confetti from 'react-confetti';
import { useBetting } from '../../hooks/useBetting';
import { useSecureRNG } from '../../hooks/useSecureRNG';
import { useFairness } from '../../hooks/useFairness';

const INITIAL_BET = 10;
const TRACK_LENGTH = 20;
const HORSES = [
  { id: 1, name: 'Thunder', odds: 2.5, emoji: '🐎' },
  { id: 2, name: 'Lightning', odds: 3.0, emoji: '🐎' },
  { id: 3, name: 'Storm', odds: 3.5, emoji: '🐎' },
  { id: 4, name: 'Blitz', odds: 4.0, emoji: '🐎' },
  { id: 5, name: 'Flash', odds: 4.5, emoji: '🐎' },
];

interface HorsePosition {
  id: number;
  position: number;
}

export const HorseRacing = () => {
  const { balance, updateBalance } = useStore();
  const [selectedHorse, setSelectedHorse] = useState<number | null>(null);
  const [positions, setPositions] = useState<HorsePosition[]>(
    HORSES.map(h => ({ id: h.id, position: 0 }))
  );
  const [racing, setRacing] = useState(false);
  const [bet, setBet] = useState(INITIAL_BET);
  const [message, setMessage] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());

  const { generateNumber, initialized } = useSecureRNG(sessionId);
  const { verifyOutcome, clientSeed } = useFairness(sessionId);
  const { placeBet, resolveBet } = useBetting(sessionId, 'horse-racing');

  const startRace = async () => {
    if (!initialized || racing || selectedHorse === null || balance < bet) return;

    const success = await placeBet(bet);
    if (!success) return;

    setRacing(true);
    setMessage('');

    // Simulate race
    const interval = setInterval(async () => {
      setPositions(prev => {
        const newPositions = [...prev];
        let someoneFinished = false;

        newPositions.forEach(horse => {
          if (horse.position < TRACK_LENGTH) {
            horse.position += Math.random() > 0.5 ? 1 : 0;
            if (horse.position >= TRACK_LENGTH) {
              someoneFinished = true;
            }
          }
        });

        if (someoneFinished) {
          clearInterval(interval);
          setTimeout(() => finishRace(), 1000);
        }

        return newPositions;
      });
    }, 100);
  };

  const finishRace = async () => {
    // Generate winning horse using RNG
    const winner = await generateNumber(1, HORSES.length);
    
    const isValid = await verifyOutcome('horse-racing', winner, clientSeed);
    if (!isValid) {
      setMessage('Error: Invalid race outcome');
      setRacing(false);
      return;
    }

    // Update final positions
    setPositions(prev =>
      prev.map(horse => ({
        ...horse,
        position: horse.id === winner ? TRACK_LENGTH : Math.min(horse.position, TRACK_LENGTH - 1)
      }))
    );

    // Handle winnings
    if (winner === selectedHorse) {
      const winningHorse = HORSES.find(h => h.id === winner);
      if (winningHorse) {
        const winnings = Math.floor(bet * winningHorse.odds);
        await resolveBet(winnings, true);
        updateBalance(winnings);
        setMessage(`You won $${winnings}!`);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
    } else {
      setMessage(`${HORSES.find(h => h.id === winner)?.name} wins! Better luck next time!`);
    }

    setRacing(false);
    setSelectedHorse(null);
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
              disabled={racing}
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
              disabled={racing}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-8 w-full max-w-4xl">
        {/* Race Track */}
        <div className="mb-8 space-y-4">
          {HORSES.map(horse => (
            <div key={horse.id} className="relative">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium text-white">{horse.name}</span>
                <span className="text-sm text-white">Odds: {horse.odds}x</span>
              </div>
              <div className="h-8 rounded-full bg-white/10 backdrop-blur-sm">
                <div
                  className={`h-full rounded-full transition-all duration-100
                    ${horse.id === selectedHorse ? 'bg-blue-500' : 'bg-green-500'}
                    ${racing ? 'animate-pulse' : ''}`}
                  style={{
                    width: `${(positions.find(p => p.id === horse.id)?.position || 0) * (100 / TRACK_LENGTH)}%`
                  }}
                >
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-2xl">
                    {horse.emoji}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Horse Selection */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {HORSES.map(horse => (
            <Button
              key={horse.id}
              onClick={() => setSelectedHorse(horse.id)}
              disabled={racing}
              variant={selectedHorse === horse.id ? 'default' : 'secondary'}
              className="h-auto flex-col gap-2 p-4"
            >
              <Horse className="h-6 w-6" />
              <span className="text-lg font-bold">{horse.name}</span>
              <span className="text-sm">Odds: {horse.odds}x</span>
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <Button
          size="lg"
          onClick={startRace}
          disabled={racing || selectedHorse === null || balance < bet || !initialized}
          className="min-w-[200px] gap-2"
        >
          <Flag className={`h-5 w-5 ${racing ? 'animate-spin' : ''}`} />
          {!initialized ? 'Initializing...' : racing ? 'Racing...' : 'Start Race'}
        </Button>
        
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