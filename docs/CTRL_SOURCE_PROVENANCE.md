# Source provenance

The Python FIFO engine in services/wallet/ctrl_wallet/{models,truth,reconstruct}.py is adapted from the owner's connorplaz14-blip/Evobacktester, commit ca31b5f9179a19b5e0a86af55b7d8f200b656c11, phase 0/{models,truth,reconstruct}.py.

Initial adaptation changes imports to package-relative imports. Subsequent accounting corrections are pinned by red-first regression tests. Provider access is implemented against documented Helius contracts; it does not copy a trading/signing client. No environment files or exported wallet data are imported.

No LICENSE was present in the upstream tree. Owner-directed internal reuse does not grant third-party redistribution rights. This file records provenance and does not assign a new license. Dependency licenses and provider display/retention terms remain release checks.
