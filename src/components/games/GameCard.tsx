import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import { Button } from '../ui/Button';

interface GameCardProps {
  title: string;
  description: string;
  image: string;
  path: string;
  players?: number;
}

export const GameCard = ({
  title,
  description,
  image,
  path,
  players,
}: GameCardProps) => {
  return (
    <div className="group relative overflow-hidden rounded-lg bg-white shadow-lg transition-transform hover:-translate-y-1">
      <div className="aspect-video w-full overflow-hidden">
        <img
          src={image}
          alt={title}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
        />
      </div>
      <div className="p-4">
        <h3 className="text-xl font-bold">{title}</h3>
        <p className="mt-2 text-gray-600">{description}</p>
        <div className="mt-4 flex items-center justify-between">
          {players !== undefined && (
            <span className="text-sm text-gray-500">
              {players} playing now
            </span>
          )}
          <Link to={path}>
            <Button className="gap-2">
              <Play className="h-4 w-4" />
              Play Now
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};