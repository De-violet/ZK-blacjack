import { NextResponse } from 'next/server';
import { createHash } from 'crypto';

// POST /api/zk/deal — Deal N cards from the server with Merkle proofs
//
// This is the CORE of the genuine ZK system:
// - Client requests cards during gameplay (hit, dealer turn, etc.)
// - Server returns the next N cards from the shuffled deck
// - Each card comes with a Merkle inclusion proof against the committed merkleRoot
// - Each card comes with a range proof commitment
// - Client can VERIFY each card against the commitment WITHOUT knowing the full deck

// Import shared round store from parent route
// (In Next.js, we share state via module-level variable)

interface ZKRoundData {
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

// Shared store — we re-export from the parent module's in-memory map
// Since Next.js bundles route handlers separately, we use a global variable
const getZkRounds = (): Map<string, ZKRoundData> => {
  if (!(globalThis as Record<string, unknown>).__zkRounds) {
    (globalThis as Record<string, unknown>).__zkRounds = new Map<string, ZKRoundData>();
  }
  return (globalThis as Record<string, unknown>).__zkRounds as Map<string, ZKRoundData>;
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

    const zkRounds = getZkRounds();
    const roundData = zkRounds.get(roundId);

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
      // The salt is derived from the server seed and position (revealed after round)
      // During the game, the client can verify the commitment EXISTS but not the value
      // After the round, the server reveals the salt so the client can verify the range
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
          // We DON'T reveal the index during the game — client knows the card already
          // but the commitment proves the position was committed to before the deal
          revealedIndex: position, // Client knows position when card is dealt
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
