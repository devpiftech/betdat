import { supabase } from '../supabase';
import { socket } from '../socket';

class AnalyticsService {
  private metrics: Map<string, number> = new Map();
  private events: any[] = [];
  private readonly BATCH_SIZE = 100;
  private readonly FLUSH_INTERVAL = 60000; // 1 minute

  constructor() {
    // Set up periodic flushing of metrics and events
    setInterval(() => this.flushData(), this.FLUSH_INTERVAL);
  }

  // Track game-specific metrics
  trackGameMetric(gameId: string, metricName: string, value: number) {
    const key = `${gameId}:${metricName}`;
    this.metrics.set(key, (this.metrics.get(key) || 0) + value);
  }

  // Track player events
  trackPlayerEvent(userId: string, eventType: string, data: any) {
    this.events.push({
      userId,
      eventType,
      data,
      timestamp: new Date().toISOString()
    });

    if (this.events.length >= this.BATCH_SIZE) {
      this.flushData();
    }
  }

  // Track system performance
  trackPerformance(metric: string, value: number) {
    this.metrics.set(`system:${metric}`, value);
  }

  private async flushData() {
    if (this.metrics.size === 0 && this.events.length === 0) return;

    const metrics = Array.from(this.metrics.entries()).map(([key, value]) => {
      const [context, name] = key.split(':');
      return {
        context,
        name,
        value,
        timestamp: new Date().toISOString()
      };
    });

    try {
      // Store metrics
      if (metrics.length > 0) {
        await supabase
          .from('analytics_metrics')
          .insert(metrics);
      }

      // Store events
      if (this.events.length > 0) {
        await supabase
          .from('analytics_events')
          .insert(this.events);
      }

      // Clear stored data
      this.metrics.clear();
      this.events = [];

      // Notify monitoring system
      socket.emit('analytics_update', {
        metrics,
        events: this.events
      });
    } catch (error) {
      console.error('Error flushing analytics data:', error);
    }
  }

  // Get aggregated metrics
  async getMetrics(timeframe: string = '24h') {
    const { data } = await supabase
      .from('analytics_metrics')
      .select('*')
      .gte('timestamp', new Date(Date.now() - this.getTimeframeMs(timeframe)).toISOString())
      .order('timestamp', { ascending: false });

    return this.aggregateMetrics(data || []);
  }

  // Get player events
  async getPlayerEvents(userId: string, limit: number = 100) {
    const { data } = await supabase
      .from('analytics_events')
      .select('*')
      .eq('userId', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    return data || [];
  }

  private getTimeframeMs(timeframe: string): number {
    const units: Record<string, number> = {
      h: 3600000,
      d: 86400000,
      w: 604800000,
      m: 2592000000
    };

    const value = parseInt(timeframe);
    const unit = timeframe.slice(-1);
    return value * (units[unit] || units.h);
  }

  private aggregateMetrics(metrics: any[]) {
    return metrics.reduce((acc, metric) => {
      const key = `${metric.context}:${metric.name}`;
      if (!acc[key]) {
        acc[key] = {
          total: 0,
          count: 0,
          min: metric.value,
          max: metric.value
        };
      }

      acc[key].total += metric.value;
      acc[key].count += 1;
      acc[key].min = Math.min(acc[key].min, metric.value);
      acc[key].max = Math.max(acc[key].max, metric.value);

      return acc;
    }, {});
  }
}

export const analyticsService = new AnalyticsService();