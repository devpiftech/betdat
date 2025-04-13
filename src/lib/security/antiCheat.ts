import { supabase } from '../supabase';
import { socket } from '../socket';
import type { GameAction } from '../../types';

class AntiCheatSystem {
  private readonly SUSPICIOUS_THRESHOLD = 0.95;
  private readonly TIME_WINDOW = 5 * 60 * 1000; // 5 minutes
  private actionLog: Map<string, GameAction[]> = new Map();
  private suspiciousPlayers: Set<string> = new Set();

  async validateAction(
    sessionId: string,
    userId: string,
    action: GameAction
  ): Promise<boolean> {
    // Check if player is already flagged
    if (this.suspiciousPlayers.has(userId)) {
      await this.reportViolation(sessionId, userId, 'flagged_player_action');
      return false;
    }

    // Get user's recent actions
    const userActions = this.actionLog.get(userId) || [];
    const recentActions = userActions.filter(a => 
      Date.now() - new Date(a.timestamp).getTime() < this.TIME_WINDOW
    );

    // Update action log
    this.actionLog.set(userId, [...recentActions, action]);

    // Validate action timing
    if (!this.validateActionTiming(action, recentActions)) {
      await this.reportViolation(sessionId, userId, 'suspicious_timing');
      return false;
    }

    // Validate bet patterns
    if (action.type === 'bet' && !this.validateBetPattern(action, recentActions)) {
      await this.reportViolation(sessionId, userId, 'suspicious_betting');
      return false;
    }

    return true;
  }

  private validateActionTiming(action: GameAction, recentActions: GameAction[]): boolean {
    if (recentActions.length < 2) return true;

    // Calculate average time between actions
    const timings = recentActions.map(a => new Date(a.timestamp).getTime());
    const intervals = timings.slice(1).map((time, i) => time - timings[i]);
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const stdDev = Math.sqrt(
      intervals.reduce((a, b) => a + Math.pow(b - avgInterval, 2), 0) / intervals.length
    );

    // Check if current action timing is suspiciously regular
    const currentInterval = new Date(action.timestamp).getTime() - timings[timings.length - 1];
    return Math.abs(currentInterval - avgInterval) > stdDev * 0.5;
  }

  private validateBetPattern(action: GameAction, recentActions: GameAction[]): boolean {
    const bets = recentActions
      .filter(a => a.type === 'bet')
      .map(a => a.data.amount);

    if (bets.length < 3) return true;

    // Check for suspicious betting patterns
    const pattern = this.detectPattern(bets);
    return pattern < this.SUSPICIOUS_THRESHOLD;
  }

  private detectPattern(numbers: number[]): number {
    if (numbers.length < 3) return 0;

    let patternScore = 0;
    const n = numbers.length;

    // Check for arithmetic progression
    const diffs = numbers.slice(1).map((num, i) => num - numbers[i]);
    const isArithmetic = diffs.every(diff => Math.abs(diff - diffs[0]) < 0.01);
    if (isArithmetic) patternScore += 0.5;

    // Check for geometric progression
    const ratios = numbers.slice(1).map((num, i) => num / numbers[i]);
    const isGeometric = ratios.every(ratio => Math.abs(ratio - ratios[0]) < 0.01);
    if (isGeometric) patternScore += 0.5;

    // Check for repeating sequences
    const sequences = new Set(
      numbers.map((_, i) => 
        numbers.slice(i, i + 3).join(',')
      )
    );
    if (sequences.size < n / 2) patternScore += 0.3;

    return patternScore;
  }

  private async reportViolation(sessionId: string, userId: string, type: string) {
    try {
      await supabase.from('security_violations').insert([{
        session_id: sessionId,
        user_id: userId,
        violation_type: type,
        data: {
          recentActions: this.actionLog.get(userId)
        }
      }]);

      this.suspiciousPlayers.add(userId);

      socket.emit('security_alert', {
        sessionId,
        userId,
        type,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error reporting violation:', error);
    }
  }
}

export const antiCheat = new AntiCheatSystem();