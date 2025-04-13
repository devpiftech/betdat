import { useState, useEffect } from 'react';
import { Award, Trophy, Target } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Achievement, UserAchievement } from '../../types';

interface AchievementWithProgress extends Achievement {
  progress: number;
  isCompleted: boolean;
}

export const AchievementProgress = () => {
  const [achievements, setAchievements] = useState<AchievementWithProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAchievements = async () => {
      const { data: achievementsData } = await supabase
        .from('achievements')
        .select('*');

      const { data: userAchievements } = await supabase
        .from('user_achievements')
        .select('*');

      if (achievementsData) {
        const achievementsWithProgress = achievementsData.map(achievement => {
          const completed = userAchievements?.some(
            ua => ua.achievement_id === achievement.id
          );
          return {
            ...achievement,
            progress: completed ? 100 : Math.floor(Math.random() * 100),
            isCompleted: completed
          };
        });
        setAchievements(achievementsWithProgress);
      }
      setLoading(false);
    };

    fetchAchievements();
  }, []);

  if (loading) {
    return <div>Loading achievements...</div>;
  }

  return (
    <div className="space-y-4">
      {achievements.map((achievement) => (
        <div
          key={achievement.id}
          className={`rounded-lg bg-white p-4 shadow transition-transform hover:-translate-y-1 ${
            achievement.isCompleted ? 'ring-2 ring-yellow-400' : ''
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-full 
                ${achievement.isCompleted 
                  ? 'bg-yellow-100 text-yellow-600'
                  : 'bg-blue-100 text-blue-600'
                }`}
              >
                {achievement.isCompleted ? (
                  <Trophy className="h-6 w-6" />
                ) : (
                  <Target className="h-6 w-6" />
                )}
              </div>
              <div>
                <h3 className="font-semibold">{achievement.title}</h3>
                <p className="text-sm text-gray-600">{achievement.description}</p>
              </div>
            </div>
            {achievement.isCompleted && (
              <Award className="h-5 w-5 text-yellow-500" />
            )}
          </div>
          {!achievement.isCompleted && (
            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-gray-600">Progress</span>
                <span className="font-medium">{achievement.progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-blue-600 transition-all"
                  style={{ width: `${achievement.progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};