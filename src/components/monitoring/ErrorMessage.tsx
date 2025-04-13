import { AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';

interface Props {
  message: string;
  onRetry?: () => void;
}

export const ErrorMessage = ({ message, onRetry }: Props) => {
  return (
    <div className="rounded-lg bg-red-50 p-4">
      <div className="flex items-center">
        <AlertTriangle className="h-5 w-5 text-red-400" />
        <p className="ml-3 text-sm font-medium text-red-800">{message}</p>
      </div>
      {onRetry && (
        <div className="mt-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={onRetry}
            className="text-red-600 hover:text-red-500"
          >
            Try again
          </Button>
        </div>
      )}
    </div>
  );
};