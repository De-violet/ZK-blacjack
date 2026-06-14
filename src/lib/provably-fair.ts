// Provably Fair Hash Commitment System
// Phase 3 of the ZK Casino roadmap
// 
// How it works:
// 1. Before each round, the SERVER generates a random "serverSeed" and sends its SHA-256 hash (commitment)
// 2. The player provides a "clientSeed" (can be auto-generated)
// 3. The server shuffles the deck using serverSeed + clientSeed + nonce, and sends the shuffled deck to the client
// 4. After the round, the server reveals the serverSeed via API
// 5. The player can verify: hash(serverSeed) === commitment, and that re-shuffling produces the same deck
//
// This ensures the server cannot manipulate the deck after seeing the player's bet,
// because the commitment was made before the round started.

export interface SeedCommitment {
  /** Unique identifier for this round */
  roundId: string;
  /** SHA-256 hash of the serverSeed - sent BEFORE the round */
  serverSeedHash: string;
  /** The player's seed - chosen by the player or auto-generated */
  clientSeed: string;
  /** A nonce to ensure uniqueness across rounds */
  nonce: number;
  /** Shuffled deck order — ONLY available after round ends (seed reveal).
   *  During the game, this is EMPTY [] for genuine ZK.
   *  After the round, the reveal API provides the full deck for verification. */
  shuffledDeck: string[];
}

export interface RevealedSeed {
  /** The round identifier */
  roundId: string;
  /** The actual serverSeed - revealed AFTER the round */
  serverSeed: string;
  /** SHA-256 hash of the serverSeed - the original commitment */
  serverSeedHash: string;
  /** The player's seed */
  clientSeed: string;
  /** The nonce used */
  nonce: number;
}

export interface VerificationResult {
  /** Whether the hash commitment matches */
  hashMatches: boolean;
  /** Whether the shuffle produces the same deck order */
  shuffleMatches: boolean;
  /** The computed hash for display */
  computedHash: string;
  /** The original commitment hash for display */
  commitmentHash: string;
  /** Is this fully verified? */
  verified: boolean;
}

export interface RoundHistoryEntry {
  roundId: string;
  serverSeedHash: string;
  serverSeed?: string; // only after reveal
  clientSeed: string;
  nonce: number;
  shuffledDeck: string[];
  verified: boolean | null;
  timestamp: number;
}

/**
 * Generate a cryptographically secure random hex string
 */
export function generateRandomHex(length: number = 32): string {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    // Fallback for environments without crypto
    for (let i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Compute SHA-256 hash of a string and return hex digest
 */
export async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Synchronous hash function using a simple djb2-inspired algorithm.
 * Kept as a utility but NOT used for seed commitments — use sha256() instead.
 */
export function simpleHash(message: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < message.length; i++) {
    const ch = message.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  
  const combined = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return combined.toString(16).padStart(16, '0');
}

/**
 * Create a standard 312-card (6-deck) deck in abbreviated format.
 * The order is deterministic: 6 decks, each deck in suit-then-rank order.
 * Suits: hearts, diamonds, clubs, spades
 * Ranks: A, 2, 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K
 * 
 * This MUST match the server-side createStandardDeckAbbreviated() in route.ts
 */
export function createStandardDeckAbbreviated(): string[] {
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck: string[] = [];
  for (let d = 0; d < 6; d++) {
    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push(abbreviateCard(rank, suit));
      }
    }
  }
  return deck;
}

/**
 * Convert a rank+suit to abbreviated card format.
 * "A" + "hearts" → "Ah", "10" + "diamonds" → "10d", "K" + "spades" → "Ks"
 */
function abbreviateCard(rank: string, suit: string): string {
  const suitChar = suit[0].toLowerCase();
  return `${rank}${suitChar}`;
}

/**
 * Parse an abbreviated deck string back into Card objects for the game.
 * "Ah" → { rank: 'A', suit: 'hearts', faceUp: true }
 * "10d" → { rank: '10', suit: 'diamonds', faceUp: true }
 */
export function parseAbbreviatedDeck(abbreviatedDeck: string[]): Array<{ rank: string; suit: string; faceUp: boolean }> {
  const suitMap: Record<string, string> = {
    'h': 'hearts',
    'd': 'diamonds',
    'c': 'clubs',
    's': 'spades',
  };

  return abbreviatedDeck.map(abbr => {
    // Last character is always the suit abbreviation
    const suitChar = abbr[abbr.length - 1].toLowerCase();
    const rank = abbr.slice(0, -1); // Everything except last char
    const suit = suitMap[suitChar];
    
    if (!suit) {
      throw new Error(`Invalid suit abbreviation in card: ${abbr}`);
    }
    
    return { rank, suit, faceUp: true };
  });
}

/**
 * Verify a revealed seed against its commitment.
 * Checks both:
 * 1. SHA-256(serverSeed) === serverSeedHash (hash commitment)
 * 2. Re-shuffling a standard deck with the same seeds produces the same deck order
 */
export async function verifyRound(
  revealed: RevealedSeed,
  originalShuffledDeck: string[]
): Promise<VerificationResult> {
  // Verify the hash commitment
  const computedHash = await sha256(revealed.serverSeed);
  const hashMatches = computedHash === revealed.serverSeedHash;

  // Re-shuffle a standard deck using the revealed seeds
  const standardDeck = createStandardDeckAbbreviated();
  const reshuffled = seededShuffle(standardDeck, revealed.serverSeed, revealed.clientSeed, revealed.nonce);

  // Compare the re-shuffled deck with the original shuffled deck
  const deckMatches = reshuffled.join(',') === originalShuffledDeck.join(',');

  return {
    hashMatches,
    shuffleMatches: hashMatches && deckMatches,
    computedHash,
    commitmentHash: revealed.serverSeedHash,
    verified: hashMatches && deckMatches,
  };
}

/**
 * Seeded pseudo-random number generator (PRNG) using combined seeds
 * Uses a simple but effective xorshift algorithm
 * MUST match the server-side SeededRNG in route.ts
 */
export class SeededRNG {
  private state: number;
  
  constructor(serverSeed: string, clientSeed: string, nonce: number) {
    // Combine seeds to create initial state
    const combined = `${serverSeed}:${clientSeed}:${nonce}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    // Ensure non-zero state
    this.state = hash || 1;
    
    // Warm up the generator
    for (let i = 0; i < 10; i++) {
      this.next();
    }
  }
  
  /**
   * xorshift32 - fast, high-quality PRNG
   */
  private next(): number {
    let x = this.state;
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    this.state = x;
    return (x >>> 0) / 4294967296; // Normalize to [0, 1)
  }
  
  /**
   * Get a random integer in range [0, max)
   */
  nextInt(max: number): number {
    return Math.floor(this.next() * max);
  }
}

/**
 * Seeded Fisher-Yates shuffle
 * Deterministic given the same seeds and nonce
 */
export function seededShuffle<T>(array: T[], serverSeed: string, clientSeed: string, nonce: number): T[] {
  const rng = new SeededRNG(serverSeed, clientSeed, nonce);
  const shuffled = [...array];
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = rng.nextInt(i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

/**
 * Generate a client seed with a user-friendly format
 */
export function generateClientSeed(): string {
  const adjectives = ['lucky', 'golden', 'swift', 'bold', 'keen', 'wise', 'wild', 'cool', 'fast', 'pure'];
  const nouns = ['ace', 'king', 'queen', 'jack', 'spade', 'heart', 'diamond', 'club', 'star', 'moon'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 9999);
  return `${adj}-${noun}-${num}`;
}
