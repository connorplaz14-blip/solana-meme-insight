## Problem

1. DexScreener already returns `info.imageUrl` and we map it to `Token.logoUrl`, but `TokenAvatar` ignores it and only renders the colored initials fallback — so no coin images ever appear.
2. The custom Recharts `TokenChartPanel` depends on the chart provider and is brittle. For Solana memecoins, the official DexScreener embed widget is more accurate and zero-maintenance.

## Plan

### 1. Render logos in `TokenAvatar`
- Accept an optional `logoUrl` prop.
- When present, render an `<img>` (lazy, `referrerPolicy="no-referrer"`, `onError` falls back to initials state).
- Keep the colored-initials block as the fallback (no logo, or image fails to load).
- Preserve current sizing/border styling so layouts don't shift.

### 2. Pass `logoUrl` from all call sites
- `MemeOfTheDayCard`: pass `logoUrl={t.logoUrl}`.
- `TrendingTable`: pass `logoUrl={t.logoUrl}`.
- `WatchlistView`: no logo on `WatchlistEntry` today — leave as initials (out of scope; can be added later when we store logos on watchlist entries).

### 3. Replace `TokenChartPanel` body with DexScreener embed
- Keep the `Panel` shell, header (token symbol/name), and timeframe buttons removed (the embed has its own controls).
- Render an `<iframe>` pointing to:
  `https://dexscreener.com/solana/{address}?embed=1&theme=dark&trades=0&info=0`
  sized to fill the panel (e.g. `h-[420px]` or current height), `loading="lazy"`, `title` for a11y.
- Loading state: show "Loading chart…" until `mod?.address` is available.
- Empty state: if no address, show existing "Chart unavailable" message.
- Remove the now-unused `useTokenChart` call from this component (hook itself stays for other potential uses).

### Files touched
- `src/components/terminal/TokenAvatar.tsx` — add image rendering with fallback.
- `src/components/dashboard/MemeOfTheDayCard.tsx` — pass `logoUrl`.
- `src/components/dashboard/TrendingTable.tsx` — pass `logoUrl`.
- `src/components/dashboard/TokenChartPanel.tsx` — swap Recharts area/bar chart for DexScreener iframe.

### Out of scope
- Storing logos on `WatchlistEntry`.
- Removing the `getTokenChartFn` server function / chart provider (kept for potential future use; can be pruned in a follow-up).
