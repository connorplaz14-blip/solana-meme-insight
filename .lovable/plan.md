
# MemeDesk — Phase 1 Build Plan

Build a complete, professional-looking **frontend shell** for a Solana memecoin intelligence terminal, powered entirely by mock data and structured for future Lovable Cloud + Edge Function integration. No trading, no key handling, no scraping in Phase 1.

## Scope (Phase 1 only)

- Frontend-only. All data comes from typed mock modules.
- No backend enabled yet. Code is structured so real API providers can be wired in later via Edge Functions.
- No auth in Phase 1 — settings page shows provider status only.

## Design System

Terminal/Bloomberg aesthetic, committed and consistent:
- Background: near-black (`oklch(0.14 0 0)`), panels charcoal (`oklch(0.18 0 0)`).
- Thin 1px borders (`oklch(0.28 0 0)`), sharp 2px radius, dense grid layout.
- Type: **JJB Mono / JetBrains Mono** for numbers + tabular data, **Inter** for prose labels.
- Accents: muted green `oklch(0.72 0.15 150)` (positive/active), muted blue `oklch(0.68 0.12 230)` (info/links), amber `oklch(0.75 0.16 70)` (warn), red `oklch(0.62 0.22 25)` (negative/risk).
- All colors as semantic tokens in `src/styles.css` via `@theme inline` — no hardcoded color classes in components.
- Tabular-nums everywhere numbers appear. Compact spacing scale (4/8/12/16).
- No gradients, no neon, no cartoon, no hero marketing patterns.

## Routes (TanStack file-based)

```
src/routes/
  __root.tsx              -> terminal shell: top market bar + left nav + outlet
  index.tsx               -> redirect to /dashboard
  dashboard.tsx           -> main grid
  meme-of-the-day.tsx
  trending.tsx
  narratives.tsx
  watchlist.tsx
  wallet-pnl.tsx
  settings.tsx
```

Shell (`__root`) provides: fixed top **MarketBar** (SOL price, 24h %, 24h vol, SOL mcap, last-updated, manual refresh), left **SideNav** with route links, dense main content area.

## Components

Grouped under `src/components/`:

- `terminal/` — `Panel`, `PanelHeader`, `StatCell`, `DataTable`, `ChangeCell`, `RiskBadge`, `SourceBadge`, `CopyAddress`, `Sparkline`, `EmptyState`, `RefreshButton`.
- `dashboard/` — `MarketBar`, `MemeOfTheDayCard`, `TrendingTable`, `MarketPulse`, `NarrativeFeed`, `TokenChartPanel` (Recharts placeholder with 5m/15m/1h/4h/24h tabs and "chart unavailable" state).
- `watchlist/` — `WatchlistTable`, `AddTokenDialog`.
- `wallet/` — `WalletScoreCard`, `PnLStats`, `TokenPnLTable`, `ComingSoonBanner`.
- `settings/` — `ProviderStatusCard` (Live | Mock | Missing | Error, last call, last error, dependent features).

## Mock data layer

Strict separation so swapping to real APIs is trivial:

```
src/mocks/
  sol-market.ts
  meme-of-the-day.ts
  trending-tokens.ts
  narratives.ts
  watchlist.ts
  wallet-pnl.ts
  providers.ts
src/types/
  token.ts, market.ts, narrative.ts, wallet.ts, provider.ts
src/lib/data/
  index.ts          -> provider-agnostic data hooks (useTrending, useSolMarket…)
  adapters/mock.ts  -> reads from src/mocks
  adapters/README.md -> how to add a real adapter later
```

Hooks return `{ data, status, lastUpdated, refresh }` so a real Edge Function adapter can drop in without component changes.

## Page details

- **/dashboard** — 12-col grid: MemeOfTheDay (4 col) + TokenChartPanel (8 col) row; TrendingTable (8 col) + MarketPulse (4 col) row; NarrativeFeed full width.
- **/meme-of-the-day** — Expanded MemeOfTheDay with token image, name/ticker, contract + copy, mcap, liq, vol, 5m/1h/6h/24h changes, buys/sells, age, RiskBadge, SourceBadges, AI summary, score breakdown.
- **/trending** — Full TrendingTable with rank, image, name/ticker, short CA + copy, mcap, liq, vol, price changes, txns, age, source, risk, watchlist toggle; sort, search, filters (source, risk, age).
- **/narratives** — AI daily summary card, dominant theme, fastest-growing meta, repeated keywords (chip cloud), notable launches list, risk warnings, source labels. All copy clearly tagged "AI summary (mock)".
- **/watchlist** — Add/remove UI, table + card view toggle, persisted to `localStorage` for Phase 1.
- **/wallet-pnl** — Wallet address input (validated format only), score, realised/unrealised P&L, ROI, win rate, avg hold, best/worst trade, token-level P&L table, prominent "Provider integration coming soon" banner.
- **/settings** — Provider status cards for: DexScreener, CoinGecko, Lovable AI (Gemini), Bitquery, Solana Tracker, Birdeye, Vybe, Browserbase/browser-use/Oxylabs (future scraping), X API (future social). Each shows status, last call, last error, dependent features. All Mock in Phase 1.

## Docs (committed in repo)

- `docs/MEMEDESK_BUILD_PLAN.md` — product goal, user journey, design system, page-by-page spec, phases, security rules, AI rules.
- `docs/RESEARCH_REFERENCES.md` — distilled findings from the uploaded plan (Lovable, Reddit, GitHub, Gemini, providers).
- `docs/API_PROVIDER_MATRIX.md` — provider × feature × status × notes table, why API-first beats scraping, abstraction strategy.

## Guardrails (enforced in code + docs)

- No private-key handling, no signing, no swap/trade routes anywhere.
- No frontend scraping. No third-party API keys in client code.
- AI rule: summaries operate only on structured data; Phase 1 AI text is clearly labelled mock.
- Provider abstraction prevents single-vendor lock-in.

## Out of scope (Phase 1)

- Real API calls, Lovable Cloud, Edge Functions, auth, scraping jobs, X scanning, real wallet indexing, real charts (placeholder Recharts only).

## Technical notes

- Stack: React 19 + TanStack Start + Tailwind v4 + shadcn + Recharts (already installed or add via `bun add recharts`).
- Tokens defined in `src/styles.css` under `:root` + `@theme inline`; load JetBrains Mono + Inter via `<link>` in `__root.tsx` head.
- File-based routes with correct `createFileRoute("/path")` strings; each route sets its own `head()` meta.
- Strict TS, no unresolved imports, no placeholder index page left behind.

Ready to implement on approval.
