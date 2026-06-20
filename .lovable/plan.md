# Restore the two embedded feeds on /coins

## Problem
Last turn I swapped the `/coins` page from the two `TokenListEmbed` iframes (GMGN → GeckoTerminal fallback) to native `TrendingTable` + `PumpfunLaunches`. That caps the view to ~12 tokens from our own trending feed instead of the full live lists you wanted.

## Fix
Put the embeds back as the primary view, and keep the native tables as a secondary fallback panel below — so even if both GMGN and GeckoTerminal refuse to frame, you still see real data.

### `src/routes/coins.tsx`
- Render two `TokenListEmbed` panels side-by-side on desktop, stacked on mobile:
  - `<TokenListEmbed kind="trending" height="82vh" />`
  - `<TokenListEmbed kind="new-pairs" height="82vh" />`
- Layout: `grid grid-cols-1 xl:grid-cols-2 gap-3`.
- Below the embeds, keep a collapsed "Native fallback" section containing `<TrendingTable />` and `<PumpfunLaunches />` so the page is still useful if both providers block iframing.

### `src/components/dashboard/embeds/TokenListEmbed.tsx`
- Verify the GMGN→GeckoTerminal fallback timer still works (already 4s).
- Make sure the iframe gets full height on the route (currently clamped to `70svh` for mobile — keep that clamp; on desktop the `82vh` request will win).

## No other changes
- Don't touch data providers, native tables, or the dashboard route.
- Don't reintroduce mock data.

## Verification
- Open `/coins` at desktop width: two tall embeds visible, scrollable internally, each showing the full GMGN list (or GeckoTerminal if blocked).
- Open `/coins` at 430px (current preview): embeds stack, each horizontally scrollable, native fallback still reachable below.
