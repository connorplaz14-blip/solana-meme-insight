# Mobile breakpoint pass — no horizontal scrolling

Every panel needs to fit a 360–414px portrait viewport. Today four things break that rule: the top market tape (scrolls horizontally on purpose), four wide data tables, the DexScreener iframes (forced 640px min), and a few panel headers whose right-hand controls overflow.

## Changes

### 1. Top market tape — `src/components/layout/MarketTape.tsx`
- Drop the `overflow-x-auto` strip on mobile. Show a condensed 3-cell row that fits 360px: **SOL** (price + Δ), **BTC** (price + Δ), **Fear & Greed** (value + label). Hide the other cells under `md:flex`.
- Keep the hamburger and search buttons; the logo block stays `hidden md:flex`.
- Cells: shrink min-width to ~84px on mobile, divider stays 1px. Height stays 40px.

### 2. Wide tables → card lists under md

For each, render the existing `<table>` only at `md:block`, and render a stacked card list under `md:hidden`. Same data, fewer fields per row, no horizontal scroll.

- `src/components/dashboard/TrendingTable.tsx`
  - Mobile card per token: avatar + name/symbol on top row; second row mcap · vol · 24h change; third row source badges + risk badge + star button.
  - Header `right` block (search input + risk select) moves below the title on mobile (`flex-col gap-2 sm:flex-row`); search input becomes full-width.
- `src/components/wallet/WalletView.tsx` (positions table)
  - Mobile card per position: name/symbol + status pill; row of cost / value / P&L / 24h ROI as 2×2 grid; contract address row.
  - Stat grid already `grid-cols-2 md:grid-cols-4` — leave alone.
- `src/components/watchlist/WatchlistView.tsx`
  - Mobile card per entry: avatar + name/symbol + remove (×); row of price · mcap · 24h; contract + added date underneath.
  - "Add Token" panel: keep stacked; the symbol/name `grid-cols-2` stays.

### 3. DexScreener / GeckoTerminal iframes — `src/components/dashboard/DexScreenerEmbed.tsx`
- Remove the hard `minWidth: 640` on the iframe wrapper. Iframe becomes `width: 100%`, no horizontal scroll on the parent. The embedded site handles its own internal scroll inside the iframe — that's acceptable and doesn't push the page.
- Reduce default `height` behaviour on mobile: when caller passes `"78vh"` it stays; numeric heights shrink with `min(<n>px, 70vh)` only on `< md`.

### 4. Panel header overflow — `src/components/terminal/Panel.tsx`
- Make `PanelHeader` stack on mobile: `flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:justify-between`. The `right` slot wraps with `flex-wrap` so refresh + source badges don't squash titles. Title row keeps `truncate`.

### 5. AI Trending picks — `src/components/trending/AiTrendingTable.tsx`
- Already card-style. Tighten: token button + "why" stack vertically under `sm:` (currently flex side-by-side), so the why text uses full row width on phones.

### 6. AI Chat — `src/components/ai/AiChat.tsx`
- Reduce height from `h-[78vh]` to `h-[calc(100vh-7rem)]` on mobile so it fits under the tape without page scroll, full `78vh` from `md:`. Suggestion chips already wrap; leave alone.

## Out of scope
- No new pages, no design-token changes, no replacing the iframe providers.
- Tablet (md+) and desktop stay unchanged — all edits are guarded behind `md:` / `sm:` and additive.
- `src/components/dashboard/MarketBar.tsx` is not mounted in the root shell; leave untouched.

## Verification
- Resize preview to 375 × 812 and 414 × 896 portrait.
- Walk every route: `/dashboard`, `/coins`, `/trending`, `/narratives`, `/watchlist`, `/wallet-pnl`, `/ai`, `/meme-of-the-day`, `/settings`.
- Confirm `document.documentElement.scrollWidth === clientWidth` (no horizontal page scroll). Iframes may scroll *inside* their box — that's expected.
