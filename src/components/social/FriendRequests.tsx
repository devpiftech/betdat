import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { Button } from '../ui/Button';
import { UserPlus, X } from 'lucide-react';
import { getFriendRequests, acceptFriendRequest } from '../../lib/friends';
import type { Friend, Profile } from '../../types';

export const FriendRequests = () => {
  const { user } = useStore();
  const [requests, setRequests] = useState<(Friend & { profile: Profile })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRequests = async () => {
      if (!user) return;
      const data = await getFriendRequests(user.id);
      if (data) setRequests(data);
      setLoading(false);
    };

    loadRequests();
  }, [user]);

  const handleAccept = async (friendId: string) => {
    if (!user) return;
    const success = await acceptFriendRequest(user.id, friendId);
    if (success) {
      setRequests(requests.filter(r => r.user_id !== friendId));
    }
  };

  if (loading) return null;
  if (requests.length === 0) return null;

  return (
    <div className="fixed right-4 top-20 z-50 w-80 rounded-lg bg-white p-4 shadow-lg">
      <h3 className="mb-4 font-semibold">Friend Requests</h3>
      <div className="space-y-4">
        {requests.map((request) => (
          <div key={request.id} className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-full bg-gray-200" />
              <span>{request.profile.username}</span>
            </div>
            <div className="flex space-x-2">
              <Button
                size="sm"
                onClick={() => handleAccept(request.user_id)}
              >
                <UserPlus className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setRequests(requests.filter(r => r.id !== request.id))}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};