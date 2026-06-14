import { NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';

// API endpoint for generating provably fair seed commitments
// This runs server-side so the serverSeed is never exposed to the client until revealed
//
// ZK FIX: The shuffled deck is NEVER sent to the client during play.
// Cards are dealt via /api/zk/deal (or /api/seed/deal) with Merkle proofs.
// The full deck is ONLY revealed after the round via PUT.

// In-memory store for pending seeds (in production, use a database)
interface SeedRoundData {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  shuffledDeck: string[];
  merkleTree: string[][];
  leafHashes: string[];
  nextPosition: number;
  createdAt: number;
  revealed: boolean;
}

// Use globalThis so the /api/seed/deal route can access the same store
const getPendingSeeds = (): Map<string, SeedRoundData> => {
  if (!(globalThis as Record<string, unknown>).__seedRounds) {
    (globalThis as Record<string, unknown>).__seedRounds = new Map<string, SeedRoundData>();
  }
  return (globalThis as Record<string, unknown>).__seedRounds as Map<string, SeedRoundData>;
};

const pendingSeeds = getPendingSeeds();

// Clean up seeds older than 1 hour
function cleanupOldSeeds() {
  const oneHourAgo = Date.now() - 3600000;
  for (const [roundId, data] of pendingSeeds.entries()) {
    if (data.createdAt < oneHourAgo) {
      pendingSeeds.delete(roundId);
    }
  }
}

// Simple hash function for server-side commitment
function serverHash(message: string): string {
  return createHash('sha256').update(message).digest('hex');
}

function generateHex(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

// ─── Server-side Seeded RNG (must match client-side SeededRNG in provably-fair.ts) ───

class SeededRNG {
  private state: number;

  constructor(serverSeed: string, clientSeed: string, nonce: number) {
    const combined = `${serverSeed}:${clientSeed}:${nonce}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    this.state = hash || 1;
    // Warm up the generator
    for (let i = 0; i < 10; i++) {
      this.next();
    }
  }

  private next(): number {
    let x = this.state;
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    this.state = x;
    return (x >>> 0) / 4294967296;
  }

  nextInt(max: number): number {
    return Math.floor(this.next() * max);
  }
}

// ─── Standard Deck Construction (must match client-side createStandardDeckAbbreviated) ───

// Suits and ranks in deterministic order — same as used in blackjack.ts
const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;

// Abbreviated format: "Ah" = Ace hearts, "10d" = 10 diamonds, "Ks" = King spades
function abbreviateCard(rank: string, suit: string): string {
  const suitChar = suit[0].toLowerCase(); // h, d, c, s
  return `${rank}${suitChar}`;
}

/**
 * Create a standard 312-card deck (6 decks) in deterministic order,
 * returned as abbreviated strings like ["Ah", "2h", ..., "Ks", "Ah", ...]
 */
function createStandardDeckAbbreviated(): string[] {
  const deck: string[] = [];
  for (let d = 0; d < 6; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push(abbreviateCard(rank, suit));
      }
    }
  }
  return deck;
}

/**
 * Seeded Fisher-Yates shuffle on an array of strings
 */
function seededShuffle(array: string[], serverSeed: string, clientSeed: string, nonce: number): string[] {
  const rng = new SeededRNG(serverSeed, clientSeed, nonce);
  const shuffled = [...array];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = rng.nextInt(i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

// Build Merkle tree from leaves (server-side sync version)
function buildMerkleTree(leaves: string[]): { root: string; tree: string[][] } {
  const n = leaves.length;
  const paddedSize = Math.pow(2, Math.ceil(Math.log2(Math.max(n, 1))));
  const padded = [...leaves];
  while (padded.length < paddedSize) {
    padded.push(serverHash('EMPTY'));
  }

  const tree: string[][] = [padded];
  let current = padded;

  while (current.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < current.length; i += 2) {
      next.push(serverHash(current[i] + current[i + 1]));
    }
    tree.push(next);
    current = next;
  }

  return { root: current[0], tree };
}

// ─── API Handlers ───

export async function POST(request: Request) {
  try {
    cleanupOldSeeds();

    const body = await request.json().catch(() => ({}));
    const clientSeed = body.clientSeed || generateHex(16);

    // Generate server seed
    const serverSeed = generateHex(32);
    const roundId = generateHex(8);
    const nonce = Date.now();

    // Create commitment hash
    const serverSeedHash = serverHash(serverSeed);

    // Shuffle the deck server-side using the seeds
    const standardDeck = createStandardDeckAbbreviated();
    const shuffledDeck = seededShuffle(standardDeck, serverSeed, clientSeed, nonce);

    // Build Merkle tree for the shuffled deck
    const leafHashes = shuffledDeck.map((card, idx) => serverHash(`${idx}:${card}`));
    const { root: merkleRoot, tree: merkleTree } = buildMerkleTree(leafHashes);

    // Store the round data (including deck and merkle tree) on the server
    // Client never sees the deck or merkle tree during play
    pendingSeeds.set(roundId, {
      serverSeed,
      clientSeed,
      nonce,
      shuffledDeck,
      merkleTree,
      leafHashes,
      nextPosition: 0,
      createdAt: Date.now(),
      revealed: false,
    });

    // Return commitment — CRITICALLY: NO shuffledDeck, NO merkleTree
    return NextResponse.json({
      roundId,
      serverSeedHash,
      clientSeed,
      nonce,
      // Phase 3 compatibility: deck NOT sent during play
      shuffledDeck: [],
      // ZK-compatible additions
      merkleRoot,
      deckSize: shuffledDeck.length,
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to generate seed commitment' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { roundId } = body;

    if (!roundId) {
      return NextResponse.json(
        { error: 'roundId is required' },
        { status: 400 }
      );
    }

    const roundData = pendingSeeds.get(roundId);
    if (!roundData) {
      return NextResponse.json(
        { error: 'Seed not found or already revealed' },
        { status: 404 }
      );
    }

    if (roundData.revealed) {
      return NextResponse.json(
        { error: 'Round already revealed' },
        { status: 410 }
      );
    }

    // Mark as revealed
    roundData.revealed = true;

    const { serverSeed, clientSeed, nonce, shuffledDeck } = roundData;

    // NOW we can send the full deck — round is over
    // Client can verify: SHA-256(serverSeed) === serverSeedHash
    // AND re-shuffling produces the same deck
    return NextResponse.json({
      serverSeed,
      roundId,
      clientSeed,
      nonce,
      shuffledDeck,
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to reveal seed' },
      { status: 500 }
    );
  }
}

// ─── GET: Get public verification data ──────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roundId = searchParams.get('roundId');

    if (!roundId) {
      return NextResponse.json({ error: 'roundId is required' }, { status: 400 });
    }

    const roundData = pendingSeeds.get(roundId);
    if (!roundData) {
      return NextResponse.json({ error: 'Round not found or already revealed' }, { status: 404 });
    }

    return NextResponse.json({
      roundId,
      merkleRoot: roundData.merkleTree[roundData.merkleTree.length - 1][0],
      deckSize: roundData.shuffledDeck.length,
      dealtCount: roundData.nextPosition,
      exists: true,
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to get round data' },
      { status: 500 }
    );
  }
}

// ─── Export the store for the /api/seed/deal route ──────────────────
// We use globalThis so the /api/seed/deal route can access the same store
export { pendingSeeds as seedRounds };
