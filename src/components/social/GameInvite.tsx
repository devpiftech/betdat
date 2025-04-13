import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gamepad2, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { socket } from '../../lib/socket';

interface GameInviteProps {
  from: string;
  game: string;
  onAccept: () => void;
  onDecline: () => void;
}

export const GameInvite = ({ from, game, onAccept, onDecline }: GameInviteProps) => {
  return (
    <div className="fixed right-4 top-20 z-50 w-80 rounded-lg bg-white p-4 shadow-lg">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
            <Gamepad2 className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium">{from} invited you to play</p>
            <p className="text-sm text-gray-600">{game}</p>
          </div>
        </div>
        <button
          onClick={onDecline}
          className="rounded-full p-1 hover:bg-gray-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-4 flex space-x-2">
        <Button
          onClick={onAccept}
          className="flex-1"
        >
          Accept
        </Button>
        <Button
          variant="secondary"
          onClick={onDecline}
          className="flex-1"
        >
          Decline
        </Button>
      </div>
    </div>
  );
};