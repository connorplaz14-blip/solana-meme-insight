# CTRL Intelligence — accepted first-slice architecture

Accepted for continuous implementation on 16 October 2026. The full repository audit is retained separately; this branch document contains the product design.

## Architecture options
**Recommended: retain MemeDesk, add a bounded Python accounting worker and a dedicated Postgres truth store.** Existing TanStack server functions remain the browser's backend boundary. The accounting module stays in Python, adapting Evobacktester's verified portions. A worker performs bounded ingestion/reconstruction off the request path; a read API returns immutable analysis versions. This reuses existing strengths while adding one explicit service/worker boundary.

Alternative: TypeScript-only application and worker. Easier single-runtime operation, but requires porting the FIFO engine and proving equivalence before live results; more accounting implementation risk.

Alternative: consolidate all repositories or rebuild from scratch. Rejected: incompatible app/data models, overlapping features, simulation/mock pathways and unrelated Telegram/arcade functionality would increase scope without improving first-slice truth.

### Components and data flow
1. **CTRL web**: existing TanStack Start application; Simple/Terminal modes render a shared WalletAnalysis contract. No provider credentials in browser bundles.
2. **BFF**: validates a Solana public key by base58 decoding to 32 bytes, limits workload, authenticates costly refresh operations and creates idempotent analysis jobs. Public read access is disabled until an explicit product-access decision.
3. **Ingestion worker**: pulls canonical history and parsed events through Helius, checks pagination/account coverage, stores source payload hashes and normalized events, then runs deterministic reconstruction. It has no signing or transaction-submission capability.
4. **Truth store**: a dedicated CTRL Postgres database/schema for jobs, cursors, provider payload records, events, lots, matches, snapshots and analysis versions. Development/preview use an isolated database or branch. Existing app databases are not implicitly reused.
5. **Read model**: same versioned results for UI, exports and explanation. Decimal quantities/currency serialize as decimal strings, never binary floating-point money.
6. **Market/risk providers**: independent enrichments cannot overwrite acquired cost basis. Their own observation times, confidence and source IDs travel to UI.

Retain existing Supabase-based provider cache behind an interface until a reviewed migration is justified. It cannot be treated as the accounting ledger. Do not silently rewire the existing project to a new database.

Worker deployment and managed Postgres selection must be confirmed by capability checks during planning. SQLite remains an offline test/replay option, not durable serverless production storage. No queue product or paid service is provisioned by this spec.

### Provenance contract
Every metric carries value or null, unit/currency, status (measured/derived/partial/unavailable), source IDs, formula/method version, observedAt, fetchedAt and computedAt. Coverage includes requested and observed ranges, cursor exhaustion, account/token-account coverage, parser support, opening inventory, fees and historical pricing completeness.

A source record carries provider, credential-free request identity, response hash, fetch timestamp, chain slot where supplied, parser version and source transaction signature. Store raw payloads only within provider retention rights and access boundaries. Explorer links use transaction signatures; API-key URLs never become citations.

Stale fallback retains the original observation time. A provider error cannot create zero holdings, a safe risk score or demo data. Explicit demo fixtures, if ever shipped, live behind a separate labelled demo mode and never a real wallet lookup.

### Accounting rules
- FIFO inventory is isolated by chain, wallet and mint; identity includes signature and event/instruction ordinal. Replays deduplicate before matching.
- Canonical order uses slot and transaction/instruction position; unknown order reduces confidence rather than inventing chain order from signature text.
- Scale-ins/outs match original acquired lots. Gross proceeds, acquired cost, realized gross PnL and allocated fees are separately auditable.
- Fee totals allocate each real fee once, including known network/priority/platform fees. Rent deposits/refunds are separate balance flows. Fee payer matters.
- Unknown fees mean unknown net PnL; known gross/fee subtotals may be shown explicitly. Missing USD prices remain null, even when SOL or stable-quote amounts are known.
- SOL/WSOL wrap/unwrap and internal transfers are not profitable trades. Incoming transfers have unknown basis unless accompanied by verified source lots; outgoing transfers remove inventory without sales revenue.
- Airdrops, Token-2022 transfer fees and unsupported programs are classified or marked unsupported. They cannot silently enter trusted wallet rankings.
- Window-limited ingestion requires opening inventory/earlier lot history. An analysis of 30 days is never labelled lifetime. Budget exhaustion or missing token-account history makes coverage partial.
- Current Jupiter/DexScreener prices value open positions only. They never replace historical acquisition prices or prove executable liquidation value.
- Oversells, reconciliation mismatches, unpriced events and unknown basis are visible evidence. Partial known-lot profit may be shown as a subtotal; complete-wallet totals and trusted ranks are withheld.

### Provider reuse map
| Provider | Purpose | Boundary |
| --- | --- | --- |
| Helius | Canonical history, transaction metadata, parsed events, holdings/metadata as appropriate | Validate current APIs and pagination. Do not confuse Enhanced beforeSignature paging with getTransactionsForAddress paginationToken. Include token-account coverage. Reuse Finaltgbacktester credit/cursor patterns after tests. |
| Solana Tracker | Early-token candidates, traders/wallet candidates, holder and risk evidence | Prefer official SDK/current API contracts over recreating indexers. Vendor PnL remains labelled comparison data; it is not silently declared CTRL FIFO. Candidates are not verified profitable wallets. |
| DexScreener | Pair discovery, liquidity, volume and current market snapshots | Reuse current adapter after validation. Paid profiles/boosts are advertising evidence, not an organic early-discovery ranking. No historical-price invention. |
| Jupiter | Current price/metadata enrichment | Read-only Price API. No swap execution or signing integration. No price is a valid response. |
| Bubblemaps | Holder/transfer/cluster evidence | Optional authorized API or permitted embed; preserve source timestamp. A transfer connection is not proof of common ownership. No scrape-built clone if access is unavailable. |
| Birdeye / other historical-price source | Explicit fallback for historical observations and independent checks | Requires verified entitlement and timestamp tolerance; never turn a 24-hour change into cost basis. |
| Social sources | Later contextual evidence | Retain source links and observation time. Keep social claims separate from on-chain facts; private content requires existing access/consent boundaries. |

Official sources checked during audit:
- https://www.helius.dev/docs/api-reference/rpc/http/gettransactionsforaddress
- https://www.helius.dev/docs/api-reference/enhanced-transactions/gettransactionsbyaddress
- https://github.com/solanatracker/data-api-sdk
- https://docs.dexscreener.com/api/reference
- https://developers.jup.ag/docs/price
- https://github.com/bubblemaps/api-docs/blob/main/openapi.json
- https://bubblemaps.io/work-with-us/

These verify the general provider roles; they do not verify the user's keys, entitlements, contractual rights or live provider responses.

### CTRL UI
Simple is the default: a prominent wallet search, coverage/freshness, portfolio value where supported, known realized gross/net results, open positions, and a readable “Why this result?” evidence drawer. Show unavailable values in plain language. Avoid faux wallet scores, decorative charts and unearned precision.

Terminal uses the same result version with selectable panels/columns, sorting, density, filters and saved local layout preferences. First slice supports panel visibility, compact/comfortable density and reset; drag/resizing and server-synced layouts follow later if needed. Switching mode must preserve wallet and analysis context.

Brand direction: CTRL / TAKE CTRL; neutral near-black/charcoal surfaces, off-white text, restrained semantic green/amber/red, clear hierarchy and tabular numerals for financial data. Avoid the previous plain dark-blue treatment. Mobile keyboard/touch controls, focus states and non-colour status labels are required. No empty “coming soon” feature navigation masquerading as functionality.

## First independently testable vertical slice: one wallet, one token, auditable FIFO
User enters a wallet and token mint, requests a bounded analysis, sees its status, then inspects completed lots and exact supporting transactions in either UI mode. Default analysis window is 30 days, with earlier acquisition history sought within a strict budget; missing opening inventory remains unknown. Ingestion ceiling: 2,000 transaction records per run, tracked across all requests; do not assume provider page sizes. When budget is reached, stop and publish partial coverage with resumable cursor state. No automatic paid tier upgrade.

This deliberately excludes global leaderboards, market-wide scanning, Telegram notifications, arbitrary token-to-token accounting, multi-wallet identity clustering and AI scoring. It supplies the accounting/provenance foundation discovery will consume.

### Acceptance criteria
1. Malformed keys fail validation before a provider request. Base58 identities remain case-sensitive.
2. Missing credentials/403/429/schema errors render configured/unavailable/rate-limited status with sanitized explanations; no sample wallet and no zeros standing in for missing facts.
3. Pagination deduplication and resume are deterministic. Duplicate pages, retries and interrupted workers cannot double-count fills or fees. Repeated cursors stop with a visible coverage failure.
4. Exact fixture: buy 10 units for $10 plus $1 fee, then sell 10 for $20 plus $2 fee => gross PnL $10, total fees $3, net PnL $7, remaining quantity 0. Every value links to lots/events.
5. Multiple lots, partial exits, same-second ordering, missing prices, unknown fees/basis, transfers, failed transactions, WSOL flows and unsupported Token-2022 behavior have red-first tests. Unknown net totals remain null.
6. A persisted analysis survives worker and web restarts. Reading by version returns identical accounting results; recomputation stores a new version instead of rewriting prior evidence. Verify against a real isolated Postgres instance, not an in-memory replacement.
7. The live smoke test ingests a public wallet from an authorized provider, records source hashes/cursors and validates at least one known transaction against canonical evidence. If provider access is absent, report live verification blocked; offline fixtures cannot pass this criterion.
8. Simple and Terminal show identical values and original observation time. Out-of-order UI responses cannot display one wallet's analysis under another address. Saved layout preferences survive reload and can reset.
9. Refresh/job creation is authenticated and rate/budget limited; job reads enforce the approved access model. Query and credential-bearing error strings never reach UI/log artifacts.
10. Full relevant suites, lint, typecheck and builds pass from clean locked dependencies. Preview is then deployed and tested end-to-end through browser, job, provider and database. Record commit SHA, checks, preview URL and precise blocked criteria. Production requires separate user approval.

### Increment sequence after approval
1. Characterize and repair FIFO fee/unknown-value rules with regression tests, retaining known-working accounting patterns.
2. Add provider-neutral evidence/coverage contracts and bounded Helius ingestion with retry, deduplication and cursor-resume tests.
3. Persist jobs and immutable accounting versions in isolated Postgres; verify restart/idempotency.
4. Replace the wallet mock/approximation pathway and add the two CTRL presentation modes on the shared contract.
5. Run all quality gates, secret-safe checks and live evidence verification, then deploy a preview and verify it independently.

Implementation tasks and verification gates are in ../plans/2026-10-16-ctrl-wallet.md.

### Later increments
- Wallet discovery: ingest token-trader candidates; calculate independent, coverage-qualified FIFO metrics; filter bots/system accounts with evidence; publish explainable candidate reasons and dataset selection limitations.
- Early discovery: time-versioned token/pool candidates, observed first-seen vs chain creation, liquidity and holder-change evidence, source-separated paid boosts, watchlist triggers.
- Explainable signals: deterministic versioned rules with input snapshots, thresholds, observation times and invalidation; distinguish observation from inference. Backtests use point-in-time data without future leakage.
- Optional AI summaries only verbalize existing structured evidence and cite it. They cannot invent metrics or risk certainty.
- Bubblemaps/other enrichment, notifications, broader token programs and configurable workspace expansion follow their own accepted slices.

