import { Link } from 'react-router-dom';
import { Gamepad2, Trophy, Users, Shield, Coins } from 'lucide-react';
import { Button } from '../ui/Button';

export const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-indigo-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1511193311914-0346f16efe90?auto=format&fit=crop&q=80"
            alt="Casino background"
            className="h-full w-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-blue-900/50 to-indigo-900/50" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
              Experience the Thrill of
              <span className="block text-blue-400">Social Casino Gaming</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-xl text-gray-300">
              Join thousands of players in the most exciting social casino platform. Play games, compete in tournaments, and win big!
            </p>
            <div className="mt-10 flex justify-center gap-4">
              <Link to="/games">
                <Button size="lg" className="gap-2">
                  <Gamepad2 className="h-5 w-5" />
                  Play Now
                </Button>
              </Link>
              <Link to="/tournaments">
                <Button size="lg" variant="secondary" className="gap-2">
                  <Trophy className="h-5 w-5" />
                  Join Tournament
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-white/10 p-8 backdrop-blur-sm">
            <div className="mb-4 inline-block rounded-lg bg-blue-500 p-3">
              <Gamepad2 className="h-6 w-6 text-white" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-white">Multiple Games</h3>
            <p className="text-gray-300">
              Choose from a variety of casino games including Slots, Blackjack, Poker, and Roulette.
            </p>
          </div>

          <div className="rounded-lg bg-white/10 p-8 backdrop-blur-sm">
            <div className="mb-4 inline-block rounded-lg bg-yellow-500 p-3">
              <Trophy className="h-6 w-6 text-white" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-white">Tournaments</h3>
            <p className="text-gray-300">
              Compete in daily and weekly tournaments with big prize pools.
            </p>
          </div>

          <div className="rounded-lg bg-white/10 p-8 backdrop-blur-sm">
            <div className="mb-4 inline-block rounded-lg bg-green-500 p-3">
              <Users className="h-6 w-6 text-white" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-white">Social Features</h3>
            <p className="text-gray-300">
              Connect with friends, chat, and challenge them to games.
            </p>
          </div>

          <div className="rounded-lg bg-white/10 p-8 backdrop-blur-sm">
            <div className="mb-4 inline-block rounded-lg bg-purple-500 p-3">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-white">Fair Play</h3>
            <p className="text-gray-300">
              Provably fair gaming with transparent RNG verification.
            </p>
          </div>
        </div>
      </div>

      {/* Games Preview */}
      <div className="bg-white/5 py-24 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white">Featured Games</h2>
            <p className="mt-4 text-gray-300">
              Experience our most popular casino games
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <Link to="/slots" className="group">
              <div className="overflow-hidden rounded-lg">
                <img
                  src="https://images.unsplash.com/photo-1518893883800-45cd0954574b?auto=format&fit=crop&q=80"
                  alt="Slots"
                  className="aspect-video w-full object-cover transition-transform group-hover:scale-110"
                />
              </div>
              <h3 className="mt-4 text-xl font-bold text-white">Slots</h3>
              <p className="mt-2 text-gray-300">
                Classic slot machine experience with modern twists
              </p>
            </Link>

            <Link to="/blackjack" className="group">
              <div className="overflow-hidden rounded-lg">
                <img
                  src="https://images.unsplash.com/photo-1601601392622-5d18104a78cd?auto=format&fit=crop&q=80"
                  alt="Blackjack"
                  className="aspect-video w-full object-cover transition-transform group-hover:scale-110"
                />
              </div>
              <h3 className="mt-4 text-xl font-bold text-white">Blackjack</h3>
              <p className="mt-2 text-gray-300">
                Test your skills against the dealer
              </p>
            </Link>

            <Link to="/poker" className="group">
              <div className="overflow-hidden rounded-lg">
                <img
                  src="https://images.unsplash.com/photo-1544098281-073ae35c98b4?auto=format&fit=crop&q=80"
                  alt="Poker"
                  className="aspect-video w-full object-cover transition-transform group-hover:scale-110"
                />
              </div>
              <h3 className="mt-4 text-xl font-bold text-white">Poker</h3>
              <p className="mt-2 text-gray-300">
                Multiplayer Texas Hold'em action
              </p>
            </Link>

            <Link to="/roulette" className="group">
              <div className="overflow-hidden rounded-lg">
                <img
                  src="https://images.unsplash.com/photo-1606167668584-78701c57f13d?auto=format&fit=crop&q=80"
                  alt="Roulette"
                  className="aspect-video w-full object-cover transition-transform group-hover:scale-110"
                />
              </div>
              <h3 className="mt-4 text-xl font-bold text-white">Roulette</h3>
              <p className="mt-2 text-gray-300">
                Classic European roulette wheel
              </p>
            </Link>
          </div>
        </div>
      </div>

      {/* VIP Benefits */}
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white">VIP Benefits</h2>
          <p className="mt-4 text-gray-300">
            Unlock exclusive rewards as you level up
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg bg-gradient-to-br from-yellow-500/20 to-amber-500/20 p-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-500">
              <Coins className="h-6 w-6 text-white" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-white">Higher Limits</h3>
            <p className="text-gray-300">
              Increased betting limits and special high-roller tables
            </p>
          </div>

          <div className="rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 p-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500">
              <Trophy className="h-6 w-6 text-white" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-white">Exclusive Events</h3>
            <p className="text-gray-300">
              Access to VIP-only tournaments and special events
            </p>
          </div>

          <div className="rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 p-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500">
              <Coins className="h-6 w-6 text-white" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-white">Cashback</h3>
            <p className="text-gray-300">
              Earn cashback on losses and special bonuses
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};