import { useEffect, useRef, useState } from "react";
import { Panel, PanelHeader, PanelBody } from "@/components/terminal/Panel";
import { SourceBadge } from "@/components/terminal/SourceBadge";
import { AlertTriangle } from "lucide-react";
import type { Source } from "@/types";

type Kind = "trending" | "new-pairs";

const GMGN: Record<Kind, { src: string; title: string; subtitle: string }> = {
  trending: {
    src: "https://www.gmgn.cc/meme/sol",
    title: "Trending · Solana",
    subtitle: "GMGN · sorted by 24h volume",
  },
  "new-pairs": {
    src: "https://www.gmgn.cc/new-pair/sol",
    title: "New Pairs · Pump.fun + Raydium",
    subtitle: "GMGN · live bonding-curve + freshly graduated",
  },
};

const GECKO_FALLBACK: Record<Kind, string> = {
  trending: "https://www.geckoterminal.com/solana/pools?embed=1&sort=h24_volume_usd",
  "new-pairs": "https://www.geckoterminal.com/solana/pump-fun/pools?embed=1",
};

type Props = {
  kind: Kind;
  title?: string;
  subtitle?: string;
  height?: number | string;
};

export function TokenListEmbed({ kind, title, subtitle, height = "78vh" }: Props) {
  const cfg = GMGN[kind];
  const [provider, setProvider] = useState<"gmgn" | "geckoterminal">("gmgn");
  const loadedRef = useRef(false);

  // GMGN may refuse iframing via X-Frame-Options / CSP. If we never get a load
  // event within 4s, fall back to GeckoTerminal.
  useEffect(() => {
    if (provider !== "gmgn") return;
    loadedRef.current = false;
    const t = setTimeout(() => {
      if (!loadedRef.current) setProvider("geckoterminal");
    }, 4000);
    return () => clearTimeout(t);
  }, [provider, kind]);

  const src = provider === "gmgn" ? cfg.src : GECKO_FALLBACK[kind];
  const source: Source = provider === "gmgn" ? "gmgn" : "geckoterminal";

  return (
    <Panel>
      <PanelHeader
        title={title ?? cfg.title}
        subtitle={subtitle ?? cfg.subtitle}
        accent="info"
        right={
          <div className="flex items-center gap-2">
            {provider === "geckoterminal" && (
              <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-warn">
                <AlertTriangle className="h-3 w-3" /> GMGN blocked · fallback
              </span>
            )}
            <SourceBadge source={source} />
          </div>
        }
      />
      <PanelBody className="p-0">
        <div className="w-full overflow-hidden">
          <iframe
            key={src}
            src={src}
            title={cfg.title}
            loading="lazy"
            onLoad={() => { loadedRef.current = true; }}
            className="border-0 bg-background block"
            style={{
              height: typeof height === "number" ? `${height}px` : height,
              width: "100%",
            }}
            allow="clipboard-write"
          />
        </div>
      </PanelBody>
    </Panel>
  );
}