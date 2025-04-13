import { useEffect } from 'react';
import { analyticsService } from '../lib/monitoring/analyticsService';
import { performanceMonitor } from '../lib/monitoring/performanceMonitor';
import { errorTracker } from '../lib/monitoring/errorTracker';

export function useMonitoring(sessionId: string | null) {
  useEffect(() => {
    if (!sessionId) return;

    // Set up performance monitoring
    const monitorPerformance = () => {
      performanceMonitor.monitorMemory();
      performanceMonitor.monitorNetwork();
    };

    const interval = setInterval(monitorPerformance, 30000);
    monitorPerformance(); // Initial check

    return () => clearInterval(interval);
  }, [sessionId]);

  const trackGameAction = (action: string, duration: number) => {
    performanceMonitor.trackTiming('game_action', duration);
    analyticsService.trackGameMetric(sessionId!, 'action_count', 1);
  };

  const trackError = (type: string, error: any) => {
    errorTracker.trackError(type, error);
  };

  const trackEvent = (userId: string, eventType: string, data: any) => {
    analyticsService.trackPlayerEvent(userId, eventType, data);
  };

  return {
    trackGameAction,
    trackError,
    trackEvent
  };
}