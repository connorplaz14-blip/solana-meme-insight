# Research References

Distilled from the uploaded `MemeDesk_Lovable_Plan_No_Code.md` brief.

## Lovable build lessons
- Plan before prompting; prompt by component; design with real-looking data.
- Keep API keys out of frontend; use Supabase + Edge Functions for secrets.
- Build in phases; tell the agent what NOT to touch.
- Docs:
  - https://docs.lovable.dev/prompting/prompting-one
  - https://docs.lovable.dev/tips-tricks/best-practice
  - https://docs.lovable.dev/integrations/ai
  - https://docs.lovable.dev/integrations/supabase

## Architecture principle
API-first beats scraper-first. Pump.fun, GMGN, DexScreener web pages
change markup, block bots, or rate-limit aggressively. Prefer official
or semi-official APIs, cache to Supabase, summarise with Gemini.
Only fall back to scraping as a **backend** job in later phases.

## AI rules
- Gemini / Lovable AI must **only** summarise structured data returned
  by backend / Edge Functions.
- AI never invents token metrics (price, mcap, liquidity, etc.).
- Frontend never calls AI providers directly.

## Provider notes
- **DexScreener** — best free-tier source for Solana DEX trending,
  liquidity, and pair data.
- **CoinGecko** — best for SOL market price + global market data.
- **Bitquery / Solana Tracker** — Pump.fun launch + trade feeds.
- **Birdeye / Vybe / Solana Tracker** — wallet portfolio + P&L.
- **Browserbase / browser-use / Oxylabs / Apify** — backend scraping
  fallback only.
- **X (Twitter) API** — CT narrative scanning (paid tier required).

## Out of scope
Token creation, auto-buying, auto-selling, sniping, wallet drainers,
private-key handling, transaction signing.
