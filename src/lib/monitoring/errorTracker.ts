import { supabase } from '../supabase';
import { socket } from '../socket';

class ErrorTracker {
  private errors: any[] = [];
  private readonly MAX_ERRORS = 100;
  private readonly FLUSH_INTERVAL = 30000; // 30 seconds

  constructor() {
    setInterval(() => this.flushErrors(), this.FLUSH_INTERVAL);
    this.setupGlobalHandlers();
  }

  private setupGlobalHandlers() {
    window.addEventListener('error', (event) => {
      this.trackError('uncaught_error', {
        message: event.error?.message,
        stack: event.error?.stack,
        source: event.filename,
        line: event.lineno,
        column: event.colno
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.trackError('unhandled_promise', {
        message: event.reason?.message,
        stack: event.reason?.stack
      });
    });
  }

  trackError(type: string, error: any) {
    const errorData = {
      type,
      message: error.message || String(error),
      stack: error.stack,
      metadata: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      }
    };

    this.errors.push(errorData);

    // Emit critical errors immediately
    if (this.isCriticalError(type)) {
      this.notifyCriticalError(errorData);
    }

    if (this.errors.length >= this.MAX_ERRORS) {
      this.flushErrors();
    }
  }

  private async flushErrors() {
    if (this.errors.length === 0) return;

    try {
      await supabase
        .from('error_logs')
        .insert(this.errors);

      this.errors = [];
    } catch (error) {
      console.error('Error flushing error logs:', error);
    }
  }

  private isCriticalError(type: string): boolean {
    return [
      'game_crash',
      'data_corruption',
      'security_violation',
      'payment_error'
    ].includes(type);
  }

  private notifyCriticalError(error: any) {
    socket.emit('critical_error', error);
  }

  async getErrorStats(timeframe: string = '24h'): Promise<any> {
    const { data } = await supabase
      .from('error_logs')
      .select('*')
      .gte('timestamp', new Date(Date.now() - this.getTimeframeMs(timeframe)).toISOString());

    if (!data) return {};

    return this.aggregateErrors(data);
  }

  private getTimeframeMs(timeframe: string): number {
    const units: Record<string, number> = {
      h: 3600000,
      d: 86400000,
      w: 604800000
    };

    const value = parseInt(timeframe);
    const unit = timeframe.slice(-1);
    return value * (units[unit] || units.h);
  }

  private aggregateErrors(errors: any[]) {
    return errors.reduce((acc, error) => {
      const { type } = error;
      if (!acc[type]) {
        acc[type] = {
          count: 0,
          recent: [],
          firstSeen: error.timestamp,
          lastSeen: error.timestamp
        };
      }

      acc[type].count += 1;
      acc[type].lastSeen = error.timestamp;
      acc[type].recent = [
        ...acc[type].recent.slice(-4),
        {
          message: error.message,
          timestamp: error.timestamp
        }
      ];

      return acc;
    }, {});
  }
}

export const errorTracker = new ErrorTracker();