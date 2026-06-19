## MemeDesk Cockpit Upgrade — Phased Plan

Goal: evolve the current terminal into a Bloomberg-style cockpit. Five phases, each ships independently. **Strict rule: no mock panels.** If a panel doesn't have a real data source already wired (DexScreener, GeckoTerminal, Solana Tracker, CoinGecko, Birdeye, Pump.fun, Lovable AI), it doesn't ship.

---

### Phase 1 — Top market tape + ⌘K command bar

What ships:
- **Tape strip** pinned above main content on every route: SOL, BTC, ETH spot + 24h%, total crypto 24h vol, SOL 24h vol, Solana network status (TPS / slot health), Fear & Greed index, top 24h meme mover, current dominant narrative.
- Auto-scrolls on mobile, static grid on desktop. Green/red micro-badges, tabular-nums.
- **⌘K / Ctrl+K command palette** (shadcn `Command`): jump to any route, search tokens by symbol/CA (DexScreener search API), open wallet by address, jump to a narrative.
- Recent searches in localStorage. ESC closes. `/` also opens it.

Real data sources:
- BTC/ETH/SOL + global vol: CoinGecko `/simple/price` + `/global` (already wired).
- Fear & Greed: `api.alternative.me/fng` (free, no key).
- Solana TPS/slot: `api.mainnet-beta.solana.com` RPC `getRecentPerformanceSamples`.
- Top mover + narrative: existing snapshot / narrative provider.
- Token search: DexScreener `/latest/dex/search`.

Skipped (no real source today): "gas" on Solana — replaced with priority fee / TPS instead.

---

### Phase 2 — Cockpit visual pass

Tighten the existing screens toward the cockpit aesthetic without adding panels.
- Near-black bg, graphite panels, 1px hairline borders, glassy headers.
- Neon accents reserved: green = positive flow, red = sell pressure, amber = warn, blue/violet = AI insight. Strip incidental color use elsewhere.
- Mono font (JetBrains Mono) locked for prices, tickers, CAs, %, sizes. Sans (existing) for labels.
- Compact density: row height 28px, header 32px, tabular-nums everywhere.
- Status rail in sidebar footer: "SYSTEM ONLINE" pulse + per-source dots (reuses health.server.ts).

No new data. No new components — restyle only.

---

### Phase 3 — Dashboard as fixed bento workspace

Rebuild `/dashboard` as a dense bento grid (CSS grid, not draggable). Every tile is backed by a real source we already have, or it's cut.

Tiles (all real data):
- Tape summary (Phase 1 condensed).
- **Meme of the Day** (existing).
- **AI Daily Brief** (existing narrative + snapshot; add "Regenerate" button).
- **Trending — top 8** (existing DexScreener trending, compact).
- **Live Pump.fun launches — top 6** (existing).
- **Watchlist mini** (existing watchlist store, sparklines).
- **Wallet activity strip** (existing wallet-pnl tracked wallets; latest tx per wallet).
- **Data source health** (existing health.server.ts: connected / degraded / down).

Cut from the inspiration prompt (no real source wired yet — would require mocks):
- Orderbook, recent trades, buy/sell pressure meter, holder concentration, LP status, dev/insider wallet card, candlestick chart with RSI/MACD/VWAP, backtests, alert builder. These are tracked in a "Phase 6+" backlog, not built now.

---

### Phase 4 — Full mobile reflow + bottom nav

- Replace left rail with bottom tab bar on `<md`: Dashboard, Coins, AI, Watchlist, Wallet. Overflow ("More") opens a sheet with Narratives, Trending, Meme of Day, Settings.
- Tape strip becomes horizontal scroll-snap row.
- Bento collapses to single column in this order: Tape → Meme of Day → AI Brief → Trending → Pump launches → Watchlist → Wallet.
- ⌘K palette becomes a full-screen sheet triggered by a search icon in the top bar.
- Sticky top bar (44px) with logo + search + notification dot.
- Safe-area insets respected (env(safe-area-inset-bottom)).

---

### Phase 5 — Hardening

- Skeletons on every tile (no spinners).
- Empty + error states per tile, never a whole-page crash.
- "DEMO" badge logic removed (we have no mock panels by rule).
- `prefers-reduced-motion` disables tape scroll + pulses.
- Lighthouse pass on `/dashboard` mobile + desktop.

---

### Technical notes

- New route-agnostic shell component `src/components/layout/CockpitShell.tsx` wraps `<Outlet />` with `<MarketTape />` + `<CommandPalette />`. Mounted in `__root.tsx`.
- `src/lib/data/providers/macro.server.ts` — new: BTC/ETH/SOL/global vol/FNG/TPS. Cached 30s in-memory.
- `src/lib/data/providers/solana-rpc.server.ts` — new: RPC client for TPS/slot.
- `src/components/layout/MarketTape.tsx`, `CommandPalette.tsx`, `BottomNav.tsx`, `StatusRail.tsx` — new.
- `src/routes/dashboard.tsx` — rewritten as bento grid using existing tile components.
- `src/styles.css` — add `--font-mono`, tighten density tokens, add cockpit color tokens.
- No new dependencies expected beyond `cmdk` (already shipped via shadcn Command).

### What I'd build first if you greenlight

Phase 1 only (tape + ⌘K). It's the single highest-impact change and unlocks the cockpit feel before any restyle or restructure. Then we decide Phase 2 vs 3 next.
