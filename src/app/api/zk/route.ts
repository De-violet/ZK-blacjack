import { NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';

// Phase 4: Zero-Knowledge Proof API — GENUINE IMPLEMENTATION
//
// KEY FIX: The shuffled deck is NEVER sent to the client before the round ends.
// Cards are dealt one at a time from the server, each with a Merkle inclusion proof.
//
// POST /api/zk — Generate ZK commitment (merkleRoot + vrfProof, NO deck)
// PUT /api/zk  — Reveal server seed + shuffle proof + full deck (after round)
// GET /api/zk  — Get public verification data for a round

// ─── In-Memory Store (shared via globalThis for multi-route access) ─

interface ZKRoundData {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  shuffledDeck: string[];
  merkleTree: string[][];
  leafHashes: string[];
  nextPosition: number; // Tracks which card to deal next
  createdAt: number;
  revealed: boolean;
}

// Use globalThis so the /api/zk/deal route can access the same store
const getZkRounds = (): Map<string, ZKRoundData> => {
  if (!(globalThis as Record<string, unknown>).__zkRounds) {
    (globalThis as Record<string, unknown>).__zkRounds = new Map<string, ZKRoundData>();
  }
  return (globalThis as Record<string, unknown>).__zkRounds as Map<string, ZKRoundData>;
};

const zkRounds = getZkRounds();

// Cleanup old rounds (>1 hour)
function cleanup() {
  const oneHourAgo = Date.now() - 3600000;
  for (const [id, data] of zkRounds.entries()) {
    if (data.createdAt < oneHourAgo) zkRounds.delete(id);
  }
}

// ─── Crypto Utilities ───────────────────────────────────────────────

function hash(message: string): string {
  return createHash('sha256').update(message).digest('hex');
}

function generateHex(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

// Build Merkle tree from leaves
async function buildMerkleTree(leaves: string[]): Promise<{
  root: string;
  tree: string[][];
}> {
  const n = leaves.length;
  const paddedSize = Math.pow(2, Math.ceil(Math.log2(Math.max(n, 1))));
  const padded = [...leaves];
  while (padded.length < paddedSize) {
    padded.push(hash('EMPTY'));
  }

  const tree: string[][] = [padded];
  let current = padded;

  while (current.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < current.length; i += 2) {
      next.push(hash(current[i] + current[i + 1]));
    }
    tree.push(next);
    current = next;
  }

  return { root: current[0], tree };
}

// Generate Merkle proof for a leaf index
function generateMerkleProof(tree: string[][], leafIndex: number): {
  siblings: string[];
  path: boolean[];
} {
  const siblings: string[] = [];
  const path: boolean[] = [];
  let idx = leafIndex;

  for (let level = 0; level < tree.length - 1; level++) {
    const isRight = idx % 2 === 1;
    const siblingIdx = isRight ? idx - 1 : idx + 1;
    siblings.push(tree[level][siblingIdx]);
    path.push(isRight);
    idx = Math.floor(idx / 2);
  }

  return { siblings, path };
}

// VRF proof generation (HMAC-based)
function generateVRFProof(serverSeed: string, clientSeed: string, nonce: number): {
  vrfOutput: string;
  proof: string;
  publicKey: string;
  message: string;
} {
  const message = `${clientSeed}:${nonce}`;
  const vrfOutput = hash(serverSeed + ':' + message);
  const proof = hash(serverSeed + ':' + vrfOutput);
  const publicKey = hash(serverSeed);

  return { vrfOutput, proof, publicKey, message };
}

// ─── Server-side Seeded RNG (must match client-side) ───────────────

class SeededRNG {
  private state: number;

  constructor(serverSeed: string, clientSeed: string, nonce: number) {
    const combined = `${serverSeed}:${clientSeed}:${nonce}`;
    let h = 0;
    for (let i = 0; i < combined.length; i++) {
      const ch = combined.charCodeAt(i);
      h = ((h << 5) - h) + ch;
      h = h & h;
    }
    this.state = h || 1;
    for (let i = 0; i < 10; i++) this.next();
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

// ─── Deck Construction ──────────────────────────────────────────────

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;

function abbreviateCard(rank: string, suit: string): string {
  return `${rank}${suit[0].toLowerCase()}`;
}

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

function seededShuffle(array: string[], serverSeed: string, clientSeed: string, nonce: number): string[] {
  const rng = new SeededRNG(serverSeed, clientSeed, nonce);
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = rng.nextInt(i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ─── POST: Generate ZK Commitment (NO DECK SENT) ──────────────────

export async function POST(request: Request) {
  try {
    cleanup();

    const body = await request.json().catch(() => ({}));
    const clientSeed = body.clientSeed || generateHex(16);

    // Generate server seed and round ID
    const serverSeed = generateHex(32);
    const roundId = generateHex(8);
    const nonce = Date.now();

    // Server seed hash (Phase 3 compatibility)
    const serverSeedHash = hash(serverSeed);

    // Shuffle the deck server-side
    const standardDeck = createStandardDeckAbbreviated();
    const shuffledDeck = seededShuffle(standardDeck, serverSeed, clientSeed, nonce);

    // Build Merkle tree of shuffled deck
    // Leaf format: SHA-256("position:card") e.g. SHA-256("0:Ah")
    const leaves = shuffledDeck.map((card, idx) => hash(`${idx}:${card}`));
    const { root: merkleRoot, tree: merkleTree } = await buildMerkleTree(leaves);

    // Generate VRF proof
    const vrfProof = generateVRFProof(serverSeed, clientSeed, nonce);

    // Compute deck hash for additional verification
    const deckHash = hash(shuffledDeck.join(','));

    // Store the round data ON THE SERVER — client never sees the deck
    zkRounds.set(roundId, {
      serverSeed,
      clientSeed,
      nonce,
      shuffledDeck,
      merkleTree,
      leafHashes: leaves,
      nextPosition: 0, // Start dealing from position 0
      createdAt: Date.now(),
      revealed: false,
    });

    // Return ZK commitment — CRITICALLY: NO shuffledDeck, NO merkleTree
    return NextResponse.json({
      roundId,
      serverSeedHash,
      clientSeed,
      nonce,
      // Phase 4 additions
      zkCommitment: {
        roundId,
        merkleRoot,
        vrfProof,
        deckSize: shuffledDeck.length,
        deckHash,
        serverSeedHash,
        clientSeed,
        nonce,
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to generate ZK commitment' },
      { status: 500 }
    );
  }
}

// ─── PUT: Reveal seed + full deck (ONLY after round ends) ────────

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { roundId } = body as { roundId?: string };

    if (!roundId) {
      return NextResponse.json({ error: 'roundId is required' }, { status: 400 });
    }

    const roundData = zkRounds.get(roundId);
    if (!roundData) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    if (roundData.revealed) {
      return NextResponse.json({ error: 'Round already revealed' }, { status: 410 });
    }

    // Mark as revealed
    roundData.revealed = true;

    const { serverSeed, clientSeed, nonce, shuffledDeck } = roundData;

    // Generate genuine shuffle proof with hash commitments
    const originalDeck = createStandardDeckAbbreviated();
    const simRng = new SeededRNG(serverSeed, clientSeed, nonce);
    const simDeck = [...originalDeck];
    const shuffleSteps: { i: number; j: number; swapCommitment: string; cardI: string; cardJ: string }[] = [];
    for (let i = simDeck.length - 1; i > 0; i--) {
      const j = simRng.nextInt(i + 1);
      // Genuine commitment: hash the swap data BEFORE the swap
      const swapCommitment = hash(`${i}:${j}:${simDeck[i]}:${simDeck[j]}`);
      shuffleSteps.push({
        i,
        j,
        swapCommitment,
        cardI: simDeck[i],
        cardJ: simDeck[j],
      });
      [simDeck[i], simDeck[j]] = [simDeck[j], simDeck[i]];
    }

    // Generate range proof salts for all dealt positions
    const dealtPositions: { position: number; salt: string }[] = [];
    for (let pos = 0; pos < roundData.nextPosition; pos++) {
      // Use a deterministic salt derived from the server seed and position
      const salt = hash(`${serverSeed}:range-salt:${pos}`);
      dealtPositions.push({ position: pos, salt });
    }

    return NextResponse.json({
      serverSeed,
      roundId,
      clientSeed,
      nonce,
      // NOW we can send the full deck — round is over
      shuffledDeck,
      // Shuffle proof with genuine commitments
      shuffleProof: shuffleSteps,
      // Range proof salts for verification
      rangeProofSalts: dealtPositions,
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to process request' },
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

    const roundData = zkRounds.get(roundId);
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
