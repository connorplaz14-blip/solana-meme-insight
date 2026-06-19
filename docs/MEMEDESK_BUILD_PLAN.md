# MemeDesk Build Plan

## Product goal
MemeDesk is a financial-terminal-style intelligence dashboard for Solana
memecoins. It helps a serious trader/researcher answer four questions in
under 30 seconds:

1. What's the meme of the day, and why?
2. What's trending on Solana DEXs and Pump.fun right now?
3. What narrative is driving the market today?
4. What does my watchlist / wallet look like?

This is **analytics only**. No swap execution, no sniping, no auto-buy,
no auto-sell, no private-key handling, no transaction signing.

## User journey
1. Land on `/dashboard` — see SOL market bar, Meme of the Day, token
   chart, trending table, market pulse, narrative feed.
2. Drill into `/meme-of-the-day` for the full score breakdown + AI rationale.
3. Open `/trending` for the full DEX/launchpad table, sorted/filtered.
4. Read `/narratives` to understand the day's dominant memes + warnings.
5. Curate `/watchlist` for tokens worth watching.
6. Optionally analyse a `/wallet-pnl` (Phase 3 — currently mock).
7. Inspect `/settings` to see which providers are live, mock, or missing.

## Design system
- Near-black background (`oklch(0.14 0 0)`), charcoal panels, 1px borders,
  2px radius, dense compact grid.
- Type: JetBrains Mono for numbers + tabular data; Inter for prose.
- Accent palette (semantic tokens only):
  - `--pos` muted green — positive movement, active states.
  - `--neg` muted red — negative movement, risk.
  - `--warn` amber — caution / coming-soon / high-risk filter.
  - `--info` muted blue — info, neutral metrics, links.
- All colours live in `src/styles.css`. **Never hardcode colour classes**
  in components.

## Pages
- `/dashboard` — market bar + Meme of the Day + chart + trending(8) + pulse + narratives(compact).
- `/meme-of-the-day` — full token + score breakdown + chart.
- `/trending` — full filterable trending table.
- `/narratives` — full AI narrative report.
- `/watchlist` — add/remove + table view (localStorage-backed).
- `/wallet-pnl` — wallet lookup with mock P&L. Provider banner explains
  Phase 3 status.
- `/settings` — provider status matrix + security rules.

## Architecture (Phase 1)
- Stack: React 19, TanStack Start, Tailwind v4, shadcn/ui, Recharts.
- Mock data lives in `src/mocks/*`.
- All UI consumes data via `src/lib/data/index.ts` hooks
  (`useTrending`, `useSolMarket`, `useMemeOfTheDay`, `useNarratives`,
  `useMarketPulse`, `useWalletPnL`, `useProviders`, `useTokenChart`).
- Hooks call the active `DataAdapter` (currently `mockAdapter`).
- Swap to a real provider in Phase 2 by writing a new adapter that calls
  Supabase Edge Functions. **Components do not change.**

## Phases
- **Phase 1 (this build)** — Complete frontend shell, mock data, docs.
- **Phase 2** — Enable Lovable Cloud. Build Edge Functions for
  DexScreener (trending) and CoinGecko (SOL market). Add a `dexscreener`
  adapter. Cache results in Supabase.
- **Phase 3** — Bitquery / Solana Tracker for Pump.fun launches.
  Birdeye / Vybe for wallet P&L. Gemini summaries powered by structured
  Edge-Function output (never invented).
- **Phase 4** — Backend scraping fallback (Browserbase, browser-use,
  Oxylabs, Apify) for narrative signals. X API for CT scanning.
  All backend-only.

## Known limitations (Phase 1)
- All data is mock. The chart, prices, narratives, P&L, and provider
  status indicators do not reflect real markets.
- Watchlist persists only in browser localStorage.
- No auth — Phase 2 will introduce optional sign-in for saved watchlists.

## Security rules
- No private keys, no signing, no swap routes anywhere in the codebase.
- Third-party API keys live only in Edge Functions / Supabase secrets,
  never in client code or `import.meta.env.VITE_*`.
- AI never invents metrics — it only summarises structured backend data.
- Scraping is backend-only, not in the browser.
