import { Link } from 'react-router-dom';
import { Gamepad2, Coins } from 'lucide-react';

const SLOT_MACHINES = [
  {
    id: 'cyber-cowboy',
    title: 'Cyber Cowboy',
    description: 'Futuristic western slot with neon-powered wins!',
    image: 'https://images.unsplash.com/photo-1518893883800-45cd0954574b?auto=format&fit=crop&q=80',
    minBet: 10,
    theme: 'Cyberpunk Western',
    features: ['Neon Multipliers', 'Digital Wilds', 'Circuit Bonus']
  },
  {
    id: 'gold-rush',
    title: 'Gold Rush',
    description: 'Strike it rich in this high-stakes mining adventure!',
    image: 'https://images.unsplash.com/photo-1601556123240-462c758a50db?auto=format&fit=crop&q=80',
    minBet: 10,
    theme: 'Mining',
    features: ['Cascading Wins', 'Dynamite Bonus', 'Gem Collections']
  },
  {
    id: 'alien-saloon',
    title: 'Alien Saloon',
    description: 'Out of this world wins in a cosmic western!',
    image: 'https://images.unsplash.com/photo-1544098281-073ae35c98b4?auto=format&fit=crop&q=80',
    minBet: 10,
    theme: 'Space Western',
    features: ['UFO Bonus', 'Cosmic Spins', 'Alien Wilds']
  },
  {
    id: 'steampunk',
    title: 'Steampunk Spins',
    description: 'Gear up for steam-powered jackpots!',
    image: 'https://images.unsplash.com/photo-1606167668584-78701c57f13d?auto=format&fit=crop&q=80',
    minBet: 10,
    theme: 'Mechanical',
    features: ['Gear Ratio', 'Steam Pressure', 'Clockwork Bonus']
  },
  {
    id: 'quantum-bounty',
    title: 'Quantum Bounty',
    description: 'Hunt for wins across parallel universes!',
    image: 'https://images.unsplash.com/photo-1518893883800-45cd0954574b?auto=format&fit=crop&q=80',
    minBet: 10,
    theme: 'Quantum Physics',
    features: ['Parallel Wins', 'Entanglement', 'Superposition']
  }
];

export const SlotsLobby = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 to-blue-900 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white">Slot Machines</h1>
          <p className="mt-4 text-lg text-gray-300">
            Choose your adventure across multiple unique themes
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {SLOT_MACHINES.map((machine) => (
            <Link
              key={machine.id}
              to={`/slots/${machine.id}`}
              className="group overflow-hidden rounded-lg bg-white shadow-xl transition-transform hover:-translate-y-2"
            >
              <div className="aspect-video w-full overflow-hidden">
                <img
                  src={machine.image}
                  alt={machine.title}
                  className="h-full w-full object-cover transition-transform group-hover:scale-110"
                />
              </div>
              
              <div className="p-6">
                <h3 className="text-xl font-bold">{machine.title}</h3>
                <p className="mt-2 text-gray-600">{machine.description}</p>
                
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-gray-500">
                    <Coins className="h-4 w-4" />
                    <span>Min Bet: ${machine.minBet}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-blue-600">
                    <Gamepad2 className="h-4 w-4" />
                    <span>Play Now</span>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-sm font-medium text-gray-500">Features:</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {machine.features.map((feature) => (
                      <span
                        key={feature}
                        className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-600"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};