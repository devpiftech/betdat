import { supabase } from '../supabase';
import { secureRNG } from '../security/secureRNG';
import { sha256 } from '../security/crypto';

class FairnessVerifier {
  async verifyGameOutcome(
    sessionId: string,
    gameType: string,
    outcome: any,
    serverSeed: string,
    clientSeed: string,
    nonce: number
  ): Promise<boolean> {
    try {
      // Verify server seed matches stored hash
      const isValidSeed = await this.verifyServerSeed(sessionId, serverSeed);
      if (!isValidSeed) return false;

      // Generate expected outcome
      const expectedOutcome = await this.generateExpectedOutcome(
        gameType,
        serverSeed,
        clientSeed,
        nonce
      );

      // Compare outcomes
      return this.compareOutcomes(outcome, expectedOutcome);
    } catch (error) {
      console.error('Error verifying game outcome:', error);
      return false;
    }
  }

  private async verifyServerSeed(sessionId: string, serverSeed: string): Promise<boolean> {
    const { data: seedData } = await supabase
      .from('game_seeds')
      .select('seed_hash')
      .eq('session_id', sessionId)
      .single();

    if (!seedData) return false;

    const hash = await sha256(serverSeed);
    return hash === seedData.seed_hash;
  }

  private async generateExpectedOutcome(
    gameType: string,
    serverSeed: string,
    clientSeed: string,
    nonce: number
  ): Promise<any> {
    // Generate deterministic hash based on seeds and nonce
    const combinedSeed = `${serverSeed}-${clientSeed}-${nonce}`;
    const hash = await sha256(combinedSeed);

    // Convert hash to game-specific outcome
    switch (gameType) {
      case 'slots':
        return this.generateSlotOutcome(hash);
      case 'roulette':
        return this.generateRouletteOutcome(hash);
      case 'cards':
        return this.generateCardOutcome(hash);
      default:
        throw new Error(`Unsupported game type: ${gameType}`);
    }
  }

  private generateSlotOutcome(hash: string): number[] {
    const outcomes: number[] = [];
    for (let i = 0; i < 3; i++) {
      const value = parseInt(hash.slice(i * 8, (i + 1) * 8), 16);
      outcomes.push(value % 6); // 6 different symbols
    }
    return outcomes;
  }

  private generateRouletteOutcome(hash: string): number {
    const value = parseInt(hash.slice(0, 8), 16);
    return value % 37; // 0-36 for roulette
  }

  private generateCardOutcome(hash: string): number {
    const value = parseInt(hash.slice(0, 8), 16);
    return value % 52; // 0-51 for a deck of cards
  }

  private compareOutcomes(actual: any, expected: any): boolean {
    return JSON.stringify(actual) === JSON.stringify(expected);
  }

  async generateClientSeed(): Promise<string> {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  async verifyFairness(sessionId: string): Promise<{
    isValid: boolean;
    details: any;
  }> {
    try {
      const { data: gameData } = await supabase
        .from('game_history')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (!gameData) {
        return {
          isValid: false,
          details: { error: 'Game data not found' }
        };
      }

      const { data: seedData } = await supabase
        .from('game_seeds')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (!seedData || !seedData.revealed_seed) {
        return {
          isValid: false,
          details: { error: 'Seed data not found or not revealed' }
        };
      }

      const isValid = await this.verifyGameOutcome(
        sessionId,
        gameData.game_type,
        gameData.outcome,
        seedData.revealed_seed,
        gameData.client_seed,
        gameData.nonce
      );

      return {
        isValid,
        details: {
          serverSeed: seedData.revealed_seed,
          clientSeed: gameData.client_seed,
          nonce: gameData.nonce,
          outcome: gameData.outcome,
          verificationHash: await sha256(
            `${seedData.revealed_seed}-${gameData.client_seed}-${gameData.nonce}`
          )
        }
      };
    } catch (error) {
      console.error('Error verifying fairness:', error);
      return {
        isValid: false,
        details: { error: 'Verification failed' }
      };
    }
  }
}

export const fairnessVerifier = new FairnessVerifier();