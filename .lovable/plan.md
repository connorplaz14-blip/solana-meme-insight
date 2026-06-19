# Mobile-friendly Pump.fun widget

## Findings (research summary)

Almost every "good" PF UI (pump.fun itself, GMGN, Photon, BullX, Axiom, Birdeye lists, DexTools) sets `X-Frame-Options: SAMEORIGIN` / CSP `frame-ancestors 'self'` and **cannot be iframed at all**. Only two real candidates work as list embeds:

| Provider | Embed URL | Mobile | Notes |
|---|---|---|---|
| **GeckoTerminal** | `geckoterminal.com/solana/pump-fun/pools?embed=1` | **3/5** | Dark by default, no ads, has Trending + New Pools + Top Gainers + bonding-curve % column. Better column density. Embed not officially documented (small risk of future blocking). |
| **DexScreener** (current) | `dexscreener.com/solana/pumpfun?embed=1&theme=dark` | 2/5 | Officially supported. 10+ columns force horizontal scroll on phones, ad banner at top. |

Single-token chart embeds (GMGN kline, GeckoTerminal pool, Birdeye TV widget) are not affected — that part of the dashboard stays as-is.

## Plan

1. **`PumpfunLaunches.tsx`** — switch the default embed to **GeckoTerminal** (`https://www.geckoterminal.com/solana/pump-fun/pools?embed=1`), which renders meaningfully better on a 360–414px viewport and has no in-embed ad. Keep DexScreener available behind a small segmented toggle (`Gecko | DexScreener`) in the panel header so we don't lose the officially-blessed option if Gecko ever blocks framing. Persist the choice in `localStorage` (`pf-launches-provider`).

2. **Mobile scroll wrapper** — wrap the iframe in `overflow-x:auto` with `min-width:640px` on the iframe so the table degrades to a horizontal swipe instead of unreadable truncation. Applies to both providers.

3. **`/trending` route (`trending.tsx`)** — same treatment for the main trending tile: default to GeckoTerminal `solana/pools?embed=1`, with a DexScreener toggle. Keep the 24h Gainers DexScreener tile as-is (Gecko doesn't have a clean gainers-only URL).

4. **`DexScreenerEmbed.tsx`** — rename conceptually but keep the file; generalise to accept any `src` (already does) and add an optional `providerToggle` prop `{ value, onChange, options: [{id,label,src}] }` rendered in the panel header. No behaviour change for callers that don't pass it.

5. **`mocks/providers.ts`** — add a `geckoterminal-pumpfun` entry (live, no key) alongside the existing `dexscreener-pumpfun`.

## Out of scope

- TokenDetailProvider chart tabs (DexScreener + GMGN kline) — unchanged.
- Wallet, narrative feed, market pulse, meme-of-the-day, watchlist — unchanged.
- No new server functions; everything is a public iframe.

## Files

- Edit `src/components/dashboard/PumpfunLaunches.tsx`
- Edit `src/components/dashboard/DexScreenerEmbed.tsx` (add optional provider toggle + mobile scroll wrapper)
- Edit `src/routes/trending.tsx`
- Edit `src/mocks/providers.ts`
