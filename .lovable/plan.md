## Goal

Replace flaky X mirrors (Nitter / RSSHub) and Dexscreener-derived social signals with **Firecrawl-scraped X data**. No third-party API key needed — Firecrawl is wired through Lovable's connector gateway. Used for:

1. Pulse → **X / Social** column (primary)
2. AI snapshot context (`/ai`, chat)
3. Narrative chatter signals

Dexscreener stays for price, launches, charts, token detail. Only the **social/news signal layer** swaps to X.

## Provider: Firecrawl (Lovable connector)

You connect Firecrawl once via the Connectors panel — I'll surface the connect button. After that, `LOVABLE_API_KEY` + `FIRECRAWL_API_KEY` are available server-side and we call the gateway at `https://connector-gateway.lovable.dev/firecrawl/...`.

How we use it:
- **Search mode** (`$SOL`, `solana memecoin`, etc.): Firecrawl `/v2/search` with `query: "site:x.com <term>"`, `tbs: "qdr:d"` (last day), `limit: 20`. Returns titles + URLs + snippets directly — no scrape needed for the feed.
- **User mode** (`@aeyakovenko`): Firecrawl `/v2/scrape` on `https://x.com/<handle>` with `formats: ['markdown']`, `onlyMainContent: true`, then a small markdown parser extracts the tweet list. Heavier; cached aggressively.
- **News-style discovery** for narratives: same `/v2/search` with broader Solana queries, dedup by URL.

Trade-off vs Apify: Firecrawl search returns tweet *summaries* (text snippet + url + timestamp from Google), not full engagement metrics. Cards still render fine — they just drop the like/retweet counts. If you later want full engagement, we can layer a paid actor on top.

## Architecture

```text
src/lib/data/providers/
  firecrawl.server.ts    NEW  gateway wrapper (search + scrape), reads
                                LOVABLE_API_KEY + FIRECRAWL_API_KEY from
                                process.env inside the handler
  xfeed.server.ts        NEW  · searchX(query)        → /v2/search
                                · userTimelineX(handle) → /v2/scrape + parse
                                · normalize to SocialItem (source: "X")
                                · in-memory cache, 5-min TTL
  newsfeed.server.ts     EDIT remove Nitter / RSSHub blocks; fetchSocialFeed
                                calls xfeed first, Bluesky as fallback when
                                Firecrawl returns empty / 402
  narrative.server.ts    EDIT topic chatter sourced from xfeed
src/lib/ai/snapshot.server.ts
                         EDIT recent-social slice from xfeed
src/components/pulse/SocialColumn.tsx
                         EDIT empty-state + SourceBadge colors; drop
                                SocialTickers / DexScreener badge mappings
                                from the social column UI
```

## Failure / cost handling

- 5-min in-memory cache per query (and per handle) — Firecrawl billed per call.
- On Firecrawl 402 (out of credits): fall back to Bluesky search; show a small `fallback` pill in the column header.
- 8s `AbortController` timeout, same pattern as existing `fetchFeed`.

## What's removed from the social path

- `NITTER_HOSTS`, `RSSHUB_HOSTS`, `parseSocialXml`, the nitter/rsshub loops.
- `fetchSocialSignals` (SocialTickers) and `fetchDexLaunches` calls **from the social feed only** — those helpers stay exported for other surfaces that still use Dexscreener launches.

## Out of scope

- Price, chart, market cap, token detail — still Dexscreener.
- News RSS column — unchanged.
- Whales — unchanged.

## Next step after approval

1. I'll surface a Connect button for Firecrawl.
2. Once connected, implement the files above.
3. Verify `/pulse` Social column shows real X results for `$SOL`, `@aeyakovenko`, `solana memecoin`.
