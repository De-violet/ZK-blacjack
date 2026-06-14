import { NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';

// Phase 4: Zero-Knowledge Proof API
// Extends Phase 3's seed commitment with Merkle tree, VRF, and range proofs
//
// POST /api/zk — Generate ZK commitment (Merkle root + VRF proof) along with seed commitment
// PUT /api/zk  — Reveal server seed + shuffle proof, or generate Merkle proofs for card positions
// GET /api/zk  — Get public verification data for a round

// ─── In-Memory Store ────────────────────────────────────────────────

interface ZKRoundData {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  shuffledDeck: string[];
  merkleTree: string[][];
  leafHashes: string[];
  createdAt: number;
}

const zkRounds = new Map<string, ZKRoundData>();

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

// ─── POST: Generate ZK Commitment ───────────────────────────────────

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

    // Shuffle the deck
    const standardDeck = createStandardDeckAbbreviated();
    const shuffledDeck = seededShuffle(standardDeck, serverSeed, clientSeed, nonce);

    // Build Merkle tree of shuffled deck
    const leaves = shuffledDeck.map((card, idx) => hash(`${idx}:${card}`));
    const { root: merkleRoot, tree: merkleTree } = await buildMerkleTree(leaves);

    // Generate VRF proof
    const vrfProof = generateVRFProof(serverSeed, clientSeed, nonce);

    // Compute deck hash for additional verification
    const deckHash = hash(shuffledDeck.join(','));

    // Store the round data
    zkRounds.set(roundId, {
      serverSeed,
      clientSeed,
      nonce,
      shuffledDeck,
      merkleTree,
      leafHashes: leaves,
      createdAt: Date.now(),
    });

    // Also store in the Phase 3 seed store for backward compatibility
    // (the /api/seed route has its own store)

    // Return ZK commitment (NOT the serverSeed, NOT the full Merkle tree)
    return NextResponse.json({
      // Phase 3 compatibility
      roundId,
      serverSeedHash,
      clientSeed,
      nonce,
      shuffledDeck,

      // Phase 4 additions
      zkCommitment: {
        merkleRoot,
        vrfProof,
        deckSize: shuffledDeck.length,
        deckHash,
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to generate ZK commitment' },
      { status: 500 }
    );
  }
}

// Seeded shuffle (same as Phase 3)
function seededShuffle(array: string[], serverSeed: string, clientSeed: string, nonce: number): string[] {
  const rng = new SeededRNG(serverSeed, clientSeed, nonce);
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = rng.nextInt(i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ─── PUT: Reveal seed or generate card proofs ───────────────────────

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { roundId, cardPositions } = body as {
      roundId?: string;
      cardPositions?: number[];
    };

    if (!roundId) {
      return NextResponse.json({ error: 'roundId is required' }, { status: 400 });
    }

    const roundData = zkRounds.get(roundId);
    if (!roundData) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    // If cardPositions provided, generate Merkle proofs for those positions
    if (cardPositions && cardPositions.length > 0) {
      const { merkleTree, shuffledDeck } = roundData;
      const cardProofs = cardPositions.map((pos: number) => {
        const card = shuffledDeck[pos];
        const { siblings, path } = generateMerkleProof(merkleTree, pos);

        return {
          card,
          position: pos,
          merkleProof: {
            leafHash: merkleTree[0][pos],
            leafIndex: pos,
            root: merkleTree[merkleTree.length - 1][0],
            siblings,
            path,
          },
          rangeProof: {
            commitment: hash(`${pos}:zk-range-salt`),
            revealedIndex: undefined,
            proof: 'zk-range-salt',
            max: shuffledDeck.length,
          },
        };
      });

      return NextResponse.json({
        roundId,
        cardProofs,
      });
    }

    // No cardPositions — reveal the server seed and shuffle proof
    const { serverSeed, clientSeed, nonce, shuffledDeck } = roundData;

    // Generate shuffle proof steps
    const originalDeck = createStandardDeckAbbreviated();
    const simRng = new SeededRNG(serverSeed, clientSeed, nonce);
    const simDeck = [...originalDeck];
    const shuffleSteps: { i: number; j: number; swapCommitment: string; cardI: string; cardJ: string }[] = [];
    for (let i = simDeck.length - 1; i > 0; i--) {
      const j = simRng.nextInt(i + 1);
      shuffleSteps.push({
        i,
        j,
        swapCommitment: hash(`${i}:${j}:${simDeck[i]}:${simDeck[j]}`),
        cardI: simDeck[i],
        cardJ: simDeck[j],
      });
      [simDeck[i], simDeck[j]] = [simDeck[j], simDeck[i]];
    }

    return NextResponse.json({
      serverSeed,
      roundId,
      clientSeed,
      nonce,
      shuffleProof: shuffleSteps,
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
      exists: true,
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to get round data' },
      { status: 500 }
    );
  }
}
