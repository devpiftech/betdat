import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gamepad2, Users, Trophy, Coins } from 'lucide-react';
import { GameCard } from './GameCard';
import { Button } from '../ui/Button';

interface GameInfo {
  id: string;
  title: string;
  description: string;
  image: string;
  path: string;
  players: number;
  minBet: number;
}

const GAMES: GameInfo[] = [
  {
    id: 'slots',
    title: 'Lucky Slots',
    description: 'Try your luck with our exciting slot machine!',
    image: 'https://images.unsplash.com/photo-1596838132731-3301c3fd4317',
    path: '/',
    players: 142,
    minBet: 10
  },
  {
    id: 'blackjack',
    title: 'Blackjack',
    description: 'Classic casino card game - try to beat the dealer!',
    image: 'https://images.unsplash.com/photo-1601556123240-462c758a50db',
    path: '/blackjack',
    players: 89,
    minBet: 20
  },
  {
    id: 'poker',
    title: 'Texas Hold\'em',
    description: 'Join a table and test your poker skills!',
    image: 'https://images.unsplash.com/photo-1544098281-073ae35c98b4',
    path: '/poker',
    players: 256,
    minBet: 50
  },
  {
    id: 'roulette',
    title: 'Roulette',
    description: 'Place your bets and watch the wheel spin!',
    image: 'https://images.unsplash.com/photo-1606167668584-78701c57f13d',
    path: '/roulette',
    players: 167,
    minBet: 10
  }
];

export const GameLobby = () => {
  const navigate = useNavigate();
  const [activeTournaments, setActiveTournaments] = useState(3);
  const [totalPlayers, setTotalPlayers] = useState(654);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-indigo-900 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        {/* Stats Overview */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-white/10 p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/60">Active Players</p>
                <p className="mt-2 text-3xl font-bold text-white">{totalPlayers}</p>
              </div>
              <Users className="h-8 w-8 text-blue-400" />
            </div>
          </div>
          <div className="rounded-lg bg-white/10 p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/60">Active Tournaments</p>
                <p className="mt-2 text-3xl font-bold text-white">{activeTournaments}</p>
              </div>
              <Trophy className="h-8 w-8 text-yellow-400" />
            </div>
          </div>
          <div className="rounded-lg bg-white/10 p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/60">Total Prize Pool</p>
                <p className="mt-2 text-3xl font-bold text-white">$25,000</p>
              </div>
              <Coins className="h-8 w-8 text-green-400" />
            </div>
          </div>
          <div className="rounded-lg bg-white/10 p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/60">Games Available</p>
                <p className="mt-2 text-3xl font-bold text-white">{GAMES.length}</p>
              </div>
              <Gamepad2 className="h-8 w-8 text-purple-400" />
            </div>
          </div>
        </div>

        {/* Featured Tournament */}
        <div className="mb-12 overflow-hidden rounded-lg bg-gradient-to-r from-yellow-500 to-amber-500">
          <div className="relative px-8 py-12">
            <div className="relative z-10">
              <h2 className="mb-2 text-3xl font-bold text-white">Weekend Tournament</h2>
              <p className="mb-6 text-lg text-white/90">Join our biggest poker tournament of the week!</p>
              <div className="mb-6 flex flex-wrap gap-6">
                <div className="rounded-full bg-black/20 px-4 py-2 text-white">
                  Prize Pool: $10,000
                </div>
                <div className="rounded-full bg-black/20 px-4 py-2 text-white">
                  Entry Fee: $100
                </div>
                <div className="rounded-full bg-black/20 px-4 py-2 text-white">
                  Players: 48/64
                </div>
              </div>
              <Button
                onClick={() => navigate('/tournaments')}
                className="bg-white text-amber-600 hover:bg-white/90"
              >
                Join Tournament
              </Button>
            </div>
            <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-amber-600/20 to-transparent" />
          </div>
        </div>

        {/* Games Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {GAMES.map((game) => (
            <GameCard key={game.id} {...game} />
          ))}
        </div>
      </div>
    </div>
  );
};