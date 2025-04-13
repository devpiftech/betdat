import { useState, useEffect } from 'react';
import { useStore } from '../../../store/useStore';
import { Button } from '../../ui/Button';
import { ArrowLeft, Coins } from 'lucide-react';
import { socket } from '../../../lib/socket';

interface Props {
  tableId: string;
  onLeave: () => void;
}

interface Player {
  id: string;
  username: string;
  chips: number;
  cards: string[];
  position: number;
  isActive: boolean;
  isTurn: boolean;
}

interface TableState {
  id: string;
  pot: number;
  currentBet: number;
  communityCards: string[];
  players: Player[];
  phase: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
}

export const PokerTable = ({ tableId, onLeave }: Props) => {
  const { user } = useStore();
  const [tableState, setTableState] = useState<TableState | null>(null);
  const [currentBet, setCurrentBet] = useState(0);

  useEffect(() => {
    socket.emit('poker:getTableState', tableId);

    socket.on('poker:tableState', (state) => {
      setTableState(state);
    });

    socket.on('poker:gameAction', ({ type, data }) => {
      switch (type) {
        case 'bet':
          setTableState((prev) => prev ? {
            ...prev,
            pot: prev.pot + data.amount,
            currentBet: data.amount,
            players: prev.players.map(p =>
              p.id === data.playerId ? { ...p, chips: p.chips - data.amount } : p
            )
          } : null);
          break;
        case 'fold':
          setTableState((prev) => prev ? {
            ...prev,
            players: prev.players.map(p =>
              p.id === data.playerId ? { ...p, isActive: false } : p
            )
          } : null);
          break;
        // Add more game actions
      }
    });

    return () => {
      socket.off('poker:tableState');
      socket.off('poker:gameAction');
    };
  }, [tableId]);

  const handleAction = (action: 'check' | 'bet' | 'fold') => {
    if (!user || !tableState) return;

    socket.emit('poker:action', {
      tableId,
      playerId: user.id,
      action,
      amount: action === 'bet' ? currentBet : 0
    });
  };

  if (!tableState) {
    return <div>Loading table...</div>;
  }

  const currentPlayer = tableState.players.find(p => p.id === user?.id);
  const isPlayerTurn = currentPlayer?.isTurn;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 to-emerald-900 p-8">
      <div className="mb-8 flex items-center space-x-4">
        <Button variant="ghost" onClick={onLeave}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Leave Table
        </Button>
        <div className="flex items-center space-x-2 rounded-full bg-white/10 px-4 py-2 text-white">
          <Coins className="h-4 w-4 text-yellow-400" />
          <span>Pot: ${tableState.pot}</span>
        </div>
      </div>

      <div className="relative mx-auto aspect-[16/9] max-w-6xl rounded-[200px] bg-green-800 p-16 shadow-2xl">
        {/* Community Cards */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="flex gap-2">
            {tableState.communityCards.map((card, i) => (
              <div key={i} className="h-24 w-16 rounded-lg bg-white shadow-lg">
                {card}
              </div>
            ))}
          </div>
        </div>

        {/* Players */}
        {tableState.players.map((player, i) => {
          const angle = (i * (360 / tableState.players.length)) * (Math.PI / 180);
          const radius = 250;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;

          return (
            <div
              key={player.id}
              className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform ${
                player.isActive ? '' : 'opacity-50'
              }`}
              style={{
                transform: `translate(${x}px, ${y}px)`,
              }}
            >
              <div className="flex flex-col items-center">
                <div className="mb-2 rounded-full bg-white/10 px-3 py-1 text-sm text-white">
                  {player.username}
                  {player.isTurn && ' (Acting)'}
                </div>
                <div className="flex gap-2">
                  {player.cards.map((card, j) => (
                    <div key={j} className="h-20 w-14 rounded-lg bg-white shadow-lg">
                      {player.id === user?.id || tableState.phase === 'showdown'
                        ? card
                        : '🂠'}
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex items-center space-x-1 text-sm text-white">
                  <Coins className="h-3 w-3 text-yellow-400" />
                  <span>${player.chips}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      {isPlayerTurn && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2">
          <div className="flex items-center space-x-4 rounded-lg bg-white p-4 shadow-lg">
            <Button
              variant="secondary"
              onClick={() => handleAction('fold')}
            >
              Fold
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleAction('check')}
              disabled={tableState.currentBet > 0}
            >
              Check
            </Button>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={currentBet}
                onChange={(e) => setCurrentBet(Math.max(0, parseInt(e.target.value)))}
                className="w-24 rounded-lg border px-3 py-2"
                min={tableState.currentBet}
                max={currentPlayer?.chips || 0}
              />
              <Button
                onClick={() => handleAction('bet')}
                disabled={currentBet < tableState.currentBet}
              >
                {tableState.currentBet > 0 ? 'Call/Raise' : 'Bet'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};