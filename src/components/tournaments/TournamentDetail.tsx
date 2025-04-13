import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Trophy, Users, Clock, Coins, Award } from 'lucide-react';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../store/useStore';
import type { Tournament, TournamentParticipant } from '../../types';

export const TournamentDetail = () => {
  const { id } = useParams();
  const { user } = useStore();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<TournamentParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const fetchTournament = async () => {
      if (!id) return;

      const [tournamentData, participantsData] = await Promise.all([
        supabase.from('tournaments').select('*').eq('id', id).single(),
        supabase.from('tournament_participants')
          .select('*, profile:profiles(username, avatar_url)')
          .eq('tournament_id', id)
          .order('score', { ascending: false })
      ]);

      if (!tournamentData.error && tournamentData.data) {
        setTournament(tournamentData.data);
      }

      if (!participantsData.error && participantsData.data) {
        setParticipants(participantsData.data);
      }

      setLoading(false);
    };

    fetchTournament();
  }, [id]);

  const handleJoin = async () => {
    if (!tournament || !user) return;

    setJoining(true);
    const { error } = await supabase
      .from('tournament_participants')
      .insert([{ tournament_id: tournament.id, user_id: user.id }]);

    if (!error) {
      // Refresh participants list
      const { data } = await supabase
        .from('tournament_participants')
        .select('*, profile:profiles(username, avatar_url)')
        .eq('tournament_id', tournament.id)
        .order('score', { ascending: false });

      if (data) {
        setParticipants(data);
      }
    }
    setJoining(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-lg">Loading tournament details...</div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-lg">Tournament not found</div>
      </div>
    );
  }

  const isParticipant = user && participants.some(p => p.user_id === user.id);
  const canJoin = tournament.status === 'upcoming' && !isParticipant && user;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {/* Tournament Info */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-3xl font-bold">{tournament.title}</h1>
              <span className={`rounded-full px-4 py-2 text-sm font-medium
                ${tournament.status === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                  tournament.status === 'active' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'}`}>
                {tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
              </span>
            </div>

            <p className="mb-6 text-gray-600">{tournament.description}</p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center space-x-2 rounded-lg bg-gray-50 p-4">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-sm text-gray-600">Prize Pool</p>
                  <p className="font-bold">${tournament.prize_pool}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 rounded-lg bg-gray-50 p-4">
                <Coins className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600">Entry Fee</p>
                  <p className="font-bold">${tournament.entry_fee}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 rounded-lg bg-gray-50 p-4">
                <Clock className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-gray-600">Start Time</p>
                  <p className="font-bold">
                    {new Date(tournament.start_time).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 rounded-lg bg-gray-50 p-4">
                <Users className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm text-gray-600">Participants</p>
                  <p className="font-bold">
                    {participants.length}{tournament.max_players ? `/${tournament.max_players}` : ''}
                  </p>
                </div>
              </div>
            </div>

            {canJoin && (
              <Button
                className="mt-6 w-full"
                onClick={handleJoin}
                disabled={joining}
              >
                {joining ? 'Joining...' : 'Join Tournament'}
              </Button>
            )}
          </div>

          {/* Leaderboard */}
          <div className="mt-8 rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-xl font-bold">Leaderboard</h2>
            <div className="space-y-4">
              {participants.map((participant, index) => (
                <div
                  key={participant.id}
                  className="flex items-center justify-between rounded-lg bg-gray-50 p-4"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-600">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">
                        {participant.profile?.username}
                      </p>
                      <p className="text-sm text-gray-500">
                        Score: {participant.score}
                      </p>
                    </div>
                  </div>
                  {index < 3 && (
                    <Award className={`h-6 w-6 
                      ${index === 0 ? 'text-yellow-500' :
                        index === 1 ? 'text-gray-400' :
                        'text-amber-600'}`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Rules and Info */}
        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-xl font-bold">Tournament Rules</h2>
            <div className="space-y-4 text-gray-600">
              <p>• Tournament will last for 2 hours</p>
              <p>• Players start with equal chips</p>
              <p>• Top 3 players win prizes</p>
              <p>• No rebuys allowed</p>
              <p>• Fair play rules apply</p>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-xl font-bold">Prize Distribution</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  <span>1st Place</span>
                </div>
                <span className="font-bold">${tournament.prize_pool * 0.5}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Trophy className="h-5 w-5 text-gray-400" />
                  <span>2nd Place</span>
                </div>
                <span className="font-bold">${tournament.prize_pool * 0.3}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Trophy className="h-5 w-5 text-amber-600" />
                  <span>3rd Place</span>
                </div>
                <span className="font-bold">${tournament.prize_pool * 0.2}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};