# Plan: Next 3 features

Building on the Holders + Whales tabs we just shipped. All real-data, native components, terminal styling, no vendored code.

## 1. Smart-money panel inside Whale tab

Right now the Whale feed lists raw trades. Aggregate them into a **"Smart Money"** sub-tab:

- Group last 50 trades by wallet, compute net USD flow per wallet (buys − sells).
- Show top 10 wallets by absolute net flow: wallet, side (net accumulating / distributing), net USD, trade count, link to Solscan + a "track" button that pushes to a new `/wallet-pnl?address=…` deep link (route already exists).
- Toggle pill at top of Whales tab: `Trades | Smart Money`.

No new server function — all derived client-side from the existing `useTokenWhaleTrades` data.

## 2. Token risk / security panel

New **"Risk"** tab in token detail. Pulls from Solana Tracker `/tokens/{mint}` which already returns `risk.score`, `risk.risks[]` (mintable, freezable, top10 concentration, LP burned, etc.) plus deployer wallet.

- New server fn `getTokenRiskFn` + `solana-tracker.server.ts` `fetchTokenRisk(mint)`.
- UI: large risk score (0-10) with color, list of risk factors with severity dots, deployer wallet (linked), "top 10 holders own X%" headline derived from existing holders data.
- Empty state if Solana Tracker has no risk record.

## 3. Watchlist price alerts (lightweight)

The watchlist already exists (`/watchlist`). Add:

- Per-row **target price** input (above / below). Stored in `localStorage` (extending `src/lib/watchlist-store.ts`) — no DB, no backend.
- Background poll on `/watchlist`: every 60s refetch trending + prices, compare against targets, fire a `sonner` toast + browser notification (if permission granted) when crossed. Mark the alert as "triggered" so it doesn't re-fire.
- Small bell icon on each row, filled when an alert is set.

Out of scope: persisting alerts across devices (requires auth + DB — separate task), SMS/email alerts.

## Verification

After build I'll: open WIF token detail → confirm Smart Money tab aggregates the same Birdeye trades; open Risk tab → confirm score + factors render; on /watchlist set a target above current price → wait or simulate → confirm toast fires.

## Not in scope this round

Social feeds, narrative AI, mobile-specific tweaks beyond what these components inherit. Say which of the three you want first if you don't want all three at once — otherwise I'll ship them in order 1 → 2 → 3.
