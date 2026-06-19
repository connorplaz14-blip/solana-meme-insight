# Coins page + AI page + AI-curated Trending

## Goal

- **One page for coins**: GeckoTerminal trending (mid-caps / 24h trending) on top, Pump.fun new pairs live-feed below.
- **One page for the AI**: a chattable assistant that knows today's trending + PF launches + CT/Reddit chatter and can tell you the "meta of the day".
- **Trending page**: keep our own UI, but populate it with coins the AI picks as today's narrative leaders (e.g. "leading Trump coin", "leading dog coin").
- **Wallet P&L**: untouched.

## Information architecture (after change)

```text
SideNav
  Dashboard      → slim home: SOL bar, Meme of the Day card, links to /coins and /ai
  Coins          → NEW (replaces /trending embeds)
                    • Trending (Gecko, sortable, 24h)
                    • Pump.fun New Pairs (live feed)
  AI Desk        → NEW (chat + daily brief)
  Trending       → keep route, switch to AI-curated narrative leaders (our UI)
  Meme of Day    → unchanged
  Narratives     → unchanged (becomes AI Desk's daily brief source)
  Watchlist      → unchanged
  Wallet P&L     → unchanged
  Settings       → unchanged
```

## /coins page

Single scrollable page, two stacked sections:

1. **Trending Solana — 24h** — GeckoTerminal embed (`/solana/pools?embed=1`), default sort 24h volume. Tall (~78vh).
2. **Pump.fun New Pairs — Live** — GeckoTerminal `pump-fun/pools?embed=1` embed showing bonding-curve pools as they appear. Same UX as Photon's new pairs list. Tall (~78vh).

We already have both embeds working — this page just hosts them and removes the duplicate trending+launches blocks from `/dashboard` and `/trending`.

## /ai page (AI Desk)

Two-column on desktop, stacked on mobile:

- **Left (60%) — Chat** with Lovable AI (Gemini 3 flash). User can ask "what's the meta?", "what's the leading dog coin?", "is PUMP overheated?", etc. The system prompt is rebuilt each turn with a compact JSON snapshot:
  - Top 25 trending tokens (DexScreener, already wired)
  - Latest 10 Pump.fun launches (Solana Tracker, already wired)
  - The most recent daily brief (see below)
  - Latest social signal pull (see Sources)
- **Right (40%) — Daily Brief panel**: re-uses the existing narratives generator, refreshed every ~1h, showing dominant theme, fastest-growing sub-narrative, keywords, warnings, notable launches.

Conversation shape: **single conversation, no persistence** (matches current app — no auth yet). Can upgrade later. Chat textarea autofocused; render `message.parts` with markdown via AI Elements (`conversation`, `message`, `prompt-input`, `shimmer`).

## /trending page (AI-curated)

Replace the GeckoTerminal grid with our own table powered by a new server fn `getAiCuratedTrending`:

- Input: top-50 DexScreener tokens + 10 latest PF launches + latest narrative report.
- Gemini picks 8–15 coins and tags each with a one-line "why" + a narrative bucket (e.g. `Trump`, `Dog`, `AI agents`, `Frog`).
- Renders as our existing `TrendingTable` style, grouped by bucket, with a "Refresh" button. Cached for 30 min in Supabase (`ai_trending` table, same pattern as `narratives`).

## Sources for the AI (research in progress)

A background research agent is gathering the CT/Reddit source list (handles, APIs, costs). Pending its return, the planned shape is:

- **On-chain / market** (already wired, no new cost): DexScreener trending, GeckoTerminal new pools, Solana Tracker PF launches, CoinGecko SOL market.
- **Social signal (cheap path)**: **LunarCrush API** for Galaxy Score / social volume per Solana token, and **Kaito Yaps** or **Tweetscout** for the CT mindshare leaderboard. Both have generous free/cheap tiers and remove the need for direct X scraping.
- **Direct CT pull (optional, paid)**: X API v2 Basic ($200/mo) on a hand-picked list of ~20 high-signal handles (e.g. `@blknoiz06`, `@AltcoinGordon`, `@notthreadguy`, `@hsakatrades`, `@inversebrah`, `@CL207`, `@0xMert_`, `@pumpdotfun`, `@dexscreener`, `@WatcherGuru`, `@lookonchain` — final list comes from the research agent). Only enabled if user adds the secret.
- **Reddit**: free Reddit JSON API on `r/solana`, `r/CryptoMoonShots`, `r/SatoshiStreetBets` top-of-day posts. No key.

A single server fn `pullSocialSignal()` aggregates these every 1h, caches in Supabase `social_signals` (date, source, payload, hash), and the narrative + chat both read from cache so chat stays fast and cheap.

I will return the finalized account/API list with the research agent's output before wiring keys.

## Technical changes

**New / changed routes**
- `src/routes/coins.tsx` — new, hosts the two GeckoTerminal embeds.
- `src/routes/ai.tsx` — new, AI Desk (chat + daily brief panel).
- `src/routes/api/chat.ts` — new, streaming chat server route using Lovable AI gateway + Gemini 3 flash. Injects the snapshot into the system prompt each turn.
- `src/routes/trending.tsx` — rewrite body: AI-curated table (our UI), keep route.
- `src/routes/dashboard.tsx` — slim down to SOL bar + Meme of the Day + nav cards to /coins and /ai.

**New components**
- `src/components/ai/AiChat.tsx` — AI Elements composition (conversation, message, prompt-input, shimmer); no message persistence.
- `src/components/ai/DailyBrief.tsx` — renders the existing narrative report.
- `src/components/coins/CoinsView.tsx` — wraps the two embeds; reuses `DexScreenerEmbed`.
- `src/components/trending/AiTrendingTable.tsx` — our own table, grouped by narrative.

**New server functions / files**
- `src/lib/ai/snapshot.functions.ts` → `getMarketSnapshotFn` (returns the compact JSON the chat system prompt needs).
- `src/lib/ai/curated.functions.ts` → `getAiCuratedTrendingFn` (cached 30m in Supabase).
- `src/lib/data/providers/social.server.ts` → `pullSocialSignal` (LunarCrush + Kaito/Tweetscout + Reddit; X optional).
- Supabase migrations: `ai_trending` and `social_signals` tables, RLS public-read with `GRANT SELECT TO anon`, writes service-role only.

**Sidebar** (`SideNav.tsx`): add "Coins" and "AI Desk" entries; keep Trending.

**Secrets to request after plan approval (only if user opts in)**
- `LUNARCRUSH_API_KEY` (free tier ok)
- `TWEETSCOUT_API_KEY` *or* `KAITO_API_KEY` (one of)
- `X_BEARER_TOKEN` (optional, $200/mo) — only if user wants direct CT pulls

`LOVABLE_API_KEY` is already provisioned for chat + curation; no extra cost for that piece beyond per-request gateway credits.

## Out of scope (this round)

- Auth, per-user chat threads, persistence.
- Token-detail modal changes.
- Wallet P&L changes.
- Trading actions of any kind (analytics only).

## Build order

1. Routes scaffolding + sidebar (`/coins`, `/ai`, dashboard slim-down).
2. `/coins` page using existing embeds.
3. `api/chat.ts` + AiChat UI with snapshot injection (no social yet — purely on-chain context).
4. DailyBrief panel reusing narratives.
5. AI-curated `/trending` table + cache table.
6. Social signal puller + wire into snapshot (after final source list returns from research).
