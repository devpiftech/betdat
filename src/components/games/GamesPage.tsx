import { useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { GameCard } from './GameCard';
import { Button } from '../ui/Button';

const GAMES = [
  // Slot Machines
  {
    id: 'cyber-cowboy',
    title: 'Cyber Cowboy',
    description: 'Futuristic western slot with neon-powered wins!',
    image: 'https://images.unsplash.com/photo-1518893883800-45cd0954574b?auto=format&fit=crop&q=80',
    path: '/slots/cyber-cowboy',
    players: 142,
    minBet: 10,
    category: 'slots'
  },
  {
    id: 'gold-rush',
    title: 'Gold Rush',
    description: 'Strike it rich in this high-stakes mining adventure!',
    image: 'https://images.unsplash.com/photo-1601556123240-462c758a50db?auto=format&fit=crop&q=80',
    path: '/slots/gold-rush',
    players: 89,
    minBet: 20,
    category: 'slots'
  },
  {
    id: 'alien-saloon',
    title: 'Alien Saloon',
    description: 'Out of this world wins in a cosmic western!',
    image: 'https://images.unsplash.com/photo-1544098281-073ae35c98b4?auto=format&fit=crop&q=80',
    path: '/slots/alien-saloon',
    players: 256,
    minBet: 15,
    category: 'slots'
  },
  {
    id: 'steampunk',
    title: 'Steampunk Spins',
    description: 'Gear up for steam-powered jackpots!',
    image: 'https://images.unsplash.com/photo-1606167668584-78701c57f13d?auto=format&fit=crop&q=80',
    path: '/slots/steampunk',
    players: 167,
    minBet: 10,
    category: 'slots'
  },
  {
    id: 'quantum-bounty',
    title: 'Quantum Bounty',
    description: 'Hunt for wins across parallel universes!',
    image: 'https://images.unsplash.com/photo-1518893883800-45cd0954574b?auto=format&fit=crop&q=80',
    path: '/slots/quantum-bounty',
    players: 198,
    minBet: 25,
    category: 'slots'
  },
  // Table Games
  {
    id: 'blackjack',
    title: 'Blackjack',
    description: 'Classic casino card game - try to beat the dealer!',
    image: 'https://images.unsplash.com/photo-1601556123240-462c758a50db?auto=format&fit=crop&q=80',
    path: '/blackjack',
    players: 89,
    minBet: 20,
    category: 'table'
  },
  {
    id: 'poker',
    title: 'Texas Hold\'em',
    description: 'Join a table and test your poker skills!',
    image: 'https://images.unsplash.com/photo-1544098281-073ae35c98b4?auto=format&fit=crop&q=80',
    path: '/poker',
    players: 256,
    minBet: 50,
    category: 'table'
  },
  {
    id: 'roulette',
    title: 'European Roulette',
    description: 'Place your bets and watch the wheel spin!',
    image: 'https://images.unsplash.com/photo-1606167668584-78701c57f13d?auto=format&fit=crop&q=80',
    path: '/roulette',
    players: 167,
    minBet: 10,
    category: 'table'
  },
  {
    id: 'us-roulette',
    title: 'American Roulette',
    description: 'Double zero action with US-style betting!',
    image: 'https://images.unsplash.com/photo-1606167668584-78701c57f13d?auto=format&fit=crop&q=80',
    path: '/us-roulette',
    players: 145,
    minBet: 10,
    category: 'table'
  },
  {
    id: 'craps',
    title: 'Craps',
    description: 'Roll the dice and win big with multiple betting options!',
    image: 'https://images.unsplash.com/photo-1595752776689-aebef37b5d32?auto=format&fit=crop&q=80',
    path: '/craps',
    players: 78,
    minBet: 10,
    category: 'table'
  },
  // Instant Win Games
  {
    id: 'scratch-card',
    title: 'Scratch Cards',
    description: 'Instant win scratch cards with multiple prize tiers!',
    image: 'https://images.unsplash.com/photo-1518893883800-45cd0954574b?auto=format&fit=crop&q=80',
    path: '/scratch-card',
    players: 234,
    minBet: 5,
    category: 'instant'
  },
  {
    id: 'coin-flip',
    title: 'Coin Flip',
    description: 'Simple heads or tails betting with quick results!',
    image: 'https://images.unsplash.com/photo-1592820146012-0c35bf6c95de?auto=format&fit=crop&q=80',
    path: '/coin-flip',
    players: 156,
    minBet: 10,
    category: 'instant'
  },
  // Special Events
  {
    id: 'raffle',
    title: 'Raffle Draws',
    description: 'Enter raffles for a chance to win huge prizes!',
    image: 'https://images.unsplash.com/photo-1563941406054-955f1be2305c?auto=format&fit=crop&q=80',
    path: '/raffle',
    players: 412,
    minBet: 10,
    category: 'special'
  },
  {
    id: 'horse-racing',
    title: 'Horse Racing',
    description: 'Bet on virtual horse races with live race simulation!',
    image: 'https://images.unsplash.com/photo-1584838936423-7cf9e6e7b925?auto=format&fit=crop&q=80',
    path: '/horse-racing',
    players: 189,
    minBet: 10,
    category: 'special'
  }
];

const CATEGORIES = [
  { id: 'all', name: 'All Games' },
  { id: 'slots', name: 'Slot Machines' },
  { id: 'table', name: 'Table Games' },
  { id: 'instant', name: 'Instant Win' },
  { id: 'special', name: 'Special Events' }
];

export const GamesPage = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredGames = GAMES.filter(game => {
    const matchesCategory = selectedCategory === 'all' || game.category === selectedCategory;
    const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         game.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-indigo-900 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-bold text-white">Casino Games</h1>
          
          <div className="flex gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search games..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-lg bg-white/10 pl-10 pr-4 py-2 text-white placeholder-gray-400 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <Button variant="secondary" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </Button>
          </div>
        </div>

        <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
          {CATEGORIES.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? 'default' : 'secondary'}
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.name}
            </Button>
          ))}
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredGames.map((game) => (
            <GameCard key={game.id} {...game} />
          ))}
        </div>
      </div>
    </div>
  );
};