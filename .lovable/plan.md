## Phase 3 scope

Per `docs/MEMEDESK_BUILD_PLAN.md`, Phase 3 has two live-data goals (Gemini narratives already shipped in Phase 2):

1. **Pump.fun launches** — replace the mock `notable_launches` / launches feed with a real on-chain source.
2. **Wallet P&L** — replace the mock `/wallet-pnl` page with a real wallet portfolio + P&L lookup.

Both require third-party API keys you'll need to provide. I'll recommend one provider per slot (cheapest path to "live"); you can swap to the alternate later.

## Recommended providers

| Slot | Recommended | Alternative | Why |
| --- | --- | --- | --- |
| Pump.fun launches | **Solana Tracker** (`/tokens/latest`, `/tokens/trending`) | Bitquery GraphQL | Simple REST, generous free tier, no GraphQL wiring |
| Wallet P&L | **Birdeye** (`/v1/wallet/token_list`, `/defi/portfolio`) | Vybe Network | Mature wallet endpoints, single API key |

If you'd rather use Bitquery or Vybe, say so before we add secrets and I'll swap.

## What gets built

### 1. Launches provider
- New `src/lib/data/providers/solana-tracker.server.ts` with `fetchPumpfunLaunches()` (newest mints + early-momentum scoring: age < 24h, liquidity > $5k, txns > 100).
- New server fn `getPumpfunLaunchesFn` in `src/lib/data/launches.functions.ts`.
- Extend `DataAdapter` with `getPumpfunLaunches()`; wire `live.ts` to the server fn and `mock.ts` to existing mock.
- New hook `usePumpfunLaunches()` in `src/lib/data/index.ts`.
- Cache 60s via existing `cache.server.ts`; health-ping via `health.server.ts`.
- Feed real launches into `generateDailyNarrative` payload (replaces the mock `notable_launches` array → Gemini gets real signal).

### 2. Wallet P&L provider
- New `src/lib/data/providers/birdeye.server.ts` with `fetchWalletPortfolio(address)` returning `{ totalUsd, tokens: [{symbol, balance, valueUsd, pnl24hPct, pnlAllUsd}], realizedPnlUsd, unrealizedPnlUsd }`.
- New server fn `getWalletPnLFn` (input: Solana address, Zod-validated).
- Replace the mock `getWalletPnL` in `live.ts`; keep mock as fallback when address invalid or provider 4xx.
- Update `WalletView.tsx` to drop the "Phase 3 mock" banner and surface real source badge + last-updated timestamp. UI shape preserved.
- Cache 30s per address; health-ping registered.

### 3. UI surface area (minimal)
- `/wallet-pnl`: banner says "Live · Birdeye" when data is real, "Mock" on fallback.
- Dashboard `NarrativeFeed` / `notable_launches` block: now real launches with source badge `solana-tracker`.
- Settings provider matrix: Solana Tracker + Birdeye move from MISSING → LIVE (or MOCK if key not set).

### 4. Secrets (you provide)
After you confirm provider choice I'll request via `add_secret`:
- `SOLANA_TRACKER_API_KEY` — get from solanatracker.io dashboard (free tier OK).
- `BIRDEYE_API_KEY` — get from birdeye.so/developers (Standard tier, free).

Until each key is set, that slot stays on the mock adapter automatically (no broken UI).

### Out of scope (stays for Phase 4)
- Browserbase / Oxylabs / Apify scraping.
- X (Twitter) API CT scanning.
- Auth / saved watchlists in DB.

## Confirm before I start
1. OK to use **Solana Tracker** for launches and **Birdeye** for wallet P&L? (or pick alternates)
2. Do you have both API keys ready, or should I scaffold the code first and request keys once it's wired?
