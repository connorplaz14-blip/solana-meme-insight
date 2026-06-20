# Unify embed providers — GMGN for lists, DEX/Pump.fun for charts

Today the embeds are inconsistent: `/coins` and `PumpfunLaunches` use GeckoTerminal; the dashboard token chart and the detail-modal "Chart" tab use DexScreener; the detail modal also has a separate GMGN "PF Chart" tab. Standardise on one provider per job.

## Provider matrix

- **Token lists** (trending pools, new pairs) → **GMGN**
- **Charts for bonded tokens** (have a DEX pool) → **DexScreener**
- **Charts for not-yet-bonded tokens** (Pump.fun only) → **Pump.fun chart** (via GMGN kline `gmgn.cc/kline/sol/<addr>`, since `pump.fun` itself blocks iframing)

"Bonded" = `token.sources` includes `"dexscreener"`. No new server calls.

## Changes

### 1. New unified components — `src/components/dashboard/embeds/`

- `TokenListEmbed.tsx` — single source of truth for multi-token list embeds. Props: `kind: "trending" | "new-pairs"`. Resolves to GMGN URLs:
  - trending → `https://www.gmgn.cc/meme/sol`
  - new-pairs → `https://www.gmgn.cc/new-pair/sol`
  Renders inside an existing `Panel` with the GMGN `SourceBadge`. Keeps the responsive height behaviour we already use (`78vh`).
- `TokenChartEmbed.tsx` — single chart component. Props: `address`, `symbol`, `bonded?: boolean`, `defaultProvider?: "dex" | "pf"`, `height`. Picks DexScreener when `bonded`, Pump.fun (GMGN kline) when not. Exposes a small two-button toggle (DEX / PF) so the user can override the auto-pick. Persists the override per session in `localStorage` under `chart-provider:<addr>`.

Both components reuse the existing `Panel`/`PanelHeader`/`PanelBody` chrome, no new design tokens.

### 2. Helper — `src/lib/token-bonded.ts`

Tiny pure function `isBonded(token: { sources: Source[] }): boolean` → returns `token.sources.includes("dexscreener")`. Used by callers that know the token; the modal accepts an explicit `bonded` prop so callers can pass it through.

### 3. Update callers

- `src/routes/coins.tsx` → replace both `DexScreenerEmbed` instances with `<TokenListEmbed kind="trending" />` and `<TokenListEmbed kind="new-pairs" />`. Titles/subtitles updated to mention GMGN.
- `src/components/dashboard/PumpfunLaunches.tsx` → use `<TokenListEmbed kind="new-pairs" />`.
- `src/components/dashboard/TokenChartPanel.tsx` → use `<TokenChartEmbed address={mod.address} symbol={mod.symbol} bonded={isBonded(mod)} />`. Drops the hand-rolled DexScreener iframe.
- `src/components/token/TokenDetailProvider.tsx`:
  - Extend `TokenRef` with optional `bonded?: boolean`. `useTokenDetail().open(...)` accepts it.
  - Update every call site that opens the modal (`TrendingTable`, `MemeOfTheDayCard`, `WatchlistView`) to pass `bonded: isBonded(token)`. Watchlist looks up the matching `trending` row first; falls back to `undefined`.
  - Collapse the `Chart` / `PF Chart` tabs into a single `Chart` tab that renders `<TokenChartEmbed bonded={token.bonded} />` with the built-in DEX/PF toggle. Keep the `Transactions` tab on DexScreener (it's always pool-based — only useful when bonded; if not bonded, render a small "No DEX pool yet" empty state).

### 4. Keep `DexScreenerEmbed` for now

Don't delete `src/components/dashboard/DexScreenerEmbed.tsx` — `TokenChartEmbed` reuses it internally for the DEX iframe (already handles responsive height + source badge). Just stop using it as a list-embed wrapper.

## Risks / caveats

- GMGN pages (`/meme/sol`, `/new-pair/sol`) are full SPA pages, not an `?embed=1` widget. They may set `X-Frame-Options` / CSP `frame-ancestors` that block embedding. **Fallback plan**: if GMGN refuses to frame, `TokenListEmbed` falls back to GeckoTerminal with a visible "GMGN unreachable — showing GeckoTerminal" notice and the corresponding `SourceBadge`. Detection is best-effort (an iframe `onLoad` that never fires within 4s → assume blocked); this stays inside `TokenListEmbed` so callers don't care.
- `pump.fun` itself does not allow iframe embedding, so the "PF" provider is the GMGN kline URL we already use. Source badge labelled `PF` to keep the user-facing language consistent.

## Out of scope

- No data-layer changes (`live.functions.ts`, `dexscreener.server.ts`, mocks, narratives all keep their existing sources).
- No new API integrations, no AI prompt changes.
- `DexScreenerEmbed` keeps its current API; only its callers change.

## Verification

- `/coins`: both panels load via GMGN, fallback message appears only if GMGN blocks.
- `/dashboard`: Token Chart shows DexScreener for the meme-of-the-day (which has a DEX pool).
- Open a trending token from the table → modal shows single `Chart` tab on DexScreener with a `DEX | PF` toggle.
- Manually pass a `bonded: false` token (e.g. via a Pump.fun-only mock) → modal Chart defaults to PF and Transactions shows the empty state.
- Mobile (375px portrait) still has no horizontal overflow — the responsive iframe rules from the last pass still apply.
