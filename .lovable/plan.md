# News-First Fast Info Dashboard

Pivot the dashboard toward real-time information flow: X (Twitter) posts, news headlines, and on-chain signals — optimized for at-a-glance scanning, terminal-style.

## 1. New `/pulse` route — the fast-info homepage

A dense, multi-column terminal layout (think Bloomberg/TweetDeck) showing live streams side-by-side. Auto-refreshes every 30s. Columns:

```text
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ X / Twitter  │ News         │ Trending     │ Whale Pings  │
│ (cashtag     │ (CryptoPanic │ Tokens       │ (large txs   │
│  stream)     │  headlines)  │ (24h movers) │  across      │
│              │              │              │  watchlist)  │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

Each column is independently scrollable, color-coded by sentiment/severity, with relative timestamps ("2m ago") and one-click filters.

## 2. X / Twitter integration

Use **Nitter RSS** (free, no API key) as primary source, with fallback to scraping via existing data layer. New server function `getTwitterFeedFn(query)` that:
- Pulls posts mentioning a cashtag (e.g. `$WIF`, `$BONK`) or watchlist tokens
- Parses author, text, timestamp, engagement (if available)
- Caches 60s server-side
- Auto-detects token mentions and links them to `/coin/[mint]`

A search box at the top lets users add custom queries (kept in localStorage). Default queries: `$SOL`, `$BONK`, top 3 watchlist tokens.

If Nitter is unreliable, fall back to **CryptoPanic** which aggregates X posts + news under one API (free tier, key required — would request via add_secret).

## 3. News feed (CryptoPanic or RSS)

New `getNewsFeedFn` pulling from CryptoPanic public API (free, no key for basic). Shows:
- Headline + source badge (CoinDesk, The Block, etc.)
- Sentiment dot (bullish/bearish/neutral from API)
- Linked tokens as clickable chips
- Time ago

Filter pills: `All | Bullish | Bearish | Important`

## 4. Trending tokens column

Reuse existing trending/movers data already wired through Solana Tracker. Show top 10 gainers (24h) with sparkline, % change, and click → token detail.

## 5. Whale pings column (cross-watchlist)

Aggregate the existing whale trade hook across every token in the user's watchlist. Single chronological stream: `$WIF • BUY $42k • 3m ago`. Click → token detail's Whales tab.

## 6. Navigation

Add **Pulse** as the default landing tab in `MainNav`, before `Coins`. Existing routes (`/coins`, `/watchlist`, `/wallet-pnl`, token detail) untouched.

## Technical details

- **New files:**
  - `src/routes/pulse.tsx` — route + layout
  - `src/components/pulse/TwitterColumn.tsx`
  - `src/components/pulse/NewsColumn.tsx`
  - `src/components/pulse/TrendingColumn.tsx`
  - `src/components/pulse/WhalePingsColumn.tsx`
  - `src/lib/data/providers/nitter.server.ts` (or `cryptopanic.server.ts`)
- **Edited:**
  - `src/lib/data/live.functions.ts` — add `getTwitterFeedFn`, `getNewsFeedFn`
  - `src/lib/data/adapters/live.ts` + `src/lib/data/index.ts` — wire hooks
  - `src/components/MainNav.tsx` — add Pulse tab
- All columns use `useQuery` with 30s `refetchInterval`, server-cached 60s.

## Out of scope
- Posting to X / replying
- Push notifications (price alerts already cover that)
- Sentiment ML — rely on CryptoPanic's labels

## Open question
Do you have a **CryptoPanic API key**, or should I start with Nitter RSS (no key, less reliable) and only request a key if needed?