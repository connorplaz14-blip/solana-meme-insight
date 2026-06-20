# Plan: Holder Analytics + Whale Feed

Two focused features, both wired into the existing **token detail dialog** (`TokenDetailProvider`) as new tabs alongside the current chart + transactions. No third-party code is copied — implementations are clean-room against public APIs we already pay for (Birdeye, Solana Tracker, DexScreener).

## Licensing note

I reviewed several popular memecoin dashboards on GitHub (pump-fun-trackers, dexscreener clones, solana-whale-bots). Most are MIT or unlicensed-by-default (= all rights reserved). Rather than vendor any of it, I'll build the two requested features fresh against the same public data sources they use. This is faster, avoids attribution liabilities, and matches your existing terminal style.

## Feature 1 — Top Holders / Smart-Money Panel

New tab "Holders" in the token detail dialog.

Data source: **Solana Tracker** `/tokens/{address}/holders/top` (you already have `SOLANA_TRACKER_API_KEY`).

Server function: `getTokenHoldersFn({ address })` in `src/lib/data/live.functions.ts`, backed by a new `solana-tracker.server.ts` helper. Returns top 20 holders with: rank, wallet (truncated + copy), % supply, USD value, optional "smart money" tag (if Solana Tracker flags it) and a link to Solscan.

UI: native table component `src/components/token/HoldersTable.tsx` — terminal styling, mono numbers, color-coded % bar, mobile = card list.

## Feature 2 — Whale / Large-Trade Feed

New tab "Whales" in the token detail dialog.

Data source: **DexScreener** trades endpoint (already wired) + **Birdeye** `/defi/txs/token` as fallback (you have `BIRDEYE_API_KEY`). Filter client-side for USD value ≥ $1k (configurable threshold chip: $1k / $5k / $25k).

Server function: `getTokenWhaleTradesFn({ address, minUsd })` returning last 50 large swaps: timestamp (relative), side (buy/sell tinted pos/neg), amount USD, token amount, wallet (truncated + Solscan link), tx signature link.

UI: `src/components/token/WhaleFeed.tsx` — virtualized list isn't needed at 50 rows; auto-refresh every 15s using TanStack Query `refetchInterval`. Threshold chips at top.

## Integration points

- `src/components/token/TokenDetailProvider.tsx` — extend the `Tabs` from 2 → 4 tabs (Chart, Transactions, **Holders**, **Whales**). Mobile already collapses tabs to scroll; keep that.
- `src/lib/data/providers/solana-tracker.server.ts` — add `fetchTopHolders(address)`.
- `src/lib/data/providers/birdeye.server.ts` — add `fetchTokenTxs(address)` for whale fallback.
- `src/lib/data/live.functions.ts` — export the two new `createServerFn` wrappers, both unauthenticated (public read), 30s cache via existing `cache.server.ts`.
- Real-data only; if both providers fail, render an empty-state with the error, never mocks.

## Out of scope

- No new routes — both features live inside the existing token detail dialog (accessed by clicking any token in trending/coins).
- No watchlist or wallet PnL leaderboard changes (those already exist on `/wallet-pnl`).
- No social/narrative work.

## Verification

After build I'll: (1) open token detail for a known token (e.g. WIF), confirm holders load with real %s, (2) confirm whale feed shows real trades > $1k with working Solscan links, (3) test mobile width.
