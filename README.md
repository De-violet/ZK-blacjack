# ZK Blackjack — Provably Fair Casino with Zero-Knowledge Proofs

A full-featured Blackjack game built with Next.js 16 that implements a **provably fair** system using cryptographic hash commitments and **Zero-Knowledge Proofs (ZKP)** for verifiable gameplay integrity.

Players can independently verify that the deck was not manipulated at any point during the game — without relying on trust.

---

## Table of Contents

- [Overview](#overview)
- [Live Demo](#live-demo)
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

| Phase | Name | Description | Status |
|-------|------|-------------|--------|
| Phase 1 | Basic Game | Standard Blackjack rules, 6-deck shoe, local shuffle | ✅ Complete |
| Phase 2 | Server Shuffle | Deck shuffled server-side via API, separated from client | ✅ Complete |
| Phase 3 | Hash Commitment | SHA-256 seed commitment before each round; post-round verification | ✅ Complete |
| Phase 4 | Zero-Knowledge Proofs | Merkle trees, VRF, range proofs, shuffle proofs for mid-game verification | ✅ Complete |

The game is currently at **Phase 4** — all features are live.

---

## Live Demo

🌐 **[zk.purpled.my.id](https://zk.purpled.my.id)**

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
  Server → Client: merkleRoot, vrfProof, serverSeedHash

During Round (per card dealt):
  Server → Client: card, merkleProof, rangeProof

After Round:
  Server → Client: serverSeed, shuffleProof

Client verifies:
  1. SHA-256(serverSeed) === serverSeedHash
  2. Each card's Merkle proof resolves to the committed merkleRoot
  3. VRF output matches the committed public key
  4. Range proofs are valid for each card index
  5. Replaying the shuffle with the revealed seed produces the same deck
```

### Visual Trust Indicators

The game provides multiple visual indicators so players can immediately see that ZK proofs are active:

- **ZK Trust Banner** — A purple banner below the header showing "Zero-Knowledge Proof Active" with a live indicator
- **Card Verification Badges** — A violet checkmark badge on each dealt card when ZK is enabled
- **ZK Dashboard Panel** — A sliding side panel (click the ShieldCheck icon) showing real-time Merkle Root, VRF Output, Card Proofs, and verification status
- **Footer Status** — Shows "ZK Verified" label with Merkle root preview and verification result

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Runtime | Bun / Node.js |
| Styling | Tailwind CSS 4 |
| UI Components | shadcn/ui (Radix primitives) |
| State Management | Zustand |
| Database | SQLite via Prisma ORM |
| Animations | Framer Motion |
| Crypto | Web Crypto API (SHA-256, HMAC) |
| Icons | Lucide React |

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                 # Main game page (all-in-one UI)
│   ├── layout.tsx               # Root layout with fonts & metadata
│   ├── globals.css              # Global styles & keyframe animations
│   └── api/
│       ├── route.ts             # Base API route
│       ├── seed/route.ts        # Provably fair seed API (commit/reveal)
│       └── zk/route.ts          # Zero-Knowledge proof API
├── components/
│   ├── blackjack/               # Game-specific components (30+)
│   │   ├── BettingArea.tsx      # Chip selection & bet placement
│   │   ├── GameControls.tsx     # Hit/Stand/Double/Split/Surrender
│   │   ├── HandDisplay.tsx      # Card hand rendering
│   │   ├── PlayingCard.tsx      # Individual card with ZK badge
│   │   ├── StatsPanel.tsx       # Win/loss statistics overlay
│   │   ├── ProvablyFairPanel.tsx # Phase 3 verification panel
│   │   ├── ZKProofPanel.tsx     # Phase 4 ZK proof panel
│   │   ├── ZKSidePanel.tsx      # ZK Dashboard (sliding overlay)
│   │   ├── SessionSummary.tsx   # Round summary overlay
│   │   ├── StrategyChart.tsx    # Basic strategy recommendations
│   │   ├── CardCounterDisplay.tsx # Hi-Lo counting display
│   │   ├── HandProbability.tsx  # Live odds calculator
│   │   ├── SideBets.tsx         # Perfect Pairs & 21+3
│   │   ├── BalanceChart.tsx     # Balance history chart
│   │   ├── HandReplay.tsx       # Replay previous hands
│   │   ├── VerificationHistory.tsx # Round verification log
│   │   ├── AchievementToast.tsx # Achievement notifications
│   │   ├── PhaseRoadmap.tsx     # Phase progress indicator
│   │   └── ...                  # 10+ additional components
│   └── ui/                      # shadcn/ui base components (40+)
├── lib/
│   ├── blackjack.ts             # Core game logic (rules, scoring, payouts)
│   ├── provably-fair.ts         # Phase 3: Hash commitment, seeded RNG
│   ├── zk-crypto.ts             # Phase 4: Merkle tree, VRF, range/shuffle proofs
│   ├── card-counter.ts          # Hi-Lo card counting system
│   ├── basic-strategy.ts        # Blackjack basic strategy engine
│   ├── achievements.ts          # Achievement/trophy system
│   ├── sounds.ts                # Sound effects (Web Audio API)
│   └── db.ts                    # Prisma database client
├── store/
│   └── game-store.ts            # Zustand store (game state, actions)
└── hooks/                       # Custom React hooks
    ├── use-game-persistence.ts  # LocalStorage persistence
    └── ...
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- [Bun](https://bun.sh/) (optional, but recommended)

### Installation

```bash
# Clone the repository
git clone https://github.com/De-violet/ZK-blacjack.git
cd ZK-blacjack

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Push database schema
npm run db:push

# Generate Prisma client
npm run db:generate

# Start the development server
npm run dev
```

The app will be available at `http://localhost:3000`.

### Production Build (Vercel)

This project is optimized for **Vercel** deployment:

1. Push to GitHub
2. Connect the repository to Vercel
3. Vercel auto-detects Next.js and runs `next build`
4. No special configuration needed

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | SQLite database connection string | `file:./db/custom.db` |
| `NEXTAUTH_SECRET` | Secret key for NextAuth.js session encryption | _(generate a random string)_ |
| `NEXTAUTH_URL` | Canonical URL of your application | `http://localhost:3000` |

---

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `npm run dev` | Start Next.js dev server on port 3000 |
| `build` | `npm run build` | Build for production (`next build`) |
| `start` | `npm run start` | Run production server (standalone) |
| `lint` | `npm run lint` | Run ESLint |
| `db:push` | `npm run db:push` | Push Prisma schema to database |
| `db:generate` | `npm run db:generate` | Generate Prisma client |
| `db:migrate` | `npm run db:migrate` | Run database migrations |
| `db:reset` | `npm run db:reset` | Reset database and re-apply migrations |

---

## Game Features

### Core Gameplay

- Standard Blackjack rules with 6-deck shoe (312 cards)
- Hit, Stand, Double Down, Split, Surrender
- Insurance when dealer shows Ace
- Dealer hits on soft 17
- Blackjack pays 3:2

### Side Bets

| Side Bet | Type | Payout |
|----------|------|--------|
| Perfect Pairs | Perfect (same suit & rank) | 25:1 |
| Perfect Pairs | Colored (same color & rank) | 12:1 |
| Perfect Pairs | Mixed (same rank, different color) | 6:1 |
| 21+3 | Suited Trips | 100:1 |
| 21+3 | Straight Flush | 40:1 |
| 21+3 | Three of a Kind | 30:1 |
| 21+3 | Straight | 10:1 |
| 21+3 | Flush | 5:1 |

### Tools & Analytics

- **Card Counter** — Hi-Lo counting system with running count, true count, and betting advice
- **Basic Strategy Chart** — Real-time recommendations for every hand situation
- **Hand Probability** — Live odds for hitting, standing, and busting
- **Statistics Panel** — Win/loss tracking, streaks, session profit, balance history
- **Hand Replay** — Review previous hands play-by-play
- **Achievements** — Unlockable trophies for milestones

### Fairness & Verification

- **ZK Trust Banner** — Visible indicator showing ZK proofs are active
- **ZK Dashboard** — Real-time Merkle Root, VRF Output, Card Proofs, verification status
- **Provably Fair Panel** — Seed hash inspection, round verification, deal order
- **Verification History** — Browse and re-verify any previous round
- **Card ZK Badges** — Visual proof badge on each dealt card

### User Experience

- Keyboard shortcuts (H=Hit, S=Stand, D=Double, N=New Round, Space=Deal)
- Sound effects with mute toggle
- Smooth card deal, flip, and win animations
- Dark casino-style theme with green felt background
- Responsive layout (mobile & desktop)
- Auto-save game state to localStorage

---

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the repository on [vercel.com](https://vercel.com)
3. Framework preset: **Next.js** (auto-detected)
4. Click **Deploy**

No additional configuration needed — `next build` is the only build step.

### VPS / Self-Hosted (Docker + Caddy)

The project includes shell scripts for self-hosted deployment:

```bash
# Development (installs deps, sets up DB, starts dev server)
sh .zscripts/dev.sh

# Production build (creates standalone output + tarball)
sh .zscripts/build.sh

# Production start (runs Next.js + Caddy reverse proxy)
sh .zscripts/start.sh
```

The `Caddyfile` configures Caddy to listen on port 81 and proxy to the Next.js server on port 3000.

---

## License

This project is private. All rights reserved.
