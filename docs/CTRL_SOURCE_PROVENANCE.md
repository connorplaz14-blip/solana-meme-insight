# Source provenance

The Python FIFO engine in services/wallet/ctrl_wallet/{models,truth,reconstruct}.py is adapted from the owner's connorplaz14-blip/Evobacktester, commit ca31b5f9179a19b5e0a86af55b7d8f200b656c11, phase 0/{models,truth,reconstruct}.py.

Initial adaptation changes imports to package-relative imports. Subsequent accounting corrections are pinned by red-first regression tests. Provider access is implemented against documented Helius contracts; it does not copy a trading/signing client. No environment files or exported wallet data are imported.

No LICENSE was present in the upstream tree. Owner-directed internal reuse does not grant third-party redistribution rights. This file records provenance and does not assign a new license. Dependency licenses and provider display/retention terms remain release checks.

## Helius native SOL normalization

Native SOL swap support follows the owner’s upstream `phase 0/providers.py` native movement behavior (same pinned commit above), adapted to the strict CTRL parser rather than importing its broader transfer fallback. Contract checked against Helius’s published [`SwapEvent` and `NativeBalanceChange` types at SDK v1.5.2](https://github.com/helius-labs/helius-sdk/blob/v1.5.2/src/types/types.ts). Native amounts are integer lamports, ownership must match the analyzed wallet, and input/output representation is persisted in event provenance. `ctrl-helius-v2` identifies the new parser behavior. Regression transactions are explicitly synthetic; this increment does not claim a live native swap or historical USD pricing verification.

Helius currently labels [Enhanced Transactions](https://www.helius.dev/docs/enhanced-transactions/overview) a legacy maintenance-mode integration. Retain the tested adapter for existing integration compatibility; evaluate the recommended history/Parsed Events products behind the same analysis contract in a separate verified increment. Do not silently switch provider products, price assumptions or credit usage.
