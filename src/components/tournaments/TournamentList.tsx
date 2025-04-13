import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Users, Clock, Coins } from 'lucide-react';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';
import type { Tournament } from '../../types';

export const TournamentList = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTournaments = async () => {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('start_time', { ascending: true });

      if (!error && data) {
        setTournaments(data);
      }
      setLoading(false);
    };

    fetchTournaments();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-lg">Loading tournaments...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Tournaments</h1>
        <div className="flex gap-4">
          <Button variant="secondary">
            <Clock className="mr-2 h-4 w-4" />
            Past Tournaments
          </Button>
          <Button>
            <Trophy className="mr-2 h-4 w-4" />
            My Tournaments
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {tournaments.map((tournament) => (
          <Link
            key={tournament.id}
            to={`/tournaments/${tournament.id}`}
            className="group rounded-lg bg-white p-6 shadow-md transition-transform hover:-translate-y-1"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className={`rounded-full px-3 py-1 text-sm font-medium
                ${tournament.status === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                  tournament.status === 'active' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'}`}>
                {tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
              </span>
              <div className="flex items-center text-sm text-gray-500">
                <Users className="mr-1 h-4 w-4" />
                <span>32/64</span>
              </div>
            </div>

            <h3 className="mb-2 text-xl font-bold group-hover:text-blue-600">
              {tournament.title}
            </h3>
            
            <p className="mb-4 text-sm text-gray-600">
              {tournament.description}
            </p>

            <div className="flex items-center justify-between border-t pt-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center text-green-600">
                  <Trophy className="mr-1 h-4 w-4" />
                  <span className="font-medium">${tournament.prize_pool}</span>
                </div>
                <div className="flex items-center text-blue-600">
                  <Coins className="mr-1 h-4 w-4" />
                  <span className="font-medium">${tournament.entry_fee}</span>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                {new Date(tournament.start_time).toLocaleDateString()}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};