## Goal

Stop reinventing trending/launches tables. Compose the dashboard out of best-in-class third-party embeds, and add a Pump.fun-flavoured chart tab next to the existing DexScreener chart.

## 1. TokenDetailProvider — add "PF Chart" tab

`src/components/token/TokenDetailProvider.tsx` currently has two tabs (Chart, Transactions). Add a third:

- **PF Chart** — iframe `https://www.gmgn.cc/kline/sol/{address}` (GMGN's pump.fun-aware k-line + trades, no API key). Order: Chart (DexScreener) → PF Chart (GMGN) → Transactions (DexScreener trades).
- Footer of modal keeps existing "Open ↗" link, plus a new "Open on Pump.fun ↗" → `https://pump.fun/{address}`.

Every clickable token in the app (TrendingTable, MemeOfTheDayCard, PumpfunLaunches, WatchlistView, future embeds) already routes through this provider, so the new tab is one edit, propagates everywhere.

## 2. Replace PumpfunLaunches with DexScreener PF embed

Drop the Solana-Tracker-powered scored table. Replace with an iframe of the canonical DexScreener Pump.fun page, which already ships Trending / Top / Rising / New / Graduated filters.

- Rewrite `src/components/dashboard/PumpfunLaunches.tsx` body to a `Panel` wrapping `<iframe src="https://dexscreener.com/solana/pumpfun?embed=1&theme=dark" />` at ~640px height, lazy-loaded.
- Keep the panel header ("Pump.fun · New Pairs") with a source badge.
- Remove the Solana-Tracker dependency for this widget: delete the `usePumpfunLaunches` hook usage here.

## 3. Replace TrendingTable on dashboard + /trending with DexScreener trending embed

- New component `src/components/dashboard/DexScreenerEmbed.tsx` — generic iframe wrapper (`src`, `title`, `height`).
- `/dashboard` row that currently renders `<TrendingTable limit={8} dense />` → render `<DexScreenerEmbed src="https://dexscreener.com/solana?rankBy=trendingScoreH6&order=desc&embed=1&theme=dark" title="Trending · Solana" height={520} />`.
- `/trending` route swaps the custom table for the same embed at full height (~80vh).
- Keep `TrendingTable.tsx` file in place but unused — easy to revert. If you want a hard delete, say so and I'll remove it + the `getTrendingFn` server fn.

## 4. Settings page provider matrix

Update `src/mocks/providers.ts` to add entries for the embed sources (DexScreener PF page, GMGN kline) and mark them `live` by default — they have no key/health to track.

## 5. Out of scope (kept for later)

- Wallet P&L (Birdeye) — untouched, still live.
- MarketPulse, NarrativeFeed, MemeOfTheDayCard — untouched (they aggregate scores from our own data).
- Solana Tracker server fn / provider — keeps powering the `notable_launches` slot inside the AI narrative (Section 1 of Phase 3 narrative wiring), so the API key is still useful. We can prune later if you'd rather drop it entirely.
- Watchlist still uses our `Token` shape (no change).

## Files touched

- Edit: `src/components/token/TokenDetailProvider.tsx` (add PF Chart tab + Open on Pump.fun link)
- Add: `src/components/dashboard/DexScreenerEmbed.tsx`
- Rewrite: `src/components/dashboard/PumpfunLaunches.tsx` (iframe-based)
- Edit: `src/routes/dashboard.tsx` (swap TrendingTable for embed)
- Edit: `src/routes/trending.tsx` (swap to full-height embed; add a small heading)
- Edit: `src/mocks/providers.ts` (add gmgn + dexscreener-pumpfun entries)

## Confirm

1. OK to keep `TrendingTable.tsx` + `getTrendingFn` in the repo (unused but available), or delete them?
2. Any other lists to embed (e.g. DexScreener Gainers/Losers, Most Active) as additional tiles on `/trending`?
