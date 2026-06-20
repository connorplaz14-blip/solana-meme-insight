# MemeDesk — 5-Phase Completion Plan

Grounded in a live audit. The app is mostly on real data already (CoinGecko, DexScreener, Solana Tracker, Birdeye, Lovable AI/Gemini, Supabase). Remaining gaps are concentrated in: chart data (synthetic), silent mock fallbacks (wallet, providers), mobile iframe overflow, empty/error states, and a few "generic SaaS" surfaces.

Each phase is shippable on its own and ends with a live-data verification step. I won't start phase N+1 until phase N is green.

---

## Phase 1 — Truth in data: kill silent mocks, surface "needs key" states

**Why first:** any other polish is meaningless if a panel is quietly serving `sampleWallet` or an empty array.

**Scope**
- `live.functions.ts`: when `SOLANA_TRACKER_API_KEY` is missing, return a structured `{ status: "missing-key", provider: "solana-tracker" }` instead of `[]`. Same for Birdeye wallet.
- `PumpfunLaunches` + `WalletView`: render a clear "Connect Solana Tracker / Birdeye to enable" empty state with a link to `/settings`, instead of looking broken.
- `wallet-pnl.tsx` meta: drop the "mock preview in Phase 1" copy.
- `adapters/README.md`: update to reflect that `liveAdapter` is the shipped adapter; `mockAdapter` is dev-only.
- `ProviderStatusCard` + `/settings`: clearly distinguish "live", "degraded", "not configured" (today everything starts as `ni`). Add the missing-key CTA inline.
- Remove `@/mocks/providers` import from `live.functions.ts`; derive the catalog from the providers actually wired in `src/lib/data/providers/`.

**Verify:** `/coins`, `/wallet-pnl`, `/settings` all show either real data or an honest "needs configuration" panel — never a silent empty/mock.

---

## Phase 2 — Real charts (kill the synthetic OHLCV)

**Why:** `chart.server.ts` is a sine-wave walk. A trading dashboard with fake candles is a non-starter.

**Scope**
- Add a real OHLCV provider in `src/lib/data/providers/`:
  - Primary: **Birdeye** `/defi/ohlcv` (already have a key path) for bonded tokens.
  - Fallback: **DexScreener** pair history (1m/5m/1h buckets) — no key needed.
  - For Pump.fun-only (unbonded) tokens, keep the GMGN kline iframe path that's already in `TokenChartEmbed`.
- Update `getTokenChartFn` to call the real provider, with graceful fallback chain → synthetic only as last resort, badged `SYNTH`.
- Add timeframe selector (5m / 1h / 4h / 1d) to `TokenChartPanel` and the modal Chart tab.
- Cache series in `cache.server.ts` with short TTL (30–60s).

**Verify:** Open meme-of-the-day chart, switch timeframes, confirm candles update from Birdeye/DexScreener (check `SourceBadge`), confirm the synth fallback only fires when both upstreams 4xx/5xx.

---

## Phase 3 — Trading-desk density & visual hierarchy

**Why:** Right now `/dashboard` is a 2-card hero + "jump in" link tiles — too SaaS-y. Traders want eyes-on-market density.

**Scope**
- Replace the "Jump In" link cards on `/dashboard` with live modules:
  - **Top Gainers / Top Losers** (split panel, derived from `useTrending()` sorted by `changes.h24`).
  - **Fresh Launches** strip (top 5 from `usePumpfunLaunches`, horizontal scroller).
  - **Narrative Pulse** mini (one-line narrative summary + keyword chips from `useNarratives`).
- Tighten `MarketPulse`: add 24h Solana TPS (free Solana RPC, already wired in `macro.server.ts`), DEX volume, fear/greed inline.
- Promote `AiTrendingTable` to dashboard as a collapsed module (default 5 picks, expand to all).
- Tokenize spacing: stop using ad-hoc paddings; use the existing `Panel/PanelBody` system everywhere.
- Replace generic emoji/Lucide icons in headers with the existing `SourceBadge` + tone accents.

**Verify:** `/dashboard` on a 1440px monitor shows ≥6 live data modules above the fold; no "Coming soon" / link-only cards; every panel has a `SourceBadge`.

---

## Phase 4 — Mobile-first overflow & nav fixes

**Why:** Audit found three iframes hard-set to `min-w-[640–760px]` with a `sm:min-w-0` reset that doesn't fire until ≥640px — so every phone scrolls horizontally inside panels. Plus `MarketBar`/`MarketTape` have unguarded min-widths.

**Scope**
- Replace all DexScreener iframe embeds on small screens with a native compact view derived from data we already fetch (price, change, liq, mcap, top txns) — fall back to iframe only at `md:`.
- Fix `MarketTape` so the SOL/BTC/ETH/FNG row truncates and wraps cleanly under 380px; ensure the hamburger never gets pushed off-screen.
- Audit every `min-w-[…]` flagged in §8 of the audit; switch to `grid-cols-[minmax(0,1fr)_auto]` + `truncate` patterns per the responsive-layout guide.
- Promote `OverflowGuard` from dev-only to a one-shot prod check that no-ops after first clean render (or just leave dev-only but fix the violations it currently logs).

**Verify:** Open `/dashboard`, `/coins`, `/trending`, `/wallet-pnl`, token-detail modal at 375×812 (iPhone SE-ish). Zero horizontal page scroll; no panel scrolls horizontally either — either it shows the native view or it's clearly a contained iframe.

---

## Phase 5 — Loading / error / empty states + polish pass

**Scope**
- Every `Panel` gets a real skeleton (terminal-style shimmering monospaced rows, not generic gray bars). Build one shared `<PanelSkeleton rows={n}/>`.
- Every fetch path renders a typed error panel with a Retry button calling `router.invalidate()`.
- Empty states: write copy that's useful (e.g. "No new launches in the last 30m — Pump.fun is quiet"), not generic "No data".
- Token detail modal: persist last-active tab per token in `localStorage`.
- Add a global "Last updated · 12s ago" footer to `MarketTape` driven by `useSolMarket().lastUpdated`.
- Final accessibility pass: focus rings on table rows, `aria-live` on the tape, keyboard navigation on `CommandPalette` already works — verify.
- Strip leftover `console.log`, dead imports, the unused `mockAdapter` export if nothing dev-only depends on it.

**Verify:** Throttle network in DevTools → skeletons appear, then real data; force an API to 500 → error state with Retry that recovers; offline → tape shows a "stale" indicator instead of going blank.

---

## Execution order & guardrails

```text
Phase 1 (truth)  ──►  Phase 2 (charts)  ──►  Phase 3 (density)  ──►  Phase 4 (mobile)  ──►  Phase 5 (polish)
   │                    │                       │                       │                       │
   └─ live-data check ──┴─ live-data check ─────┴─ live-data check ─────┴─ live-data check ─────┴─ live + responsive check
```

- After each phase I will: run the dev server, hit each affected route, confirm `SourceBadge` shows real provider (not `MOCK` / `SYNTH`), screenshot mobile + desktop, then report back.
- No new components duplicate existing ones — `Panel`, `SourceBadge`, `RiskBadge`, `ChangeCell`, `StatCell`, `TokenAvatar`, `CopyAddress`, `TokenChartEmbed`, `TokenListEmbed` are the canonical building blocks.
- No new mock data. New fallbacks must be honest "needs-config" states.

## Out of scope (explicit)
- Auth / user accounts.
- Trade execution / wallet signing.
- New data providers beyond what's listed in Phase 2.
- Visual redesign of the terminal aesthetic — only density + hierarchy improvements within it.

## Open question I'll ask before Phase 2

Birdeye OHLCV is gated by their paid plan tier for fine-grained intervals. If your current Birdeye key is the free tier, I'll use DexScreener pair history as the primary and badge accordingly — no extra cost, slightly coarser candles. I'll confirm which you have when I start Phase 2.
