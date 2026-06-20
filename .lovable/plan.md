## Real-time pump.fun launch stream (`/launches`)

A new top-level page that streams brand-new Solana token launches the moment they hit pump.fun, with filters and a sticky stats bar. No paid APIs, no keys.

### Data source

**PumpPortal public WebSocket** (`wss://pumpportal.fun/api/data`) — free, no auth, used by every open-source pump.fun bot/tracker on GitHub (pumpfun-volume-bot, pump-portal-python-client, pumpswap-trade-bot, etc.). Three subscriptions:

- `subscribeNewToken` → `txType: "create"` payloads: mint, name, symbol, uri (IPFS metadata), traderPublicKey (dev), initialBuy (tokens), solAmount, marketCapSol, bondingCurveKey, pool, timestamp.
- `subscribeTokenTrade` (filtered to mints we already render) → live mcap + last-trade ticker per row.
- Optional later: `subscribeMigration` for pump→Raydium graduations.

A 5 s static REST fallback (`https://frontend-api.pump.fun/coins?sort=created_timestamp&order=DESC&limit=50` via a server function proxy) seeds the list if the WS hasn't fired yet, so the page is never empty on first paint.

### Architecture

- **Server route** `src/routes/api/pumpfun/latest.ts` — GET handler that fetches the REST seed list (proxied to dodge browser CORS) and normalizes to the same shape the WS produces. Cached 5 s. Graceful empty array on upstream failure.
- **Hook** `src/hooks/usePumpfunStream.ts` — opens the WS once, auto-reconnects with exponential backoff (1s→30s cap), keeps a ring buffer of the last 200 launches in a `useSyncExternalStore`-backed store, merges live trade updates into the matching row. Tears down on unmount.
- **Route** `src/routes/launches.tsx` — uses TanStack Query to seed from the server route, then subscribes to the hook. Renders header, filter bar, stats strip, and the live feed table.

### UI (matches existing Pulse aesthetic)

```text
┌─ LAUNCHES · live pump.fun stream ─────── ● connected · 142/min ┐
│ [search name/symbol] [min mcap $___] [min dev buy ◯1 ◯5 ◯10 SOL] │
│ stats: 24h count · avg mcap · top dev · graduated count          │
├──────────────────────────────────────────────────────────────────┤
│ ▲ NEW  PEPE2  Pepe Two       2s   $4.2k   dev 1.2◎   pump.fun ↗ │
│        BONKER Bonker Inu     8s   $1.8k   dev 0.5◎   pump.fun ↗ │
│ …                                                                │
└──────────────────────────────────────────────────────────────────┘
```

Row flashes pos-green for 1.5 s when first inserted, dims as it ages out of the viewport. Click row → opens `https://pump.fun/coin/{mint}` in a new tab. Hover reveals copy-mint button and a "chart" link to DexScreener.

Compact mode for narrow viewports drops the dev address column.

### Navigation wiring

- `src/components/layout/SideNav.tsx` — new "Launches" entry with a Rocket icon, placed between Pulse and Trending.
- `src/components/layout/CommandPalette.tsx` — new command "Open Launches" → navigates to `/launches`.

### Files

New:
- `src/routes/launches.tsx`
- `src/routes/api/pumpfun/latest.ts`
- `src/hooks/usePumpfunStream.ts`
- `src/components/launches/LaunchRow.tsx`
- `src/components/launches/LaunchFilters.tsx`
- `src/components/launches/LaunchStats.tsx`

Edited:
- `src/components/layout/SideNav.tsx`
- `src/components/layout/CommandPalette.tsx`

### Out of scope

No buy/sell actions, no wallet connect, no backend persistence, no notifications. Migration/graduation column can be added in a follow-up. No new npm dependencies — uses the browser's native `WebSocket`.

### Risk / fallback

If PumpPortal's WS rate-limits or goes down, the REST seed (refetched every 10 s) keeps the page populated with the latest 50 launches. A small "stream offline · polling" badge replaces the connected indicator so the degraded state is obvious.
