import type { Source } from "@/types";

const labels: Record<Source, string> = {
  dexscreener: "DEX", geckoterminal: "GECKO", coingecko: "CG", bitquery: "BQ",
  "solana-tracker": "ST", birdeye: "BE", vybe: "VY",
  "pump.fun": "PF", gmgn: "GMGN", mock: "MOCK",
};
export function SourceBadge({ source }: { source: Source }) {
  return (
    <span className="inline-flex items-center px-1 py-[1px] text-[10px] font-mono uppercase tracking-wider border border-border bg-panel-2 text-muted-foreground">
      {labels[source] ?? source}
    </span>
  );
}
