import { Panel, PanelHeader, PanelBody } from "@/components/terminal/Panel";
import { useMemeOfTheDay } from "@/lib/data";

export function TokenChartPanel() {
  const { data: mod } = useMemeOfTheDay();
  const address = mod?.address;
  const src = address
    ? `https://dexscreener.com/solana/${address}?embed=1&theme=dark&trades=0&info=0`
    : null;

  return (
    <Panel>
      <PanelHeader
        title="Token Chart"
        subtitle={mod ? `${mod.symbol} · ${mod.name}` : ""}
        accent="info"
        right={
          address ? (
            <a
              href={`https://dexscreener.com/solana/${address}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              Open ↗
            </a>
          ) : null
        }
      />
      <PanelBody className="p-0">
        {!src ? (
          <div className="h-72 flex items-center justify-center text-muted-foreground font-mono text-[11px]">
            Loading chart…
          </div>
        ) : (
          <div className="relative w-full" style={{ height: 480 }}>
            <iframe
              key={address}
              src={src}
              title={`DexScreener chart for ${mod?.symbol ?? "token"}`}
              loading="lazy"
              className="absolute inset-0 w-full h-full border-0"
              allow="clipboard-write"
            />
          </div>
        )}
      </PanelBody>
    </Panel>
  );
}
