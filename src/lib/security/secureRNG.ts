import { supabase } from '../supabase';
import { socket } from '../socket';
import { sha256 } from './crypto';

class SecureRNG {
  private readonly SEED_LENGTH = 32;
  private readonly HASH_ROUNDS = 1000;
  private seeds: Map<string, string> = new Map();
  private sequences: Map<string, number[]> = new Map();

  async initializeSession(sessionId: string): Promise<string> {
    // Generate cryptographically secure seed
    const seed = await this.generateSecureSeed();
    this.seeds.set(sessionId, seed);

    // Store seed hash in database for verification
    await this.storeSeedHash(sessionId, seed);

    return seed;
  }

  private async generateSecureSeed(): Promise<string> {
    // Generate random bytes using Web Crypto API
    const array = new Uint8Array(this.SEED_LENGTH);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private async storeSeedHash(sessionId: string, seed: string) {
    const hash = await sha256(seed);
    await supabase
      .from('game_seeds')
      .insert([{
        session_id: sessionId,
        seed_hash: hash,
        created_at: new Date().toISOString()
      }]);
  }

  async generateNumber(sessionId: string, min: number, max: number): Promise<number> {
    const seed = this.seeds.get(sessionId);
    if (!seed) throw new Error('Session not initialized');

    const sequence = this.sequences.get(sessionId) || [];
    const currentIndex = sequence.length;

    // Generate next number in sequence
    const hash = await this.hashWithNonce(seed, currentIndex);
    const number = this.hashToNumber(hash, min, max);

    // Store in sequence
    sequence.push(number);
    this.sequences.set(sessionId, sequence);

    // Log for verification
    await this.logRandomNumber(sessionId, number, currentIndex);

    return number;
  }

  private async hashWithNonce(seed: string, nonce: number): Promise<string> {
    let hash = seed + nonce.toString();
    
    // Multiple rounds of hashing for additional security
    for (let i = 0; i < this.HASH_ROUNDS; i++) {
      hash = await sha256(hash);
    }
    
    return hash;
  }

  private hashToNumber(hash: string, min: number, max: number): number {
    // Convert hash to a number between 0 and 1
    const decimal = parseInt(hash.slice(0, 16), 16) / 0xffffffffffffffff;
    
    // Scale to range
    return Math.floor(decimal * (max - min + 1)) + min;
  }

  private async logRandomNumber(sessionId: string, number: number, index: number) {
    await supabase
      .from('random_number_log')
      .insert([{
        session_id: sessionId,
        number,
        sequence_index: index,
        created_at: new Date().toISOString()
      }]);
  }

  async verifySequence(sessionId: string): Promise<boolean> {
    const seed = this.seeds.get(sessionId);
    const sequence = this.sequences.get(sessionId);
    if (!seed || !sequence) return false;

    // Verify each number in sequence
    for (let i = 0; i < sequence.length; i++) {
      const hash = await this.hashWithNonce(seed, i);
      const expectedNumber = this.hashToNumber(hash, 0, Number.MAX_SAFE_INTEGER);
      if (sequence[i] !== expectedNumber) {
        await this.reportVerificationFailure(sessionId, i);
        return false;
      }
    }

    return true;
  }

  private async reportVerificationFailure(sessionId: string, index: number) {
    await supabase
      .from('security_violations')
      .insert([{
        session_id: sessionId,
        violation_type: 'rng_verification_failed',
        data: {
          sequence_index: index,
          timestamp: new Date().toISOString()
        }
      }]);

    socket.emit('security_alert', {
      type: 'rng_verification_failed',
      sessionId,
      index,
      timestamp: new Date().toISOString()
    });
  }

  async revealSeed(sessionId: string): Promise<void> {
    const seed = this.seeds.get(sessionId);
    if (!seed) return;

    // Store seed for verification
    await supabase
      .from('game_seeds')
      .update({ revealed_seed: seed })
      .eq('session_id', sessionId);

    // Clean up
    this.seeds.delete(sessionId);
    this.sequences.delete(sessionId);
  }
}

export const secureRNG = new SecureRNG();