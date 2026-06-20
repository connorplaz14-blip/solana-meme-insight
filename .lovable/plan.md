## Goal

On `/pulse`, the **Whales** column often shows nothing (Birdeye trades endpoint is unreliable on the free tier, and an empty watchlist short-circuits the column). The **X / Social** column relies on Nitter mirrors that are largely dead in 2026, with no way to follow specific accounts. Fix both, and make X feed configurable.

## Whales column

**Server (`src/lib/data/providers/solana-tracker.server.ts` + `live.functions.ts`)**
- Add `fetchTokenTrades(mint, limit)` hitting `https://data.solanatracker.io/trades/{mint}` (Solana Tracker key already configured) and normalize to the existing `WhaleTradeRow` shape.
- Update `getTokenWhaleTradesFn` to try Birdeye first, fall back to Solana Tracker when Birdeye returns empty or errors. No key → return `[]`.

**UI (`src/components/pulse/WhalePingsColumn.tsx`)**
- If watchlist is empty, fall back to the top 6 trending tokens automatically so the column is never blank.
- Show a small header strip: source label ("Watchlist · N" or "Trending (auto)") and four threshold chips (≥$1k / $2.5k / $10k / $25k) that drive the min-USD filter.
- Replace the silent "No whale trades yet" with an actionable empty state explaining the threshold and refresh.

## X / Social column

**Server (`src/lib/data/providers/newsfeed.server.ts`)**
- Detect query mode from the prefix: `@handle` → user timeline, `$TAG` or plain text → search.
- Expand Nitter host list (privacydev, poast, tiekoetter, kavin.rocks, …) and try in order.
- Add a second-tier RSSHub fallback (`rsshub.app`, `rss.shab.fun`) hitting `/twitter/user/:handle` or `/twitter/keyword/:q`.
- Tweak the title parser so user-timeline RSS items keep the right handle.

**UI (`src/components/pulse/SocialColumn.tsx`)**
- New presets row (toggleable): cashtags (`$SOL`, `$BONK`, `$WIF`, `$JUP`), accounts (`@aeyakovenko`, `@SolanaFloor`, `@blknoiz06`), terms (`pump.fun`, `solana memecoin`, `rugpull`, `airdrop`). Clicking adds to saved queries and activates.
- Input placeholder updated to `@user, $TAG, or keyword`. Saved-query cap raised to 12.
- Active-query meta row shows the detected mode badge (USER / TAG / TERM) so users see how it'll be fetched.
- Empty state explains mirrors may be rate-limited and suggests refreshing or trying a preset.
- Storage key bumped to `v2` to seed the new default mix.

## Out of scope

- No new dependencies, no auth changes, no schema changes.
- Other Pulse columns (News, Trending) and the watchlist page itself are untouched.
- No paid X/Twitter API — we stay on free RSS mirrors.
