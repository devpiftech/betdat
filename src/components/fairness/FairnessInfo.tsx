import { useState } from 'react';
import { Shield, Check, X, Copy, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { useGameVerification } from '../../hooks/useGameVerification';

interface Props {
  sessionId: string;
  onClose?: () => void;
}

export const FairnessInfo = ({ sessionId, onClose }: Props) => {
  const { verify, verifying, verified, error } = useGameVerification(sessionId);
  const [details, setDetails] = useState<any>(null);

  const handleVerify = async () => {
    const result = await verify();
    if (result) {
      setDetails(result.details);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow-lg">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Fairness Verification</h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {!details ? (
        <div className="space-y-4">
          <p className="text-gray-600">
            Verify the fairness of this game session. The verification process
            ensures that the game outcome was not manipulated.
          </p>
          <Button
            onClick={handleVerify}
            disabled={verifying}
            className="w-full"
          >
            {verifying ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify Fairness'
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className={`rounded-full p-1 ${
              verified
                ? 'bg-green-100 text-green-600'
                : 'bg-red-100 text-red-600'
            }`}>
              {verified ? (
                <Check className="h-5 w-5" />
              ) : (
                <X className="h-5 w-5" />
              )}
            </div>
            <span className={`font-medium ${
              verified
                ? 'text-green-600'
                : 'text-red-600'
            }`}>
              {verified
                ? 'Game outcome verified'
                : 'Verification failed'}
            </span>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          {verified && (
            <div className="space-y-2 rounded-lg bg-gray-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Server Seed</span>
                <button
                  onClick={() => copyToClipboard(details.serverSeed)}
                  className="rounded p-1 hover:bg-gray-200"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <p className="break-all text-sm font-mono">
                {details.serverSeed}
              </p>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Client Seed</span>
                <button
                  onClick={() => copyToClipboard(details.clientSeed)}
                  className="rounded p-1 hover:bg-gray-200"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <p className="break-all text-sm font-mono">
                {details.clientSeed}
              </p>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Nonce</span>
                <span className="text-sm font-mono">
                  {details.nonce}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Verification Hash</span>
                <button
                  onClick={() => copyToClipboard(details.verificationHash)}
                  className="rounded p-1 hover:bg-gray-200"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <p className="break-all text-sm font-mono">
                {details.verificationHash}
              </p>
            </div>
          )}

          <Button
            variant="secondary"
            onClick={() => setDetails(null)}
            className="w-full"
          >
            Verify Another Game
          </Button>
        </div>
      )}
    </div>
  );
};