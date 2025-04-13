import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { Button } from '../ui/Button';
import { Ticket, Timer, Users, Trophy, Coins } from 'lucide-react';
import Confetti from 'react-confetti';
import { useSecureRNG } from '../../hooks/useSecureRNG';
import { useBetting } from '../../hooks/useBetting';
import { useFairness } from '../../hooks/useFairness';

const TICKET_PRICE = 10;

interface RaffleDraw {
  id: string;
  prize: number;
  endTime: Date;
  totalTickets: number;
  soldTickets: number;
}

export const Raffle = () => {
  const { balance, updateBalance } = useStore();
  const [activeDraws, setActiveDraws] = useState<RaffleDraw[]>([
    {
      id: '1',
      prize: 1000,
      endTime: new Date(Date.now() + 3600000), // 1 hour from now
      totalTickets: 100,
      soldTickets: 45
    },
    {
      id: '2',
      prize: 5000,
      endTime: new Date(Date.now() + 7200000), // 2 hours from now
      totalTickets: 200,
      soldTickets: 120
    }
  ]);
  const [selectedDraw, setSelectedDraw] = useState<RaffleDraw | null>(null);
  const [ticketCount, setTicketCount] = useState(1);
  const [purchasing, setPurchasing] = useState(false);
  const [message, setMessage] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());

  const { generateNumber, initialized } = useSecureRNG(sessionId);
  const { placeBet, resolveBet } = useBetting(sessionId, 'raffle');
  const { verifyOutcome, clientSeed } = useFairness(sessionId);

  const purchaseTickets = async () => {
    if (!initialized || purchasing || !selectedDraw) return;

    const totalCost = ticketCount * TICKET_PRICE;
    if (balance < totalCost) return;

    setPurchasing(true);
    const success = await placeBet(totalCost);
    if (!success) {
      setPurchasing(false);
      return;
    }

    try {
      // Generate ticket numbers
      const tickets = [];
      for (let i = 0; i < ticketCount; i++) {
        const number = await generateNumber(1, selectedDraw.totalTickets);
        const isValid = await verifyOutcome('raffle', number, clientSeed);
        if (!isValid) throw new Error('Invalid ticket generation');
        tickets.push(number);
      }

      // Update draw state
      setActiveDraws(draws => 
        draws.map(draw => 
          draw.id === selectedDraw.id
            ? { ...draw, soldTickets: draw.soldTickets + ticketCount }
            : draw
        )
      );

      setMessage(`Successfully purchased ${ticketCount} ticket${ticketCount > 1 ? 's' : ''}!`);
      updateBalance(-totalCost);
    } catch (error) {
      console.error('Error purchasing tickets:', error);
      setMessage('Failed to purchase tickets');
      await resolveBet(totalCost, false);
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-indigo-900 to-purple-900 p-8">
      {showConfetti && <Confetti />}
      
      <div className="mb-8 flex items-center justify-between gap-4 rounded-lg bg-white/10 p-4 text-white backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Coins className="h-6 w-6 text-yellow-400" />
          <span className="text-xl font-bold">${balance}</span>
        </div>
      </div>

      <div className="w-full max-w-4xl">
        <h1 className="mb-8 text-center text-3xl font-bold text-white">
          Active Raffles
        </h1>

        <div className="grid gap-6 md:grid-cols-2">
          {activeDraws.map(draw => (
            <div
              key={draw.id}
              className={`relative overflow-hidden rounded-lg bg-white/10 p-6 backdrop-blur-sm
                ${selectedDraw?.id === draw.id ? 'ring-2 ring-blue-500' : ''}`}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="h-6 w-6 text-yellow-400" />
                  <span className="text-2xl font-bold text-white">
                    ${draw.prize}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <Timer className="h-4 w-4" />
                  <span>
                    Ends in {Math.ceil((draw.endTime.getTime() - Date.now()) / 3600000)}h
                  </span>
                </div>
              </div>

              <div className="mb-4 space-y-2">
                <div className="flex items-center justify-between text-gray-300">
                  <span>Tickets Sold:</span>
                  <span>{draw.soldTickets}/{draw.totalTickets}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-700">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{ width: `${(draw.soldTickets / draw.totalTickets) * 100}%` }}
                  />
                </div>
              </div>

              <Button
                className="w-full"
                variant={selectedDraw?.id === draw.id ? 'default' : 'secondary'}
                onClick={() => setSelectedDraw(draw)}
              >
                Select Raffle
              </Button>
            </div>
          ))}
        </div>

        {selectedDraw && (
          <div className="mt-8 rounded-lg bg-white/10 p-6 backdrop-blur-sm">
            <h2 className="mb-4 text-xl font-bold text-white">
              Purchase Tickets
            </h2>

            <div className="mb-6 flex items-center gap-4">
              <Button
                variant="secondary"
                onClick={() => setTicketCount(Math.max(1, ticketCount - 1))}
                disabled={purchasing}
              >
                -
              </Button>
              <div className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-yellow-400" />
                <span className="text-lg font-bold text-white">
                  {ticketCount} Ticket{ticketCount > 1 ? 's' : ''}
                </span>
              </div>
              <Button
                variant="secondary"
                onClick={() => setTicketCount(ticketCount + 1)}
                disabled={purchasing}
              >
                +
              </Button>
            </div>

            <div className="mb-6 rounded-lg bg-black/20 p-4">
              <div className="flex items-center justify-between text-gray-300">
                <span>Cost per ticket:</span>
                <span>${TICKET_PRICE}</span>
              </div>
              <div className="mt-2 flex items-center justify-between font-bold text-white">
                <span>Total cost:</span>
                <span>${ticketCount * TICKET_PRICE}</span>
              </div>
            </div>

            <Button
              className="w-full gap-2"
              onClick={purchaseTickets}
              disabled={purchasing || balance < (ticketCount * TICKET_PRICE) || !initialized}
            >
              <Ticket className="h-5 w-5" />
              {purchasing ? 'Purchasing...' : 'Purchase Tickets'}
            </Button>

            {message && (
              <div className="mt-4 text-center font-medium text-white">
                {message}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};