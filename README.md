# ZK Blackjack - Provably Fair Casino with Zero-Knowledge Proofs

A full-featured Blackjack game built with Next.js that implements a **provably fair** system using cryptographic hash commitments and **Zero-Knowledge Proofs (ZKP)** for verifiable gameplay integrity.

Players can independently verify that the deck was not manipulated at any point during the game, without relying on trust.

---

## Table of Contents

- [Overview](#overview)
- [How Provably Fair Works](#how-provably-fair-works)
- [Zero-Knowledge Proof System](#zero-knowledge-proof-system)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Game Features](#game-features)
- [Deployment](#deployment)
- [License](#license)

---

## Overview

ZK Blackjack is a single-player Blackjack game that focuses on cryptographic fairness. Instead of asking players to "just trust the house," the game provides mathematical proof that every shuffle and every dealt card is legitimate.

The system follows a 4-phase roadmap:

| Phase | Name | Description |
|-------|------|-------------|
| Phase 1 | Basic Game | Standard Blackjack rules, 6-deck shoe, local shuffle |
| Phase 2 | Server Shuffle | Deck shuffled server-side via API, separated from client |
| Phase 3 | Hash Commitment | SHA-256 seed commitment before each round; post-round verification |
| Phase 4 | Zero-Knowledge Proofs | Merkle trees, VRF, range proofs, shuffle proofs for mid-game verification |

The game is currently at **Phase 4**.

---

## How Provably Fair Works

The provably fair system (Phase 3) uses a standard hash commitment scheme:

1. **Before the round**: The server generates a random `serverSeed` and sends only its `SHA-256` hash to the client.
2. **Player input**: The client provides a `clientSeed` (auto-generated or manually entered).
3. **Shuffle**: The server combines `serverSeed + clientSeed + nonce` to deterministically shuffle a 6-deck shoe (312 cards) using a seeded Fisher-Yates algorithm.
4. **After the round**: The server reveals the actual `serverSeed`.
5. **Verification**: The client checks that `SHA-256(serverSeed) === committedHash` and that re-shuffling with the same seeds produces an identical deck order.

This guarantees the server committed to the deck order before the player placed their bet, making post-bet manipulation impossible.

---

## Zero-Knowledge Proof System

Phase 4 extends Phase 3 with Zero-Knowledge Proofs, allowing verification **during** the game (not just after):

### Merkle Tree

The entire shuffled deck is committed as a Merkle root hash. When a card is dealt, the server provides a Merkle inclusion proof for that specific card position without revealing the rest of the deck.

### VRF (Verifiable Random Function)

An HMAC-based VRF proves that the shuffle randomness was derived deterministically from the committed seed. The public key (hash of `serverSeed`) is shared before the round; full VRF verification happens after seed revelation.

### Range Proof

Each dealt card index is accompanied by a range proof showing that the card's position falls within `[0, 311]` (valid indices for a 6-deck shoe) without revealing the exact index until after the round.

### Shuffle Proof

After the round, the full Fisher-Yates shuffle trace is revealed. Each swap step is logged with commitments, allowing anyone to replay the shuffle and confirm correctness.

### Verification Flow

```
Before Round:
  Server -> Client: merkleRoot, vrfProof, serverSeedHash

During Round (per card dealt):
  Server -> Client: card, merkleProof, rangeProof

After Round:
  Server -> Client: serverSeed, shuffleProof

Client verifies:
  1. SHA-256(serverSeed) === serverSeedHash
  2. Each card's Merkle proof resolves to the committed merkleRoot
  3. VRF output matches the committed public key
  4. Range proofs are valid for each card index
  5. Replaying the shuffle with the revealed seed produces the same deck
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, standalone output) |
| Language | TypeScript |
| Runtime | Bun |
| Styling | Tailwind CSS 4 |
| UI Components | shadcn/ui (Radix primitives) |
| State Management | Zustand |
| Data Fetching | TanStack React Query |
| Database | SQLite via Prisma ORM |
| Animations | Framer Motion |
| Reverse Proxy | Caddy |
| Crypto | Web Crypto API (SHA-256, HMAC) |

---

## Project Structure

```
.
├── src/
│   ├── app/
│   │   ├── page.tsx              # Main game page
│   │   ├── layout.tsx            # Root layout
│   │   ├── globals.css           # Global styles
│   │   └── api/
│   │       ├── route.ts          # Base API route
│   │       ├── seed/route.ts     # Provably fair seed API (commit/reveal)
│   │       └── zk/route.ts       # Zero-Knowledge proof API
│   ├── components/
│   │   ├── blackjack/            # Game-specific components
│   │   │   ├── BettingArea.tsx
│   │   │   ├── GameControls.tsx
│   │   │   ├── HandDisplay.tsx
│   │   │   ├── PlayingCard.tsx
│   │   │   ├── ProvablyFairPanel.tsx
│   │   │   ├── ZKProofPanel.tsx
│   │   │   ├── StatsPanel.tsx
│   │   │   ├── CardCounterDisplay.tsx
│   │   │   ├── StrategyChart.tsx
│   │   │   ├── SideBets.tsx
│   │   │   └── ...               # 20+ additional components
│   │   └── ui/                   # shadcn/ui base components
│   ├── lib/
│   │   ├── blackjack.ts          # Core game logic (rules, scoring, payouts)
│   │   ├── provably-fair.ts      # Phase 3: Hash commitment, seeded RNG, verification
│   │   ├── zk-crypto.ts          # Phase 4: Merkle tree, VRF, range/shuffle proofs
│   │   ├── card-counter.ts       # Hi-Lo card counting system
│   │   ├── basic-strategy.ts     # Blackjack basic strategy engine
│   │   ├── achievements.ts       # Achievement/trophy system
│   │   ├── sounds.ts             # Sound effects
│   │   └── db.ts                 # Database client
│   ├── store/
│   │   └── game-store.ts         # Zustand store (game state, actions)
│   └── hooks/                    # Custom React hooks
├── prisma/
│   └── schema.prisma             # Database schema (User, Post models)
├── db/
│   └── custom.db                 # SQLite database file
├── mini-services/                # Optional micro-services
├── public/                       # Static assets
├── .zscripts/
│   ├── dev.sh                    # Development startup script
│   ├── build.sh                  # Production build script
│   └── start.sh                  # Production start script
├── Caddyfile                     # Caddy reverse proxy config
├── .env.example                  # Environment variable template
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── README.md
```

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (v1.0 or later)
- [Node.js](https://nodejs.org/) (v18 or later, for compatibility)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd zk-blackjack

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env

# Push database schema
bun run db:push

# Generate Prisma client
bun run db:generate

# Start the development server
bun run dev
```

The app will be available at `http://localhost:3000`.

### Production Build

```bash
# Build for production (creates standalone output)
bun run build

# Start production server
bun run start
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | SQLite database connection string | `file:./db/custom.db` |
| `NEXTAUTH_SECRET` | Secret key for NextAuth.js session encryption | _(generate a random string)_ |
| `NEXTAUTH_URL` | Canonical URL of your application | `http://localhost:3000` |
| `PORT` | Port for the production server | `3000` |
| `NODE_ENV` | Environment mode | `development` |

---

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `bun run dev` | Start Next.js dev server on port 3000 |
| `build` | `bun run build` | Build for production with standalone output |
| `start` | `bun run start` | Run production server |
| `lint` | `bun run lint` | Run ESLint |
| `db:push` | `bun run db:push` | Push Prisma schema to database |
| `db:generate` | `bun run db:generate` | Generate Prisma client |
| `db:migrate` | `bun run db:migrate` | Run database migrations |
| `db:reset` | `bun run db:reset` | Reset database and re-apply migrations |

---

## Game Features

### Core Gameplay

- Standard Blackjack rules with 6-deck shoe (312 cards)
- Hit, Stand, Double Down, Split, Surrender
- Insurance when dealer shows Ace
- Dealer hits on soft 17
- Blackjack pays 3:2

### Side Bets

- **Perfect Pairs**: Perfect (25:1), Colored (12:1), Mixed (6:1)
- **21+3**: Suited Trips (100:1), Straight Flush (40:1), Three of a Kind (30:1), Straight (10:1), Flush (5:1)

### Tools and Analytics

- **Card Counter**: Hi-Lo counting system with running count, true count, and betting advice
- **Basic Strategy Chart**: Real-time recommendations for every hand
- **Hand Probability**: Live odds for hitting, standing, and busting
- **Statistics Panel**: Win/loss tracking, streaks, session profit
- **Balance History Chart**: Visual balance over time
- **Hand Replay**: Review previous hands play-by-play
- **Achievements**: 11 unlockable trophies

### Fairness and Verification

- **Provably Fair Panel**: View seed hashes, verify past rounds, inspect shuffle
- **ZK Proof Panel**: View Merkle root, VRF proof status, per-card Merkle proofs, verification results
- **Verification History**: Browse and re-verify any previous round

### User Experience

- Keyboard shortcuts (H=Hit, S=Stand, D=Double, N=New Round, Space=Deal)
- Sound effects with toggle
- Smooth card animations
- Dark theme with casino-style design
- Fully responsive layout

---

## Deployment

### Using the Build Scripts

The project includes shell scripts in `.zscripts/` for deployment:

```bash
# Development (installs deps, sets up DB, starts dev server + mini-services)
sh .zscripts/dev.sh

# Production build (creates tar.gz with all artifacts)
sh .zscripts/build.sh

# Production start (runs Next.js + Caddy + mini-services)
sh .zscripts/start.sh
```

### Caddy Reverse Proxy

The included `Caddyfile` configures Caddy to listen on port 81 and proxy requests to the Next.js server on port 3000. It also supports dynamic port routing via the `XTransformPort` query parameter.

### Docker / VPS

For deployment on a VPS or container:

1. Run `sh .zscripts/build.sh` to produce a build tarball
2. Transfer the tarball to the server
3. Extract and run `sh start.sh`

The production server uses standalone output, so `node_modules` is not required at runtime.

---

## License

This project is private. All rights reserved.
