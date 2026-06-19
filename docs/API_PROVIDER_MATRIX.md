# API Provider Matrix

Phase-1 status: **all providers are Mock**. This matrix is the plan for
Phase 2+ integrations.

| Provider                       | Category   | Phase | Features                              | Notes |
|--------------------------------|------------|-------|---------------------------------------|-------|
| DexScreener                    | DEX        | 2     | Trending tokens, pair liquidity, vol  | Primary DEX feed |
| CoinGecko                      | Market     | 2     | SOL price, global mcap                | Free tier sufficient |
| Lovable AI (Gemini)            | AI         | 2     | Narrative summary, score commentary   | Structured input only |
| Bitquery                       | Launchpad  | 3     | Pump.fun launches + on-chain trades   | Auth via Edge Fn |
| Solana Tracker                 | Launchpad  | 3     | Pump.fun + Raydium feeds              | Alternative to Bitquery |
| Birdeye                        | Wallet     | 3     | Wallet portfolio, holders             | Edge-Fn proxied |
| Vybe Network                   | Wallet     | 3     | Wallet P&L, token flows               | Alternative to Birdeye |
| Browserbase / browser-use      | Scraping   | 4     | Headless scrape fallback              | Backend job only |
| Oxylabs / Apify                | Scraping   | 4     | Web-scale scrape fallback             | Backend job only |
| X (Twitter) API                | Social     | 4     | CT narrative scanning, mentions       | Requires paid X API |

## Why API-first
Public memecoin dashboards (Pump.fun, GMGN, DexScreener web) change
markup, block bots, or rate-limit aggressively. Scraping them from the
browser is brittle and exposes the user. APIs + Edge Functions + Supabase
caching give us:

- Stable contracts (OpenAPI/REST).
- Server-side rate-limiting and retry.
- Centralised secret management.
- Cached results that survive provider downtime.

## Provider abstraction
All UI components consume hooks from `src/lib/data/index.ts`. Hooks call
the active `DataAdapter` exported from `src/lib/data/adapters/*`. Phase 1
ships `mock`. Phase 2+ adds `dexscreener`, `coingecko`, etc., or a
`composite` adapter that fans methods out to the best-fit provider.

This keeps MemeDesk from getting locked into a single vendor.

## AI / Gemini strategy
1. Edge Function fetches DexScreener trending + Pump.fun launches.
2. Reduces to a typed JSON payload (no markup, no HTML).
3. Sends to Gemini with a strict system prompt: *summarise only — do not
   add metrics not present in the payload*.
4. Stores the summary in Supabase with the source payload hash.
5. Frontend reads the cached summary; never calls Gemini directly.

## Scraping strategy
Phase 4 only. Always backend, never browser.
- Browserbase / browser-use for ephemeral headless sessions.
- Oxylabs / Apify for large scheduled crawls.
- Gemini search-grounding for narrative discovery.
- Outputs feed into the same Edge-Function → Supabase → adapter pipeline
  as the API providers.

## Supabase tables (planned, Phase 2)
- `tokens` (mint, name, symbol, first_seen_at)
- `token_snapshots` (mint, ts, price, mcap, liq, vol_24h, changes_json, source)
- `narratives` (date, summary, dominant_theme, keywords_json, sources_json)
- `provider_calls` (provider, fn, ts, status, ms, error)
- `watchlists` (user_id, mint, added_at) — Phase 2 with auth
- `wallets_cache` (address, ts, payload_json)

## Edge Functions (planned, Phase 2)
- `dexscreener-trending`
- `coingecko-sol-market`
- `bitquery-pumpfun-launches`
- `solana-tracker-wallet`
- `gemini-daily-narrative`
