import CryptoJS from 'crypto-js';
import seedrandom from 'seedrandom';
import { supabase } from '../supabase';

class FairnessVerifier {
  private readonly HASH_ITERATIONS = 1000;

  async generateServerSeed(): Promise<string> {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  async generateClientSeed(): Promise<string> {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  async hashSeed(seed: string): Promise<string> {
    let hash = seed;
    for (let i = 0; i < this.HASH_ITERATIONS; i++) {
      hash = CryptoJS.SHA256(hash).toString();
    }
    return hash;
  }

  generateGameNumbers(
    serverSeed: string,
    clientSeed: string,
    nonce: number,
    count: number,
    min: number,
    max: number
  ): number[] {
    const numbers: number[] = [];
    const rng = seedrandom(`${serverSeed}-${clientSeed}-${nonce}`);
    
    for (let i = 0; i < count; i++) {
      const randomValue = rng();
      numbers.push(Math.floor(randomValue * (max - min + 1)) + min);
    }
    
    return numbers;
  }

  async verifyGameOutcome(
    gameType: string,
    outcome: any,
    serverSeed: string,
    clientSeed: string,
    nonce: number
  ): Promise<boolean> {
    const expectedNumbers = this.generateGameNumbers(
      serverSeed,
      clientSeed,
      nonce,
      gameType === 'slots' ? 9 : 1, // 9 for slots (3x3 grid), 1 for other games
      0,
      gameType === 'slots' ? 5 : 36 // 0-5 for slots symbols, 0-36 for roulette
    );

    switch (gameType) {
      case 'slots':
        return this.verifySlotsOutcome(outcome, expectedNumbers);
      case 'roulette':
        return this.verifyRouletteOutcome(outcome, expectedNumbers[0]);
      default:
        throw new Error(`Unsupported game type: ${gameType}`);
    }
  }

  private verifySlotsOutcome(outcome: number[][], expected: number[]): boolean {
    const flatOutcome = outcome.flat();
    return flatOutcome.every((num, i) => num === expected[i]);
  }

  private verifyRouletteOutcome(outcome: number, expected: number): boolean {
    return outcome === expected;
  }

  async storeGameResult(
    sessionId: string,
    gameType: string,
    outcome: any,
    serverSeed: string,
    clientSeed: string,
    nonce: number
  ): Promise<void> {
    const verificationHash = await this.hashSeed(
      `${serverSeed}-${clientSeed}-${nonce}`
    );

    await supabase.from('game_results').insert([{
      session_id: sessionId,
      game_type: gameType,
      outcome,
      server_seed_hash: await this.hashSeed(serverSeed),
      client_seed: clientSeed,
      nonce,
      verification_hash: verificationHash
    }]);
  }

  async verifyFairness(sessionId: string): Promise<{
    isValid: boolean;
    details: any;
  }> {
    const { data: result } = await supabase
      .from('game_results')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (!result) {
      return {
        isValid: false,
        details: { error: 'Game result not found' }
      };
    }

    const isValid = await this.verifyGameOutcome(
      result.game_type,
      result.outcome,
      result.server_seed,
      result.client_seed,
      result.nonce
    );

    return {
      isValid,
      details: {
        serverSeed: result.server_seed,
        clientSeed: result.client_seed,
        nonce: result.nonce,
        verificationHash: result.verification_hash
      }
    };
  }
}

export const fairnessVerifier = new FairnessVerifier();