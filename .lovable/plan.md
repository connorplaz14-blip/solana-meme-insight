
# MemeDesk Phase 2 — Real Data + AI Narratives

Goal: move MemeDesk from a 100% mock dashboard to real Solana market data + AI-generated narrative summaries, without changing any UI components. All keys stay server-side. The mock adapter remains as a fallback.

## What goes live in Phase 2

| Surface | Provider | Source of truth |
| --- | --- | --- |
| SOL market bar (price, 24h, mcap, vol, dominance) | CoinGecko `simple/price` + `global` | Server fn, cached |
| Trending Solana tokens table | DexScreener `token-profiles/latest/v1` + `tokens/v1/solana/...` | Server fn, cached |
| Meme of the Day | Derived: top-ranked DexScreener Solana token by composite score | Server fn |
| Token chart panel | DexScreener pair `priceUsd` history (5m candles, last 24h) | Server fn |
| Market pulse (gainers / losers / new pairs) | DexScreener Solana feed | Server fn |
| Narratives feed + daily summary | Lovable AI Gateway (Gemini) over the structured DexScreener payload | Server fn, cached daily |
| Watchlist token rows | DexScreener bulk token lookup by mint | Server fn |
| Wallet P&L | Stays mock (Phase 3) — banner already explains this |
| Settings provider status | Real ping of each server fn (latency + last error) | Server fn |

Out of scope for Phase 2: Pump.fun launchpad data, Birdeye/Vybe wallet indexing, Browserbase scraping, X API. Those stay Phase 3/4 as planned.

## Architecture

```text
React component
  → src/lib/data hook (useTrending, useSolMarket, …)
    → liveAdapter (default in Phase 2)
      → createServerFn RPC (src/lib/data/*.functions.ts)
        → server-only fetcher (src/lib/data/*.server.ts)
          → DexScreener / CoinGecko REST
          → Lovable AI Gateway (Gemini) for narratives
        → Lovable Cloud (Supabase) cache tables
```

Key rules:
- UI never imports providers. It only calls the hooks already in `src/lib/data/index.ts`.
- The adapter swap is one line: `const adapter = liveAdapter` instead of `mockAdapter`. Mock stays exported so we can flip back per-method during incidents.
- Every server function returns a plain DTO that matches the existing TypeScript types in `src/types/index.ts`. No type changes in components.
- DexScreener and CoinGecko are public APIs with no key. Gemini goes through Lovable AI Gateway with the auto-provisioned `LOVABLE_API_KEY`.
- Caching: every provider response is written to a Supabase table with a TTL. Server fns read from cache first, then refresh in the background if stale. This handles rate limits and provider downtime.

## Lovable Cloud + Gemini

- Enable Lovable Cloud (creates a Supabase project + auto-provisions `LOVABLE_API_KEY`).
- No auth is added in Phase 2 — watchlist stays local-storage. The plan keeps the door open for auth later, but it's not built now to avoid scope creep.

## Cache tables (Supabase, public schema)

All tables get `GRANT SELECT ON ... TO anon` because reads are public, plus full grants to `service_role` for the server fns. Writes are server-only.

- `provider_cache (key text pk, payload jsonb, fetched_at timestamptz, ttl_seconds int)` — generic KV cache keyed by `provider:fn:args`.
- `narratives (date date pk, summary text, dominant_theme text, keywords jsonb, sources jsonb, generated_at timestamptz)` — one row per UTC day.
- `provider_health (provider text pk, last_ok_at timestamptz, last_error text, last_latency_ms int)` — drives the Settings status panel.

RLS: enabled, anon `SELECT` only. No anon writes. All inserts/updates run via `supabaseAdmin` inside server fns.

## New files

```text
src/lib/data/
  adapters/
    mock.ts                (kept)
    live.ts                (new — wires hooks to server fns)
  providers/
    dexscreener.server.ts  (REST client, score + chart derivation)
    coingecko.server.ts    (REST client for SOL market)
    gemini.server.ts       (Lovable AI Gateway provider helper)
  cache.server.ts          (read/write provider_cache with TTL + SWR)
  health.server.ts         (record latency/errors into provider_health)
  sol-market.functions.ts
  trending.functions.ts
  meme-of-the-day.functions.ts
  token-chart.functions.ts
  market-pulse.functions.ts
  narratives.functions.ts
  watchlist-quotes.functions.ts
  providers.functions.ts
```

`src/lib/data/index.ts` flips to `liveAdapter`. `useWalletPnL` keeps calling the mock adapter explicitly until Phase 3.

## Server-function contracts

Each fn returns the same shape the matching mock returns today, so components do not change. Each fn:
1. Computes a cache key.
2. Reads `provider_cache`; if fresh, returns it.
3. Otherwise fetches the provider, validates with Zod, writes to cache, updates `provider_health`, returns DTO.
4. On provider failure: returns the last cached value if any, otherwise throws a typed error the UI already renders via `status: "error"`.

TTLs:
- SOL market: 30s
- Trending / market pulse: 60s
- Token chart: 60s
- Meme of the Day: 5 min
- Narratives: 1 hour (regenerates only if the underlying DexScreener payload hash changed and it's a new UTC day)
- Watchlist quotes: 30s

## Meme of the Day scoring

Computed server-side from the DexScreener Solana payload. Composite score:
- 24h volume (log-scaled, 30%)
- Liquidity USD (log-scaled, 20%)
- 24h price change capped at ±300% (20%)
- Txn count 24h (15%)
- Age penalty: < 24h gets a slight boost, > 30 days gets a small penalty (15%)

Top token by score becomes Meme of the Day. The breakdown is returned so the existing `MemeOfTheDayCard` shows real numbers. Risk badge stays a simple heuristic (low liquidity + very young + extreme change → high risk).

## Narratives via Lovable AI

- Daily server fn `generateDailyNarrative` reduces the top 30 trending tokens to a strict JSON payload (symbol, name, mcap, vol24h, change24h, age).
- Calls Gemini via Lovable AI Gateway with `output: Output.object({ schema })` — narrative summary, dominant theme, 5 keyword tags, 3 risk callouts.
- System prompt forbids inventing metrics — model may only summarize the provided payload.
- Result is stored in `narratives` with the payload hash. UI reads it; never calls Gemini directly.

## Settings page

`useProviders` switches to `getProvidersStatus` which reads `provider_health` and returns one row per provider with: status (ok/degraded/down/mock), last latency, last error, last success time. DexScreener / CoinGecko / Gemini show real status. Bitquery / Solana Tracker / Birdeye / Vybe / Browserbase / X stay "Not configured" until later phases.

## Verification

- Type-check passes after the adapter swap (component prop shapes already match).
- `/dashboard` shows real SOL price + a real Solana token list.
- `/narratives` shows a Gemini-generated summary scoped to today.
- Disable network on the DexScreener fetcher and confirm the UI shows cached values + a degraded badge in Settings.
- Confirm no `LOVABLE_API_KEY` or provider key reference exists in any client bundle (grep `src/components`, `src/routes`).

## Out of scope (still mock after Phase 2)

- Wallet P&L (Phase 3 — Birdeye/Vybe/Solana Tracker)
- Pump.fun launches (Phase 3 — Bitquery/Solana Tracker)
- X / CT scanning + Browserbase scraping (Phase 4)
- Auth + per-user watchlists (deferred; watchlist remains in localStorage)

## Risks and mitigations

- **DexScreener rate limits.** Mitigated by `provider_cache` TTL + single shared server-side fetch path.
- **CoinGecko free-tier throttling.** Cached 30s, single SOL+global call.
- **Gemini cost / latency.** Narratives generated at most once per hour and short-circuited if the input hash is unchanged.
- **SSR loader auth.** All Phase 2 server fns are unauthenticated read-only — safe to call from public route loaders during prerender.
