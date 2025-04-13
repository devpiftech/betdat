import { useState, useEffect } from 'react';
import { useStore } from '../../../store/useStore';
import { Button } from '../../ui/Button';
import { Users, Plus, ChevronRight, Coins } from 'lucide-react';
import { socket } from '../../../lib/socket';
import { PokerTable } from './PokerTable';

interface PokerTableInfo {
  id: string;
  name: string;
  maxPlayers: number;
  currentPlayers: number;
  minBet: number;
  maxBet: number;
  players: any[];
}

export const PokerRoom = () => {
  const { user } = useStore();
  const [tables, setTables] = useState<PokerTableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    socket.emit('poker:getTables');

    socket.on('poker:tables', (tables) => {
      setTables(tables);
      setLoading(false);
    });

    socket.on('poker:tableUpdated', (updatedTable) => {
      setTables((prev) =>
        prev.map((table) =>
          table.id === updatedTable.id ? updatedTable : table
        )
      );
    });

    return () => {
      socket.off('poker:tables');
      socket.off('poker:tableUpdated');
    };
  }, []);

  const joinTable = (tableId: string) => {
    if (!user) return;
    socket.emit('poker:joinTable', { tableId, userId: user.id });
    setSelectedTable(tableId);
  };

  if (selectedTable) {
    return <PokerTable tableId={selectedTable} onLeave={() => setSelectedTable(null)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 to-indigo-900 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Poker Room</h1>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Table
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tables.map((table) => (
            <div
              key={table.id}
              className="rounded-lg bg-white p-6 shadow-lg transition-transform hover:-translate-y-1"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-bold">{table.name}</h3>
                <div className="flex items-center space-x-2 text-gray-500">
                  <Users className="h-4 w-4" />
                  <span>{table.currentPlayers}/{table.maxPlayers}</span>
                </div>
              </div>

              <div className="mb-6 grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-sm text-gray-500">Min Bet</p>
                  <div className="flex items-center text-green-600">
                    <Coins className="mr-1 h-4 w-4" />
                    <span className="font-bold">${table.minBet}</span>
                  </div>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-sm text-gray-500">Max Bet</p>
                  <div className="flex items-center text-green-600">
                    <Coins className="mr-1 h-4 w-4" />
                    <span className="font-bold">${table.maxBet}</span>
                  </div>
                </div>
              </div>

              <Button
                className="w-full justify-between"
                onClick={() => joinTable(table.id)}
                disabled={table.currentPlayers >= table.maxPlayers}
              >
                {table.currentPlayers >= table.maxPlayers ? 'Table Full' : 'Join Table'}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};