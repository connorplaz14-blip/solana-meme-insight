# Refine X crawling — FxTwitter primary + Firecrawl fallback

## Why change what we just built

Firecrawl alone has two weaknesses for X content:
- **Profile scrapes are noisy**: x.com gates most timeline HTML behind auth, so the markdown often yields only nav links and zero tweets — we then fall back to a Google `from:` search, which returns whatever Google has indexed (often days old).
- **No engagement metrics**: search snippets give us text + URL only — no likes, replies, timestamp, author display name, or media.

The GitHub research found a better primary source:

- **FxTwitter v2** (`api.fxtwitter.com`) — same project as the well-known `fxtwitter.com` embed fixer. Free, unauthenticated, JSON, generous rate limits, actively maintained. Endpoints we need:
  - `GET /2/search?q=<term>&count=30` — full text search (handles cashtags, hashtags, `from:` operator)
  - `GET /2/profile/{handle}/statuses?count=30` — user timeline with replies flag
  - `GET /2/status/{id}` — single tweet enrichment (text, author, likes/replies/retweets/views, media, created_at)

Firecrawl stays wired as a fallback so the column never blanks if FxTwitter is down or rate-limits us.

## Scope

Only X-data fetching and the small UI bits that display engagement. Bluesky, Dexscreener, news, whales, narratives — untouched.

## New / edited files

### New: `src/lib/data/providers/fxtwitter.server.ts`

Thin wrapper around FxTwitter v2:
- `fxSearch(query, count)` → calls `/2/search`, returns normalized `XTweet[]`
- `fxUserTimeline(handle, count, withReplies)` → calls `/2/profile/{handle}/statuses`
- `fxStatus(id)` → calls `/2/status/{id}` for enrichment
- 8s `AbortController` timeout, `User-Agent: memedesk/1.0`, 5-min in-memory cache keyed by endpoint+params.
- Normalized `XTweet` type carries: `id, url, handle, author, text, createdAt (ISO), likes, replies, retweets, views, hasMedia`.

### Edited: `src/lib/data/providers/xfeed.server.ts`

Rewrite both modes to prefer FxTwitter, fall back to Firecrawl, then merge:

- `searchX(query, limit)`:
  1. Detect mode: `@handle` → route to `userTimelineX`; `$TICKER` or `#tag` → strip prefix, search; plain term → search.
  2. Call `fxSearch` (primary). If results ≥ 3, return.
  3. On empty/error, call existing `firecrawlSearch` path, then enrich each Firecrawl hit by calling `fxStatus(id)` in parallel (capped at 10, `Promise.allSettled`) so we still get engagement + clean text.
- `userTimelineX(handle, limit)`:
  1. `fxUserTimeline(h)` (primary).
  2. Fallback to Firecrawl scrape of `https://x.com/<h>`, then enrich via `fxStatus`.
- Dedup by tweet id across both sources.
- Keep the 5-min cache + the existing `SocialItem` output shape, but extend it (next section).

### Edited: `src/lib/data/providers/newsfeed.server.ts`

`SocialItem` gains optional engagement fields (all nullable, additive — no breakage):

```ts
likes?: number;
replies?: number;
retweets?: number;
views?: number;
hasMedia?: boolean;
```

`publishedAt` populated from `created_at` (real timestamp) instead of "now" when FxTwitter provides it. `fetchSocialFeed` wiring unchanged — it already routes through `xfeed`.

### Edited: `src/components/pulse/SocialColumn.tsx` (`PostCard` only)

Below the tweet text, render a one-line metrics strip when any metric is present:

`♥ 1.2k   ↩ 34   ⟲ 88   ◉ 12k`

- Mono, `text-[9px]`, `text-muted-foreground`, formatted via existing `compact` helper.
- Hide individually if a metric is missing or zero.
- Show a tiny `MEDIA` chip when `hasMedia`.
- No other layout changes; `SignalCard` / `LaunchCard` untouched.

### Edited: `src/lib/ai/snapshot.server.ts`

`recent-social` slice already pulls from `xfeed`; just include `likes/retweets` per post so AI context is richer. No behavior change beyond extra fields.

## Failure modes & guardrails

- FxTwitter 404 on unknown handle → fall through to Firecrawl, then return `[]` cleanly.
- FxTwitter 429 → cached value if present, else Firecrawl path.
- Enrichment errors are per-tweet `allSettled` — one bad id never breaks the page.
- All network calls behind 8s timeout + try/catch returning `[]`.
- No new secrets, no new connectors, no schema changes.

## Out of scope

- KOL curation, narrative tagging from tweets, sentiment scoring — separate follow-up.
- Replacing Bluesky fallback — it stays as final safety net.
- Anything outside the Social column / AI snapshot social slice.

## Technical notes

```text
SocialColumn → useSocialFeed(active) → live.functions.ts (cache key social:x:${q})
  → newsfeed.server.fetchSocialFeed
      → xfeed.searchX OR xfeed.userTimelineX
          ├─ fxtwitter.server (PRIMARY, JSON)
          └─ firecrawl.server (FALLBACK, markdown) → enrich via fxStatus
      → bluesky (final fallback, unchanged)
```

FxTwitter is a Cloudflare Worker app, so requests are fast (<300ms typical) and Worker-runtime-safe — no Node-only deps, plain `fetch`.
