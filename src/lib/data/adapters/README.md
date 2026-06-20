# Data Adapters

Production ships `liveAdapter` (see `live.ts`). All data flows through
typed `createServerFn` handlers in `src/lib/data/live.functions.ts`, which
call providers under `src/lib/data/providers/`.

`mockAdapter` is kept for local dev / offline work. It is NOT wired into
`src/lib/data/index.ts`.

When a provider is unconfigured, the server fn returns a typed
"notice" / "missing-key" payload so the UI renders a real
"needs configuration" state instead of silently going empty.
