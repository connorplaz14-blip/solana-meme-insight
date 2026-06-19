# Cockpit Revamp — Tactical Mono, Bloomberg Density

Pure black canvas, sharp white text, phosphor-green / red as the only chromatic accents, mono headings everywhere, 1px borders, ultra-dense panels. Full sweep across every page — no business logic, no data sources change.

## Visual system

**Color tokens** (rewrite `src/styles.css` `.dark` block, force dark as the only theme):
- `--background` `#000000` (pure black, not navy)
- `--panel` `#0a0a0a`, `--panel-2` `#101010` (slightly lifted strata)
- `--foreground` `#ffffff` (sharp), `--muted-foreground` `#8a8a8a`
- `--border` `#1f1f1f` (1px hairlines)
- `--pos` `#00ff88`, `--neg` `#ff3344`, `--warn` `#ffcc00`, `--info` `#ffffff`
- `--accent` = `--pos` (phosphor green for active states, focus rings, key indicators)
- Remove all blue/purple/oklch chart defaults; recolor chart-1..5 to green/red/white/amber/grey

**Typography** (loaded via `<link>` in `__root.tsx` head):
- Headings + numbers + tickers: **JetBrains Mono** (400/500/700)
- Body + descriptions: **Work Sans** (400/500)
- All prices, %, addresses, timestamps → mono, tabular-nums
- Uppercase tracking-wide on panel headers, 10–11px

**Density rules**:
- Base font 12px on panels, 11px on table rows, 10px on labels
- Row height 24–28px in tables (was 36–48)
- Panel padding 8px (was 12–16)
- 1px borders only — no shadows, no rounded > 2px (rounded-none on panels)
- Hover = 1px green left border + bg lift to `#0f0f0f`

## Files touched

**Token + chrome (the multiplier — every page inherits):**
- `src/styles.css` — rewrite color tokens, font tokens, force `.dark` on `<html>`, kill light mode, add `--pos/--neg/--warn` semantic colors, retune chart palette, add `.tabular-nums` defaults
- `src/routes/__root.tsx` — JetBrains Mono + Work Sans `<link>` preconnect/stylesheet, force dark class
- `src/components/terminal/Panel.tsx` — `rounded-none`, 1px borders, denser header (h-7, 10px uppercase)
- `src/components/terminal/StatCell.tsx`, `ChangeCell.tsx`, `RiskBadge.tsx`, `SourceBadge.tsx` — mono numerals, green/red only, square corners
- `src/components/layout/SideNav.tsx` — black bg, white text, green active rail, mono labels, denser (40px rows)
- `src/components/layout/MarketTape.tsx` — black bg, mono tickers, green/red deltas, tighter spacing, 28px height
- `src/components/layout/CommandPalette.tsx` — black sheet, green caret/active, mono input

**Page sweeps (visual only — no data changes):**
- `src/routes/dashboard.tsx` — bento gaps to 1px (hairline grid), denser tiles
- `src/routes/coins.tsx`, `trending.tsx`, `narratives.tsx`, `watchlist.tsx`, `wallet-pnl.tsx`, `ai.tsx`, `meme-of-the-day.tsx`, `settings.tsx` — panel paddings, table row heights, headline sizes
- `src/components/dashboard/*` (TrendingTable, PumpfunLaunches, MarketPulse, MemeOfTheDayCard, NarrativeFeed, TokenChartPanel, MarketBar, DexScreenerEmbed) — restyle to mono/dense
- `src/components/trending/AiTrendingTable.tsx`, `src/components/ai/AiChat.tsx`, `DailyBrief.tsx`, `src/components/wallet/WalletView.tsx`, `src/components/watchlist/WatchlistView.tsx`, `src/components/token/TokenDetailProvider.tsx`, `src/components/settings/ProviderStatusCard.tsx` — same treatment

**shadcn primitives** lightly touched where they clash:
- `button.tsx` — add `terminal` variant (square, mono, green hover)
- `badge.tsx` — square variants for pos/neg/warn
- `table.tsx` — denser row defaults
- `input.tsx`, `dialog.tsx`, `command.tsx` — square corners, black surfaces

## Out of scope (this pass)

- No new panels, no data source changes, no new routes
- No mobile bottom-nav rebuild (Phase 4 of the cockpit plan stays separate)
- No draggable widgets, no chart library swap
- No light mode — dark is the only theme

## Risk / verification

- After token rewrite, sweep `rg "text-white|bg-black|bg-\[#"` to catch hardcoded colors that bypass tokens
- Check every page in preview at 1338px to confirm density reads correctly
- Watch for shadcn components that hardcode `rounded-md` and break the square aesthetic — patch the primitive, not the consumer
