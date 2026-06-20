# Plan: KOL-driven X feed (lists + curated handles)

FxTwitter has no list endpoint (confirmed `/2/list/{id}` → 404), so X Lists can't be hit as a single source. Workaround: scrape the list page's "Members" via Firecrawl once, cache the handle set for a long TTL, and fan out per-handle through FxTwitter — same path we already use for `fetchHandlesTimeline`.

## Changes

### 1. Expand curated roster — `src/lib/data/providers/xfeed.server.ts`
Replace `SOLANA_KOLS` with a tiered, deduped roster that includes the user's named accounts:

- **Traders / KOLs:** `blknoiz06` (Ansem), `MustStopMurad`, `Cupseyy`, `notthreadguy`, `frankdegods`, `trader1sz`, `MoonOverlord`, `0xRamonos`, `ZssBecker`, `gake_eth`
- **Solana / infra founders:** `aeyakovenko`, `rajgokal`, `0xMert_`, `weremeow` (Jupiter), `a1lon9` (Pump.fun)
- **Project / culture accounts:** `pumpdotfun`, `JupiterExchange`, `TheOnlyNom`, `bonk_inu`, `dogwifcoin`, `SolanaFndn`, `SolanaFloor`
- **Risk / on-chain analysts:** `zachxbt`, `lookonchain`, `bubblemaps`, `Rugcheckxyz`, `DefiIgnas`

Add an optional `KOL_TAGS` map (handle → tag like `trader`, `founder`, `risk`, `culture`) used later for column chips. No behavior change to existing callers.

### 2. New X-list scraper — `src/lib/data/providers/xlist.server.ts` (new file)
- `fetchListMembers(listId: string): Promise<string[]>` — scrapes `https://x.com/i/lists/{id}/members` via `firecrawlScrapeMarkdown`, regex-extracts `@handle` patterns / `/{handle}` profile links, dedupes, filters non-handles, caches in-memory for 6h. Empty array on failure (always fall back gracefully).
- Constant `SOLANA_KOL_LISTS` with the four list IDs the user pasted (the 1777… duplicate is collapsed):
  - `1777037601578287430`
  - `1747955009617006656`
  - `1726621096902807989`
  - `1587987762908651520`
- `fetchAllListMembers()` — Promise.allSettled over the four IDs, merged + deduped.

### 3. Wire into KOL feed — `src/lib/data/providers/newsfeed.server.ts`
When a query matches `@kols` / `kols`:
1. `members = await fetchAllListMembers()` (cached).
2. `roster = unique([...SOLANA_KOLS, ...members])`, capped at ~60 handles to keep the fan-out bounded.
3. `fetchHandlesTimeline(roster, perHandle=2, limit)` (drop `perHandle` from 3→2 so the larger roster doesn't blow the 8s budget).
4. If list scrape returned nothing, fall back to the hardcoded `SOLANA_KOLS` — same behavior as today.

### 4. UI polish — `src/components/pulse/SocialColumn.tsx`
- Add the new handles to the presets dropdown: `@blknoiz06`, `@MustStopMurad`, `@Cupseyy`, `@a1lon9`, `@weremeow`, `@TheOnlyNom`, `@bonk_inu`, `@dogwifcoin`, `@zachxbt`, `@lookonchain`, `@bubblemaps`, `@Rugcheckxyz`.
- Leave the existing "KOLs" preset; it now silently pulls list members + curated roster.

## Notes / trade-offs
- X Lists aren't directly fetchable without auth, so we rely on Firecrawl scraping the public list page. Twitter often gates `/members` behind auth — if Firecrawl returns no handles, we'll quietly fall back to the curated roster. Acceptable degradation, no user-facing error.
- Per-handle fan-out cost: ~30-60 FxTwitter calls per KOL refresh, all parallel, cached 5min — same pattern as today, just wider.
- No schema/API changes; SocialItem shape untouched.

## Files
- edit `src/lib/data/providers/xfeed.server.ts`
- new  `src/lib/data/providers/xlist.server.ts`
- edit `src/lib/data/providers/newsfeed.server.ts`
- edit `src/components/pulse/SocialColumn.tsx`
