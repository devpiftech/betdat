import { analyticsService } from './analyticsService';

class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private readonly SAMPLE_SIZE = 100;

  trackTiming(metric: string, duration: number) {
    const samples = this.metrics.get(metric) || [];
    samples.push(duration);

    if (samples.length > this.SAMPLE_SIZE) {
      samples.shift();
    }

    this.metrics.set(metric, samples);
    this.analyzePerformance(metric);
  }

  private analyzePerformance(metric: string) {
    const samples = this.metrics.get(metric) || [];
    if (samples.length < 10) return;

    const stats = this.calculateStats(samples);
    
    // Track various performance metrics
    analyticsService.trackPerformance(`${metric}_avg`, stats.average);
    analyticsService.trackPerformance(`${metric}_p95`, stats.p95);
    analyticsService.trackPerformance(`${metric}_p99`, stats.p99);

    // Check for performance degradation
    if (stats.average > this.getThreshold(metric)) {
      this.reportPerformanceIssue(metric, stats);
    }
  }

  private calculateStats(samples: number[]) {
    const sorted = [...samples].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const average = sum / sorted.length;
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);

    return {
      average,
      p95: sorted[p95Index],
      p99: sorted[p99Index],
      min: sorted[0],
      max: sorted[sorted.length - 1]
    };
  }

  private getThreshold(metric: string): number {
    // Define performance thresholds for different metrics
    const thresholds: Record<string, number> = {
      'game_action': 100, // 100ms
      'state_update': 50,  // 50ms
      'api_request': 200,  // 200ms
    };

    return thresholds[metric] || 100;
  }

  private reportPerformanceIssue(metric: string, stats: any) {
    analyticsService.trackPlayerEvent('system', 'performance_issue', {
      metric,
      stats,
      timestamp: new Date().toISOString()
    });
  }

  // Memory monitoring
  monitorMemory() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      analyticsService.trackPerformance('heap_used', memory.usedJSHeapSize);
      analyticsService.trackPerformance('heap_total', memory.totalJSHeapSize);
    }
  }

  // Network monitoring
  monitorNetwork() {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      analyticsService.trackPerformance('network_type', this.getNetworkScore(connection.effectiveType));
      analyticsService.trackPerformance('network_rtt', connection.rtt);
    }
  }

  private getNetworkScore(type: string): number {
    const scores: Record<string, number> = {
      'slow-2g': 1,
      '2g': 2,
      '3g': 3,
      '4g': 4
    };
    return scores[type] || 0;
  }
}

export const performanceMonitor = new PerformanceMonitor();