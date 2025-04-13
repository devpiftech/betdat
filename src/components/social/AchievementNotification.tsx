import { useState, useEffect } from 'react';
import { Award } from 'lucide-react';
import type { Achievement } from '../../types';

interface Props {
  achievement: Achievement;
  onClose: () => void;
}

export const AchievementNotification = ({ achievement, onClose }: Props) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed right-4 top-20 z-50 flex w-80 items-center space-x-4 rounded-lg bg-white p-4 shadow-lg">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
        <Award className="h-6 w-6 text-yellow-600" />
      </div>
      <div>
        <h4 className="font-semibold">Achievement Unlocked!</h4>
        <p className="text-sm text-gray-600">{achievement.title}</p>
      </div>
    </div>
  );
};