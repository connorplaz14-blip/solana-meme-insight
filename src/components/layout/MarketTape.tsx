import type { ReactNode } from "react";
import { useMacro, useMemeOfTheDay, useNarratives } from "@/lib/data";
import { fmtUsd, fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Search, Activity, Flame, Menu } from "lucide-react";
import { useCommandPalette } from "./CommandPaletteContext";
import { useMobileNav } from "./MobileNavContext";

function Tone({ pct }: { pct: number }) {
  const tone = pct >= 0 ? "text-pos" : "text-neg";
  return <span className={cn("font-mono", tone)}>{fmtPct(pct)}</span>;
}

function Cell({ label, value, sub, className }: { label: string; value: ReactNode; sub?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col justify-center px-2 md:px-3 h-full border-r border-border shrink-0 min-w-[84px] md:min-w-[112px]", className)}>
      <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="flex items-baseline gap-1.5 font-mono text-xs leading-tight">
        {value}
        {sub}
      </div>
    </div>
  );
}

function fngTone(v: number) {
  if (v >= 75) return "text-pos";
  if (v >= 55) return "text-pos/80";
  if (v >= 45) return "text-warn";
  if (v >= 25) return "text-neg/80";
  return "text-neg";
}

export function MarketTape() {
  const { data: macro } = useMacro();
  const { data: meme } = useMemeOfTheDay();
  const { data: narr } = useNarratives();
  const { open } = useCommandPalette();
  const { toggle: toggleNav } = useMobileNav();

  return (
    <div className="flex items-stretch h-10 border-b border-border bg-panel">
      <button
        onClick={toggleNav}
        className="md:hidden flex items-center justify-center px-3 border-r border-border text-foreground hover:bg-accent/30 shrink-0"
        aria-label="Open menu"
      >
        <Menu className="h-4 w-4" />
      </button>
      <div className="hidden md:flex items-center px-3 border-r border-border min-w-[140px] shrink-0">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-pos">◆ SCBOL</span>
      </div>

      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-stretch h-full">
          <Cell
            label="SOL"
            value={<span>{macro ? fmtUsd(macro.sol.priceUsd, { compact: false, digits: 2 }) : "…"}</span>}
            sub={macro ? <Tone pct={macro.sol.change24hPct} /> : null}
          />
          <Cell
            label="BTC"
            value={<span>{macro ? fmtUsd(macro.btc.priceUsd, { compact: false, digits: 0 }) : "…"}</span>}
            sub={macro ? <Tone pct={macro.btc.change24hPct} /> : null}
          />
          <Cell
            className="hidden md:flex"
            label="ETH"
            value={<span>{macro ? fmtUsd(macro.eth.priceUsd, { compact: false, digits: 0 }) : "…"}</span>}
            sub={macro ? <Tone pct={macro.eth.change24hPct} /> : null}
          />
          <Cell
            className="hidden md:flex"
            label="Total Mcap"
            value={<span>{macro ? fmtUsd(macro.totalMarketCapUsd) : "…"}</span>}
            sub={macro ? <Tone pct={macro.totalMcapChange24hPct} /> : null}
          />
          <Cell
            className="hidden md:flex"
            label="24h Vol"
            value={<span>{macro ? fmtUsd(macro.totalVolume24hUsd) : "…"}</span>}
          />
          <Cell
            className="hidden md:flex"
            label="SOL 24h Vol"
            value={<span>{macro ? fmtUsd(macro.sol.volume24hUsd) : "…"}</span>}
          />
          <Cell
            label="Fear & Greed"
            value={
              macro?.fearGreed ? (
                <span className={cn(fngTone(macro.fearGreed.value))}>
                  {macro.fearGreed.value}
                  <span className="text-muted-foreground hidden md:inline"> · {macro.fearGreed.label}</span>
                </span>
              ) : (
                "…"
              )
            }
          />
          <Cell
            className="hidden md:flex"
            label="Solana TPS"
            value={
              <span className="flex items-center gap-1">
                <Activity className="h-3 w-3 text-info" />
                {macro?.solana ? macro.solana.tps.toLocaleString() : "…"}
              </span>
            }
          />
          <Cell
            className="hidden md:flex"
            label="Top Meme"
            value={
              meme ? (
                <span className="truncate max-w-[120px]">${meme.symbol}</span>
              ) : (
                "…"
              )
            }
            sub={meme ? <Tone pct={meme.changes.h24} /> : null}
          />
          <Cell
            className="hidden md:flex"
            label="Narrative"
            value={
              <span className="flex items-center gap-1 text-warn truncate max-w-[160px]">
                <Flame className="h-3 w-3 shrink-0" />
                <span className="truncate">{narr?.dominantTheme ?? "…"}</span>
              </span>
            }
          />
        </div>
      </div>

      <button
        onClick={open}
        className="flex items-center gap-2 px-3 border-l border-border text-muted-foreground hover:bg-accent/30 hover:text-foreground shrink-0"
        title="Open command palette"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden md:inline font-mono text-[10px] uppercase tracking-wider">Search</span>
        <kbd className="hidden md:inline-flex items-center font-mono text-[10px] border border-border bg-panel-2 px-1.5 py-0.5">
          ⌘K
        </kbd>
      </button>
    </div>
  );
}