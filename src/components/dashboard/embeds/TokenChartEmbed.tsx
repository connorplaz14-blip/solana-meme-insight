import { useEffect, useState } from "react";
import { Panel, PanelHeader, PanelBody } from "@/components/terminal/Panel";
import { SourceBadge } from "@/components/terminal/SourceBadge";
import { cn } from "@/lib/utils";

export type ChartProvider = "dex" | "pf";

type Props = {
  address: string;
  symbol?: string;
  /** When false, defaults to PF chart. When true, defaults to DEX. */
  bonded?: boolean;
  /** Forced default; overrides `bonded`. */
  defaultProvider?: ChartProvider;
  /** Render the panel chrome (header + border). Defaults to true. */
  withChrome?: boolean;
  height?: number | string;
  title?: string;
  subtitle?: string;
};

function srcFor(provider: ChartProvider, addr: string) {
  return provider === "dex"
    ? `https://dexscreener.com/solana/${addr}?embed=1&theme=dark&trades=0&info=0`
    : `https://www.gmgn.cc/kline/sol/${addr}`;
}

function storageKey(addr: string) { return `chart-provider:${addr}`; }

export function TokenChartEmbed({
  address,
  symbol,
  bonded,
  defaultProvider,
  withChrome = true,
  height = 480,
  title = "Token Chart",
  subtitle,
}: Props) {
  const auto: ChartProvider = defaultProvider ?? (bonded === false ? "pf" : "dex");
  const [provider, setProvider] = useState<ChartProvider>(() => {
    if (typeof window === "undefined") return auto;
    const saved = window.localStorage.getItem(storageKey(address));
    return saved === "dex" || saved === "pf" ? saved : auto;
  });

  // Re-sync default when the address changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(storageKey(address));
    setProvider(saved === "dex" || saved === "pf" ? saved : auto);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  function pick(p: ChartProvider) {
    setProvider(p);
    if (typeof window !== "undefined") window.localStorage.setItem(storageKey(address), p);
  }

  const src = srcFor(provider, address);
  const heightStyle = typeof height === "number" ? `${height}px` : height;

  const toggle = (
    <div className="inline-flex border border-border bg-panel-2 font-mono text-[10px] uppercase tracking-wider">
      {(["dex", "pf"] as const).map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => pick(p)}
          className={cn(
            "px-2 py-[2px] transition-colors",
            p === provider ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {p === "dex" ? "DEX" : "PF"}
        </button>
      ))}
    </div>
  );

  const iframe = (
    <div className="w-full overflow-hidden" style={{ height: heightStyle }}>
      <iframe
        key={src}
        src={src}
        title={`${symbol ?? "token"} chart (${provider === "dex" ? "DexScreener" : "Pump.fun"})`}
        loading="lazy"
        className="w-full h-full border-0 bg-background"
        allow="clipboard-write"
      />
    </div>
  );

  if (!withChrome) {
    return (
      <div className="relative">
        <div className="absolute top-2 right-2 z-10">{toggle}</div>
        {iframe}
      </div>
    );
  }

  return (
    <Panel>
      <PanelHeader
        title={title}
        subtitle={subtitle ?? (symbol ? symbol : undefined)}
        accent="info"
        right={
          <div className="flex items-center gap-2">
            {toggle}
            <SourceBadge source={provider === "dex" ? "dexscreener" : "gmgn"} />
          </div>
        }
      />
      <PanelBody className="p-0">{iframe}</PanelBody>
    </Panel>
  );
}