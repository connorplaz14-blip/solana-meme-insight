## Goal

Make SCBOL AI genuinely useful by grounding it in X + news (not just price data), giving it tools to fetch on demand, and shipping 4 new AI features across the app.

---

## Part 1 — Smarter context (snapshot + tools)

**Extend `src/lib/ai/snapshot.server.ts`** with a lightweight social/news layer (always-on, trimmed):
- `topTweets`: ~12 entries from `fetchHandlesTimeline` over the KOL roster — `{ handle, text (≤200 chars), tag, ts, url, likes }`, deduped, last 6h, cached 90s.
- `topNews`: ~8 entries from `fetchNewsfeed` — `{ source, title, summary (≤180 chars), url, ts }`, cached 90s.
- `xBuzz`: aggregated `$TICKER` mention counts from recent tweets — `[{ ticker, mentions, deltaVs6hAgo }]` top 10. Lets the AI say "BONK chatter is up 4× in the last hour".
- Snapshot stays under ~25 KB. Wrap each fetch in `Promise.allSettled` so a slow provider doesn't break chat.

**Add tool calling in `src/routes/api/chat.ts`** (AI SDK `tool` + `stopWhen: stepCountIs(6)`):
- `lookup_token({ query })` → DexScreener search, returns full token row + chart sparkline summary.
- `get_token_tweets({ ticker | address, limit })` → fxtwitter search via existing providers.
- `get_kol_take({ handle | topic })` → last 5 tweets from KOL roster matching topic.
- `search_news({ query, hours })` → newsfeed filtered.
- `whale_activity({ address })` → recent buys/sells if available (birdeye), else "no data".

Tools run server-side, results streamed back as tool parts. System prompt updated to instruct: "Prefer calling tools for any specific ticker, KOL, or recent event question. Cite sources by handle/outlet."

Render tool calls in `AiChat.tsx` as collapsible "🔧 used `tool_name`" chips above the assistant message.

---

## Part 2 — Four new AI features

### A. Token Deep-Dive (`/ai/token/$query` + modal trigger)
- New route `src/routes/ai.token.$query.tsx` and a `<TokenDeepDive query=...>` component reusable as a modal from any token row.
- Server fn `analyzeToken({ query })` calls: DexScreener lookup → fxtwitter ticker search → newsfeed filter → AI generates structured JSON via `Output.object`:
  - `verdict` (1-line), `sentiment` (bull/bear/mixed + score 0-100), `whyMoving` (3 bullets), `risks` (array), `socialPulse` (top 3 tweet snippets), `news` (top 3 headlines), `onchain` (mcap/liq/vol/age).
- Renders as a single card with sections. Loading skeleton while streaming.
- Hook: add "AI" button on trending/movers/watchlist rows that opens this in a dialog.

### B. "Why is it pumping?" explainer
- Lightweight version of deep-dive scoped to *recent move*.
- New server fn `explainMove({ address, windowH })` → pulls 1h/6h price action + tweets + news in that window → AI returns 3-bullet explanation + confidence.
- Trigger: small ⚡ icon next to any token with >15% 1h move in trending/movers tables; opens a popover.

### C. AI Social Pulse on `/pulse`
- New component `src/components/pulse/AiSocialPulse.tsx` at the top of `SocialColumn` (collapsible, default open).
- Server fn `summarizeSocialPulse()` runs every 5 min (cache key), feeds last 80 tweets + news headlines to Gemini with `Output.object`:
  - `topThemes`: 3 themes with `{ title, oneLiner, tickers, tweetCount }`.
  - `surprisingTake`: 1 contrarian or notable tweet.
  - `risingHandles`: top 3 KOLs by engagement in window.
- Renders as 3 compact cards. Refresh button.

### D. Watchlist Sentiment + Alerts
- Extend existing watchlist (`src/lib/watchlist.ts` or similar) with a server fn `scoreWatchlist({ addresses })`:
  - For each token, parallel fetch tweets + news + price → AI returns `{ address, score 0-100, label, momentum: up/flat/down, flags: ["breaking-news", "kol-mention", "unusual-volume"], blurb (1 line) }`.
- New panel `src/components/watchlist/SentimentPanel.tsx` shown on watchlist page. Refreshes every 60s. Sort by score.
- "Alerts" sub-section lists tokens whose flag count rose since last poll — uses a localStorage cache of previous flags.

---

## Technical notes

- All AI calls go through existing `gateway.server.ts` helper; model `google/gemini-3-flash-preview` for chat/streaming, `google/gemini-2.5-flash` for structured one-shots (faster `Output.object`).
- New server fns live in `src/lib/ai/*.functions.ts` (client-callable) with `.server.ts` helpers for the heavy fetch work.
- All snapshot/tool fetches cached via existing `withCache` to respect provider rate limits.
- No schema/DB changes; everything in-memory + existing providers.
- Cost guard: snapshot capped at 25 KB, tool loop `stepCountIs(6)`, structured outputs use small schemas.

---

## Files

**New:**
- `src/lib/ai/tools.server.ts` — tool definitions
- `src/lib/ai/analyze-token.functions.ts` + `.server.ts`
- `src/lib/ai/explain-move.functions.ts` + `.server.ts`
- `src/lib/ai/social-pulse.functions.ts` + `.server.ts`
- `src/lib/ai/watchlist-sentiment.functions.ts` + `.server.ts`
- `src/components/ai/TokenDeepDive.tsx`
- `src/components/ai/MoveExplainerPopover.tsx`
- `src/components/pulse/AiSocialPulse.tsx`
- `src/components/watchlist/SentimentPanel.tsx`
- `src/routes/ai.token.$query.tsx`

**Edited:**
- `src/lib/ai/snapshot.server.ts` — add tweets/news/buzz
- `src/routes/api/chat.ts` — tools, stopWhen, updated system prompt
- `src/components/ai/AiChat.tsx` — render tool-call chips
- `src/components/pulse/SocialColumn.tsx` — mount AiSocialPulse
- `src/components/dashboard/MoversTable.tsx` (and trending) — add ⚡ + AI buttons
- Watchlist route — mount SentimentPanel
