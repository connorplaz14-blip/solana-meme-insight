# Fix Launches page errors

Two real bugs in `/launches`, both shown by the runtime signals:

## 1. Loader self-fetches a relative URL during SSR (the actual crash)

`src/routes/launches.tsx` uses a query whose `queryFn` does `fetch("/api/pumpfun/latest")`. The route's `loader` runs on the server during SSR, where relative-URL `fetch` is not supported in the Worker runtime — it throws, h3 swallows it, and the page renders the route error boundary ("spitting errors").

**Fix:** stop self-fetching. Extract the existing `fetchPumpfunSeed()` logic out of `src/routes/api/pumpfun/latest.ts` into `src/lib/pumpfun/seed.server.ts` (a server-only module). Both the API route and the loader's `queryFn` call it directly server-side. Client refetches still hit `/api/pumpfun/latest` because the queryFn branches: server context → call `fetchPumpfunSeed()` directly, browser → use the existing relative `fetch`. Simplest split:

- `queryFn` checks `typeof window === 'undefined'` and dynamic-imports `seed.server.ts` on server; otherwise `fetch("/api/pumpfun/latest")`.
- API route now imports the same helper instead of defining it inline.

## 2. Hydration mismatch on time-derived text

The reported hydration error already fires on `/pulse` (`new Date().toLocaleTimeString()` in the header), and the same class of bug exists in `/launches` via `useAge(createdAt)` — initial render computes `Date.now() - createdAt` which differs server vs client.

**Fixes:**
- `src/routes/pulse.tsx`: render the clock only after mount. Gate the `toLocaleTimeString()` text behind a `useEffect` + `useState` initialized to `""` (or wrap in `<span suppressHydrationWarning>`).
- `src/routes/launches.tsx` → `useAge`: return `""` until the first effect tick fires, then start ticking. Avoids first-paint mismatch.

## Files
- new  `src/lib/pumpfun/seed.server.ts` — exports `fetchPumpfunSeed()` + `Launch` type
- edit `src/routes/api/pumpfun/latest.ts` — import shared helper
- edit `src/routes/launches.tsx` — loader uses shared helper on server, fix `useAge` mount-gate
- edit `src/routes/pulse.tsx` — gate clock behind `useEffect`

No UI changes beyond the hydration gating.
