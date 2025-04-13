import { useState } from 'react';
import { Button } from '../ui/Button';
import { fairnessVerifier } from '../../lib/fairness/fairnessVerifier';
import { Shield, Check, X, Copy } from 'lucide-react';

interface Props {
  sessionId: string;
  onClose: () => void;
}

export const FairnessVerifier = ({ sessionId, onClose }: Props) => {
  const [verificationResult, setVerificationResult] = useState<{
    isValid: boolean;
    details: any;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const verifyFairness = async () => {
    setLoading(true);
    const result = await fairnessVerifier.verifyFairness(sessionId);
    setVerificationResult(result);
    setLoading(false);
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
        <button
          onClick={onClose}
          className="rounded-full p-1 hover:bg-gray-100"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {!verificationResult ? (
        <div className="space-y-4">
          <p className="text-gray-600">
            Verify the fairness of this game session. The verification process
            ensures that the game outcome was not manipulated.
          </p>
          <Button
            onClick={verifyFairness}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Verifying...' : 'Verify Fairness'}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className={`rounded-full p-1 ${
              verificationResult.isValid
                ? 'bg-green-100 text-green-600'
                : 'bg-red-100 text-red-600'
            }`}>
              {verificationResult.isValid ? (
                <Check className="h-5 w-5" />
              ) : (
                <X className="h-5 w-5" />
              )}
            </div>
            <span className={`font-medium ${
              verificationResult.isValid
                ? 'text-green-600'
                : 'text-red-600'
            }`}>
              {verificationResult.isValid
                ? 'Game outcome verified'
                : 'Verification failed'}
            </span>
          </div>

          {verificationResult.isValid && (
            <div className="space-y-2 rounded-lg bg-gray-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Server Seed</span>
                <button
                  onClick={() => copyToClipboard(verificationResult.details.serverSeed)}
                  className="rounded p-1 hover:bg-gray-200"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <p className="break-all text-sm font-mono">
                {verificationResult.details.serverSeed}
              </p>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Client Seed</span>
                <button
                  onClick={() => copyToClipboard(verificationResult.details.clientSeed)}
                  className="rounded p-1 hover:bg-gray-200"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <p className="break-all text-sm font-mono">
                {verificationResult.details.clientSeed}
              </p>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Nonce</span>
                <span className="text-sm font-mono">
                  {verificationResult.details.nonce}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Verification Hash</span>
                <button
                  onClick={() => copyToClipboard(verificationResult.details.verificationHash)}
                  className="rounded p-1 hover:bg-gray-200"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <p className="break-all text-sm font-mono">
                {verificationResult.details.verificationHash}
              </p>
            </div>
          )}

          <Button
            variant="secondary"
            onClick={() => setVerificationResult(null)}
            className="w-full"
          >
            Verify Another Game
          </Button>
        </div>
      )}
    </div>
  );
};