import { useState, useEffect } from 'react';
import { LineChart, Activity, Zap } from 'lucide-react';
import { analyticsService } from '../../lib/monitoring/analyticsService';

export const PerformanceMetrics = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [timeframe, setTimeframe] = useState('24h');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMetrics = async () => {
      setLoading(true);
      const data = await analyticsService.getMetrics(timeframe);
      setMetrics(data);
      setLoading(false);
    };

    loadMetrics();
    const interval = setInterval(loadMetrics, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, [timeframe]);

  if (loading) {
    return <div>Loading metrics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Response Time */}
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Response Time</p>
              <p className="mt-1 text-2xl font-semibold">
                {metrics?.['system:game_action_avg']?.toFixed(2) || 0}ms
              </p>
            </div>
            <div className="rounded-full bg-blue-100 p-3 text-blue-600">
              <Activity className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4">
            <div className="h-2 rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-blue-600 transition-all"
                style={{
                  width: `${Math.min(
                    (metrics?.['system:game_action_avg'] || 0) / 2,
                    100
                  )}%`
                }}
              />
            </div>
          </div>
        </div>

        {/* Error Rate */}
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Error Rate</p>
              <p className="mt-1 text-2xl font-semibold">
                {((metrics?.['system:error_rate']?.value || 0) * 100).toFixed(2)}%
              </p>
            </div>
            <div className="rounded-full bg-red-100 p-3 text-red-600">
              <LineChart className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4">
            <div className="h-2 rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-red-600 transition-all"
                style={{
                  width: `${Math.min(
                    ((metrics?.['system:error_rate']?.value || 0) * 100),
                    100
                  )}%`
                }}
              />
            </div>
          </div>
        </div>

        {/* System Load */}
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">System Load</p>
              <p className="mt-1 text-2xl font-semibold">
                {((metrics?.['system:load']?.value || 0) * 100).toFixed(0)}%
              </p>
            </div>
            <div className="rounded-full bg-green-100 p-3 text-green-600">
              <Zap className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4">
            <div className="h-2 rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-green-600 transition-all"
                style={{
                  width: `${Math.min(
                    ((metrics?.['system:load']?.value || 0) * 100),
                    100
                  )}%`
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold">Detailed Metrics</h3>
        <div className="space-y-4">
          {Object.entries(metrics || {}).map(([key, value]: [string, any]) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <p className="font-medium">{key.replace(':', ' - ')}</p>
                <p className="text-sm text-gray-600">
                  min: {value.min?.toFixed(2)} | max: {value.max?.toFixed(2)}
                </p>
              </div>
              <p className="text-lg font-semibold">
                {(value.total / value.count).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};