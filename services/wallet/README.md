# CTRL wallet service

Private Python service + durable Postgres worker. The app never signs or submits transactions.

## Run

1. Create a virtual environment; `pip install -e "services/wallet[dev]"`.
2. Set `CTRL_DATABASE_URL` to a dedicated development Postgres database; `CTRL_SERVICE_TOKEN` to a random 32+ character value; `HELIUS_API_KEY` in the worker environment only. Never copy tracked environment files.
3. From `services/wallet`, initialize schema: `python -c "import os; from ctrl_wallet.store import AnalysisStore; AnalysisStore(os.environ['CTRL_DATABASE_URL']).initialize()"`.
4. Run private API: `uvicorn ctrl_wallet.api:configured_app --factory --host 127.0.0.1 --port 8010`.
5. Run worker separately: `python -m ctrl_wallet.worker`. Queue leases survive restarts and exclude concurrent claims.
6. Web app server environment: `CTRL_WALLET_SERVICE_URL`, `CTRL_WALLET_SERVICE_TOKEN` and `CTRL_WALLET_ACCESS_TOKEN`. The last is a temporary private-preview operator passphrase, not a public multi-user login.

## Tests

From `services/wallet`: `pytest -q`; `ruff check .`. For real Postgres tests set `CTRL_TEST_DATABASE_URL` to a disposable isolated test database. Every database test creates and removes its own random `ctrl_test_*` schema. Use only a disposable database whose role can create schemas. Tests never truncate shared tables. Set `CTRL_REQUIRE_POSTGRES=1` to make missing database configuration a hard failure instead of a skip. The CTRL quality GitHub Actions workflow uses a dedicated Postgres 17 service with mandatory integration tests, without provider or deployment credentials.

## Current truth limits

Ingestion requests finalized Helius history including token accounts and caps every run at 2,000 transaction records. It stores credential-free page hashes, observation/fetch timestamps, exact token/quote quantities, supported normalized events, FIFO lots and matches. Native SOL swap legs and SPL token legs retain exact quantities and their distinct representations. Native and wrapped SOL legs appearing together are treated as ambiguous rather than summed or double counted. Unsupported routes/transfers remain visible warnings. It does not infer USD prices from a stablecoin peg, current prices, or 24-hour price change. Historical USD price enrichment and independently verified token-account history remain necessary before live complete-wallet USD PnL/rankings can be displayed. The UI shows partial/unavailable states until then.

Analyses are immutable versions. Refresh produces another job. Provider cursor is retained as evidence; automatic cumulative resume of a previous analysis is not yet exposed. API is service-token protected; no public unauthenticated endpoints or automatic paid-tier upgrades. Deploy the worker on an explicit long-running Python host; do not launch it inside a serverless web request.
