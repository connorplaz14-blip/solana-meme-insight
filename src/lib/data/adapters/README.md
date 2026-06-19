# Data Adapters

Phase 1 ships `mockAdapter`. To plug in a real provider:

1. Create `src/lib/data/adapters/<provider>.ts` matching `DataAdapter`.
2. The body should call a Supabase Edge Function — never call the
   third-party API from the browser, never embed API keys in client code.
3. Swap the import in `src/lib/data/index.ts` (or build a composite
   adapter routing each method to the best provider).
4. Components do not change — they only consume the hooks.
