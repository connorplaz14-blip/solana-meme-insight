# CTRL Wallet Truth Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline. The user approved the architecture and requested continuous coding on 16 October 2026; proceed through verified increments without further planning handoffs.

**Goal:** Deliver the first wallet/token FIFO analysis flow with honest unavailable states, evidence and shared Simple/Terminal results.

**Architecture:** Retain TanStack Start as the BFF/UI. Reuse the Python Evobacktester FIFO core, correcting characterized defects, behind a bounded Helius ingestion service with immutable Postgres analysis versions. Missing infrastructure disables live analysis honestly.

**Tech Stack:** React 19, TypeScript, TanStack Start, Python 3.12, FastAPI, HTTPX, psycopg 3, Postgres, pytest, Vitest, Testing Library.

**Spec:** ../specs/2026-10-16-ctrl-intelligence-design.md (accepted by user's subsequent instruction to continue coding).

## Global Constraints
- No real trades, signing, token creation, production deployment, secrets in source/logs or history rewrites.
- Work only on codex/ctrl-intelligence-wallet-audit-20261016, starting at 32e3d10760c902b80f1a43e5f087c495dce165b6.
- One wallet and token per analysis. Maximum 2,000 provider transaction records per ingestion, explicit partial coverage.
- Decimal strings for accounting; missing fees/prices/basis mean unknown, never invented zero.
- Provider source times and hashes survive persistence and UI rendering.
- Preview and real database/provider verification are separate gates; report unavailable capabilities instead of claiming success.

## Review Focus
1. Unknown basis and transfers must never create a profitable closed lot: accounting tests.
2. Conflicting duplicates and multi-wallet inputs must fail closed: accounting and ingestion tests.
3. Rate limits, malformed responses and repeated cursors must stop safely without key-bearing errors: provider tests.
4. Unauthorized API clients and cross-request races must not expose or relabel results: API and UI tests.
5. Restart/retry and partial persistence must not overwrite a completed analysis: real Postgres integration tests when available.

### Task 1: Characterized FIFO accounting
**Files:** services/wallet/ctrl_wallet/{models,truth,reconstruct,accounting}.py; services/wallet/tests/test_accounting.py; services/wallet/pyproject.toml; docs/CTRL_SOURCE_PROVENANCE.md.
**Interfaces:** analyze_events(events: list[NormalizedEvent]) -> dict; decimal-string lot matches, gross/net/fee totals, warnings and remaining inventory. Reject multiple wallets/mints and conflicting duplicates. Preserve upstream core provenance.
- [ ] Write tests for fees $1+$2=$3 and net $7; unknown fees yield null net; multiple lots/partial exits; duplicate idempotency; oversell/unknown basis; slot order and malformed/non-finite amounts.
- [ ] Run pytest and observe actual failures in imported upstream behavior before modifying it.
- [ ] Adapt the three upstream modules with relative imports. Fix entry-fee double counting and unknown-fee net behavior. Add a strict single-wallet/single-mint facade and explicit coverage warnings.
- [ ] Run full Python suite and ruff. Commit the independently usable accounting increment.

### Task 2: Bounded Helius ingestion and persistence
**Files:** services/wallet/ctrl_wallet/{helius,store,api}.py; services/wallet/migrations/001_wallet_truth.sql; services/wallet/tests/test_{helius,store,api}.py; services/wallet/README.md.
**Interfaces:** HeliusHistory.collect(wallet, cursor=None, budget=2000) -> HistoryBatch; normalize selected parsed swaps to NormalizedEvent; AnalysisStore.put/get immutable versioned JSON; create_app(store, provider, access_token) -> FastAPI. Authenticate all API operations using a server-only service token, enforce provider record budget and concurrency bound.
- [ ] Write red tests using HTTPX mock transport only at the external provider boundary: pagination, repeated cursor, duplicate page, record budget, 429/403, malformed schema and secret-safe messages.
- [ ] Implement validated read-only Helius history, source hashing and conservative swap normalization. Missing historical USD prices/fees remain null; coverage incomplete for unverified token-account history and unsupported transactions. Preserve resume cursor without dropping records.
- [ ] Write API/storage tests: missing/wrong auth, invalid keys, durable read after reopening store, retry idempotency, conflict rejection and version retrieval.
- [ ] Implement Postgres durable store and authenticated API. Use isolated temporary SQLite only for offline tests/replay; no production SQLite fallback. Verify Postgres integration if a real local instance can be provisioned without touching user systems.
- [ ] Run full Python suite and lint, compile modules, commit service increment.

### Task 3: Honest wallet BFF and CTRL UI
**Files:** src/lib/wallet/{contracts,client.server,wallet.functions,preferences}.ts; src/components/wallet/WalletView.tsx; src/routes/wallet-pnl.tsx; src/lib/data/live.functions.ts; src/lib/data/providers/birdeye.server.ts; src/components/layout/SideNav.tsx; src/routes/__root.tsx; src/styles.css; tests/wallet*.test.{ts,tsx}; vitest.config.ts; package.json.
**Interfaces:** WalletAnalysisResult discriminated available/unavailable/error contract; server-only service proxy never forwards credentials or provider errors; WalletView consumes the same immutable result in both modes. Legacy wallet lookup fails explicitly rather than returning samples.
- [ ] Add red tests for base58-decoded key validation; absent service config; sanitized failures; result validation and mismatched wallet/mint; persisted/reset preferences; form validation and UI race isolation.
- [ ] Implement validated bounded BFF with timeouts. Remove reachable wallet mock fallback and misleading cost inference from the wallet flow. Correct case-sensitive mint matching.
- [ ] Implement labelled wallet/token form, honest setup/error state, coverage, lot table and evidence links. Add Simple/Terminal mode, panel toggles, density and local preference persistence/reset. Preserve context while changing mode; clear results on new requests and ignore stale responses.
- [ ] Apply CTRL branding to wallet page and global shell, preserve existing working provider features. Do not redesign unrelated pages.
- [ ] Run full Vitest suite, lint, tsc and build; record pre-existing errors separately; commit UI increment.

### Task 4: Review and delivery
**Files:** docs/CTRL_VERIFICATION.md; .github/workflows/ctrl-quality.yml if verified CI setup is viable; optional deployment config only after inspecting actual adapter support.
- [ ] Run all relevant suites, lint, typecheck, builds and immutable database replay verification from the final tree.
- [ ] Review whole branch with a fresh reviewer using requesting-code-review; fix material findings via red-green tests.
- [ ] Inspect diff and scan added content for accidental credentials without printing values; push only feature branch with expected-head guard.
- [ ] Deploy preview only where infrastructure and authentication are available; otherwise publish exact blockers and tested local start instructions. Never promote production.
- [ ] Record exact changed paths, remote commit SHAs, test counts, deployed URLs and remaining acceptance gaps in verification report.

## Execution rulings
- The user explicitly requested continuous coding; this overrides repeated plan-approval handoffs. Native implementation loop, with one fresh final review.
- Source snapshots and synthetic fixtures establish algorithm behavior only. They never substitute for live provider evidence.
- Missing provider credentials do not block implementation/tests; they block the live acceptance gate and must leave the UI unavailable.
