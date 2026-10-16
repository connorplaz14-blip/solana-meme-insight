# CTRL Intelligence — verified development checkpoint

16 October 2026. Feature branch: `codex/ctrl-intelligence-wallet-audit-20261016`.

## What works in this increment
- Reused provenance-pinned Python FIFO engine; fixed fee double counting, unknown-fee profit, opening sells, canonical event deduplication and unsafe transfer matching. Decimal strings preserve precision.
- Read-only Helius ingestion with finalized/token-account history requests, 2,000-record ceiling, 40-page ceiling and 120-second wall-clock checks. Provider failures are sanitized. Historical USD prices are never assumed from stablecoin pegs or current prices.
- Durable Postgres job queue, atomic worker claims, ten-minute leases, immutable analysis versions, 20-job/minute admission budget, service-token authentication and idempotency.
- CTRL wallet/token form with Simple and configurable Terminal mode, density, panel visibility, saved/reset layout, request identity isolation and source/coverage presentation.
- Removed wallet sample fallback and Birdeye's inferred acquired cost, profit and wallet score. Birdeye returns observed holdings only.
- Updated stale TanStack inputValidator calls to installed API's validator; normalized existing formatting in a separate local commit to make full lint usable.

## Verification evidence
| Check | Result |
| --- | --- |
| Frontend Vitest | 17 passed across 4 files |
| Python pytest | 38 passed; 4 skipped (real psycopg/Postgres integration unavailable from this runtime) |
| Python ruff / compileall | Pass |
| Whole-app ESLint | 0 errors; 12 existing warnings (refresh exports / existing stream hook) |
| TypeScript tsc --noEmit | Pass |
| NITRO_PRESET=vercel npm run build | Pass; .vercel/output generated |
| HTTP/SSR smoke | HTTP 200; wallet heading and CTRL branding present |
| Independent review | Accounting, workload, persistence and UI findings reviewed; material findings corrected with regression evidence |
| Added-source credential pattern scan / git diff --check | No added credential patterns; whitespace check passes |
| Browser screenshot | Blocked: runtime browser absent; Chromium download returned invalid/truncated archive. DOM interaction tests ran in jsdom, not a real browser |

## Database evidence and its limits
Created a dedicated development project `ctrl-intelligence-preview` (Neon project `odd-silence-34862599`), database `ctrl_intelligence`, PostgreSQL 17.11. Compute fixed at 0.25 CU with a 3,600-second active-time quota; no application production data was accessed. Account rejected explicit suspension tuning, so that setting was omitted.

Applied the checked-in migration through the connected SQL interface. Inserted a clearly labelled synthetic job, atomically claimed it, persisted its immutable synthetic $10 gross / $3 fees / $7 net payload, then read it back in a separate SQL call. A stale/wrong-lease update affected zero rows and retained the complete payload.

This proves the SQL schema/persistence path on a real isolated PostgreSQL instance. It does not prove the Python psycopg network path: runtime DNS/network access blocks direct database connections. Four driver/worker integration tests therefore remain skipped. A local Postgres attempt was also blocked by runtime user/process permissions; it was not treated as successful persistence.

## Deployment
- No production deployment or promotion.
- New preview URL: none. Vercel project creation returned HTTP 403: permission to create project denied for team `team_6C7Ib5PlR8m7yWFAt7lDmcld`. No authenticated local Vercel CLI fallback was available.
- The Vercel-target build is ready to deploy after project creation permissions and preview settings are available.
- Python API/worker hosting has not been provisioned. Live browser-to-worker-to-provider-to-database verification remains incomplete.

## Current product limits
This is a tested first implementation increment, not a production-ready platform. The wallet UI deliberately reports unavailable when the private service is not configured. No live Helius key was retrieved or used. Current live normalization preserves token/quote quantities, but complete USD PnL is withheld until historical price/fee enrichment, transfer basis and token-account coverage are independently verified. Partial provider activity is never a trusted wallet leaderboard.

The source carries provider cursors and response hashes; cumulative resume into an existing analysis version is not exposed. Global wallet discovery, early-token ranking, Bubblemaps cluster integration, risk-evidence scoring and broader provider live contract checks are later increments. Existing market integrations are retained rather than reimplemented.

Private-preview access uses a session-only operator passphrase at the BFF, not a public multi-user account model. Provider keys remain server-only; no signing or trade-execution code exists in this increment. Full dependency/source license and provider redistribution review remains a release gate.

## Decisions and deferred work
- User's continuous-coding instruction authorizes native implementation without repeated planning approvals.
- Adapt the owner's accounting core in the target repository with provenance rather than editing the source project; future upstream sync requires deliberate patch review.
- Keep unknown values unavailable; do not substitute fixtures to make the live UI appear populated. Synthetic values above exist only in tests/SQL audit records.
- Direct driver integration and real-browser/deployment acceptance stay blocked; do not infer them from unit tests or a build.
- Existing lint warnings are deferred; the full lint command succeeds with zero errors.

## Local implementation commits
- `d9cb374 docs: record CTRL wallet architecture and continuous implementation plan`
- `0cee69a feat: reuse FIFO core with exact decimals and verified fee accounting`
- `0ad57ac style: normalize existing source with repository formatter`
- `73512a8 feat: add bounded Helius jobs and immutable Postgres analysis service`
- `ea50c15 feat: connect CTRL Simple and Terminal wallet evidence workspace`

Remote delivery is a checkpoint commit from the verified original branch head, using the final reviewed tree and an expected-head guard. It preserves all upstream files and does not expose earlier internal audit drafts in public commit history. The final response records the remote checkpoint SHA.

## Exact changed paths
- `.gitignore`
- `docs/CTRL_SOURCE_PROVENANCE.md`
- `docs/superpowers/plans/2026-10-16-ctrl-wallet.md`
- `docs/superpowers/specs/2026-10-16-ctrl-intelligence-design.md`
- `eslint.config.js`
- `package-lock.json`
- `package.json`
- `services/wallet/README.md`
- `services/wallet/ctrl_wallet/__init__.py`
- `services/wallet/ctrl_wallet/accounting.py`
- `services/wallet/ctrl_wallet/api.py`
- `services/wallet/ctrl_wallet/helius.py`
- `services/wallet/ctrl_wallet/models.py`
- `services/wallet/ctrl_wallet/reconstruct.py`
- `services/wallet/ctrl_wallet/store.py`
- `services/wallet/ctrl_wallet/truth.py`
- `services/wallet/ctrl_wallet/worker.py`
- `services/wallet/migrations/001_wallet_truth.sql`
- `services/wallet/pyproject.toml`
- `services/wallet/requirements.lock`
- `services/wallet/tests/conftest.py`
- `services/wallet/tests/test_accounting.py`
- `services/wallet/tests/test_api.py`
- `services/wallet/tests/test_helius.py`
- `services/wallet/tests/test_store.py`
- `services/wallet/tests/test_worker.py`
- `src/components/ai/AiChat.tsx`
- `src/components/ai/DailyBrief.tsx`
- `src/components/ai/TokenDeepDive.tsx`
- `src/components/ai/TokenDeepDiveDialog.tsx`
- `src/components/dashboard/DexScreenerEmbed.tsx`
- `src/components/dashboard/MarketBar.tsx`
- `src/components/dashboard/MarketPulse.tsx`
- `src/components/dashboard/MemeOfTheDayCard.tsx`
- `src/components/dashboard/NarrativeFeed.tsx`
- `src/components/dashboard/PumpfunLaunches.tsx`
- `src/components/dashboard/TrendingTable.tsx`
- `src/components/dashboard/embeds/TokenChartEmbed.tsx`
- `src/components/dashboard/embeds/TokenListEmbed.tsx`
- `src/components/layout/CommandPalette.tsx`
- `src/components/layout/CommandPaletteContext.tsx`
- `src/components/layout/MarketTape.tsx`
- `src/components/layout/MobileNavContext.tsx`
- `src/components/layout/OverflowGuard.tsx`
- `src/components/layout/SideNav.tsx`
- `src/components/pulse/AiSocialPulse.tsx`
- `src/components/pulse/NewsColumn.tsx`
- `src/components/pulse/PulseColumn.tsx`
- `src/components/pulse/SocialColumn.tsx`
- `src/components/pulse/TrendingColumn.tsx`
- `src/components/pulse/WhalePingsColumn.tsx`
- `src/components/pulse/timeAgo.ts`
- `src/components/settings/ProviderStatusCard.tsx`
- `src/components/terminal/Panel.tsx`
- `src/components/terminal/RiskBadge.tsx`
- `src/components/terminal/SourceBadge.tsx`
- `src/components/terminal/StatCell.tsx`
- `src/components/terminal/TokenAvatar.tsx`
- `src/components/token/HoldersTable.tsx`
- `src/components/token/RiskPanel.tsx`
- `src/components/token/TokenDetailProvider.tsx`
- `src/components/token/WhaleFeed.tsx`
- `src/components/trending/AiTrendingTable.tsx`
- `src/components/ui/ScotlandFlag.tsx`
- `src/components/wallet/WalletView.tsx`
- `src/components/watchlist/SentimentPanel.tsx`
- `src/components/watchlist/WatchlistView.tsx`
- `src/hooks/usePumpfunStream.ts`
- `src/integrations/supabase/auth-attacher.ts`
- `src/integrations/supabase/auth-middleware.ts`
- `src/integrations/supabase/client.server.ts`
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`
- `src/lib/ai/analyze-token.functions.ts`
- `src/lib/ai/analyze-token.server.ts`
- `src/lib/ai/curated.functions.ts`
- `src/lib/ai/curated.server.ts`
- `src/lib/ai/snapshot.server.ts`
- `src/lib/ai/social-pulse.functions.ts`
- `src/lib/ai/social-pulse.server.ts`
- `src/lib/ai/tools.server.ts`
- `src/lib/ai/watchlist-sentiment.functions.ts`
- `src/lib/ai/watchlist-sentiment.server.ts`
- `src/lib/data/adapters/live.ts`
- `src/lib/data/cache.server.ts`
- `src/lib/data/health.server.ts`
- `src/lib/data/index.ts`
- `src/lib/data/live.functions.ts`
- `src/lib/data/providers/birdeye.server.ts`
- `src/lib/data/providers/chart.server.ts`
- `src/lib/data/providers/coingecko.server.ts`
- `src/lib/data/providers/dexscreener.server.ts`
- `src/lib/data/providers/dexsearch.server.ts`
- `src/lib/data/providers/firecrawl.server.ts`
- `src/lib/data/providers/fxtwitter.server.ts`
- `src/lib/data/providers/gateway.server.ts`
- `src/lib/data/providers/macro.server.ts`
- `src/lib/data/providers/narrative.server.ts`
- `src/lib/data/providers/newsfeed.server.ts`
- `src/lib/data/providers/solana-tracker.server.ts`
- `src/lib/data/providers/xfeed.server.ts`
- `src/lib/data/providers/xlist.server.ts`
- `src/lib/format.ts`
- `src/lib/pumpfun/seed.server.ts`
- `src/lib/token-bonded.ts`
- `src/lib/wallet/client.server.ts`
- `src/lib/wallet/contracts.ts`
- `src/lib/wallet/preferences.ts`
- `src/lib/wallet/wallet.functions.ts`
- `src/lib/watchlist-store.ts`
- `src/mocks/chart.ts`
- `src/mocks/narratives.ts`
- `src/mocks/providers.ts`
- `src/mocks/trending-tokens.ts`
- `src/mocks/wallet-pnl.ts`
- `src/routeTree.gen.ts`
- `src/routes/README.md`
- `src/routes/__root.tsx`
- `src/routes/ai.tsx`
- `src/routes/api/chat.ts`
- `src/routes/api/pumpfun/latest.ts`
- `src/routes/coins.tsx`
- `src/routes/dashboard.tsx`
- `src/routes/index.tsx`
- `src/routes/launches.tsx`
- `src/routes/meme-of-the-day.tsx`
- `src/routes/narratives.tsx`
- `src/routes/pulse.tsx`
- `src/routes/settings.tsx`
- `src/routes/trending.tsx`
- `src/routes/wallet-pnl.tsx`
- `src/routes/watchlist.tsx`
- `src/styles.css`
- `src/types/index.ts`
- `tests/birdeye.test.ts`
- `tests/wallet-client.test.ts`
- `tests/wallet-contracts.test.ts`
- `tests/wallet-view.test.tsx`
- `vitest.config.ts`
- `docs/CTRL_VERIFICATION.md` (this report)

Most existing UI paths are formatting-only; the dedicated style commit isolates that change. Functional changes are concentrated in the wallet service, wallet UI/contracts, legacy wallet removal, TanStack API compatibility and CTRL shell branding.

## Next independently verifiable work
1. Configure authorized Helius and historical-price sources in a private worker environment.
2. Verify direct psycopg connectivity, lease/crash recovery and immutable reads against the isolated database.
3. Deploy Python API/worker and a protected web preview when Vercel project creation is permitted.
4. Run real-browser desktop/mobile and full live evidence verification.
5. Add coverage-qualified wallet candidate discovery and early-token evidence ranking in subsequent accepted slices; seek approval before any production deployment.
