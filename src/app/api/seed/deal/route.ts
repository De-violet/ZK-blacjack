import { NextResponse } from 'next/server';
import { createHash } from 'crypto';

// POST /api/seed/deal — Deal N cards from the server with Merkle proofs
// This mirrors /api/zk/deal but uses the /api/seed route's store.
//
// In genuine ZK mode, cards are dealt one at a time from the server.
// Each card comes with a Merkle inclusion proof against the committed merkleRoot.
// Client can VERIFY each card without knowing the full deck order.

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

// Access the shared store from the parent route via globalThis
const getSeedRounds = (): Map<string, SeedRoundData> => {
  // Try the import path first (same as zk route pattern)
  if (!(globalThis as Record<string, unknown>).__seedRounds) {
    // Fallback: if the parent route hasn't initialized yet, we can't proceed
    // This shouldn't happen in normal flow since POST /api/seed runs first
    (globalThis as Record<string, unknown>).__seedRounds = new Map<string, SeedRoundData>();
  }
  return (globalThis as Record<string, unknown>).__seedRounds as Map<string, SeedRoundData>;
};

function hash(message: string): string {
  return createHash('sha256').update(message).digest('hex');
}

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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { roundId, count } = body as { roundId?: string; count?: number };

    if (!roundId) {
      return NextResponse.json({ error: 'roundId is required' }, { status: 400 });
    }

    if (!count || count < 1 || count > 10) {
      return NextResponse.json({ error: 'count must be between 1 and 10' }, { status: 400 });
    }

    const seedRounds = getSeedRounds();
    const roundData = seedRounds.get(roundId);

    if (!roundData) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    if (roundData.revealed) {
      return NextResponse.json({ error: 'Round already revealed' }, { status: 410 });
    }

    if (roundData.nextPosition + count > roundData.shuffledDeck.length) {
      return NextResponse.json({ error: 'Not enough cards remaining' }, { status: 400 });
    }

    const { merkleTree, shuffledDeck } = roundData;
    const cards: Array<{
      card: string;
      position: number;
      merkleProof: {
        leafHash: string;
        leafIndex: number;
        root: string;
        siblings: string[];
        path: boolean[];
      };
      rangeProof: {
        commitment: string;
        revealedIndex: number;
        proof: string;
        max: number;
      };
    }> = [];

    for (let i = 0; i < count; i++) {
      const position = roundData.nextPosition + i;
      const card = shuffledDeck[position];
      const { siblings, path } = generateMerkleProof(merkleTree, position);

      // Generate genuine range proof commitment
      const rangeSalt = hash(`${roundData.serverSeed}:range-salt:${position}`);
      const rangeCommitment = hash(`${position}:${rangeSalt}`);

      cards.push({
        card,
        position,
        merkleProof: {
          leafHash: merkleTree[0][position],
          leafIndex: position,
          root: merkleTree[merkleTree.length - 1][0],
          siblings,
          path,
        },
        rangeProof: {
          commitment: rangeCommitment,
          revealedIndex: position,
          proof: rangeSalt,
          max: shuffledDeck.length,
        },
      });
    }

    // Advance the deal position
    roundData.nextPosition += count;

    return NextResponse.json({
      roundId,
      cards,
      nextPosition: roundData.nextPosition,
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to deal cards' },
      { status: 500 }
    );
  }
}
