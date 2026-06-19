import { DexScreenerEmbed, type EmbedProviderOption } from "./DexScreenerEmbed";

const PROVIDERS: EmbedProviderOption[] = [
  {
    id: "gecko",
    label: "Gecko",
    source: "geckoterminal",
    src: "https://www.geckoterminal.com/solana/pump-fun/pools?embed=1",
  },
  {
    id: "dexscreener",
    label: "DexScreener",
    source: "dexscreener",
    src: "https://dexscreener.com/solana/pumpfun?embed=1&theme=dark&info=0",
  },
];

export function PumpfunLaunches({ height = 640 }: { height?: number }) {
  return (
    <DexScreenerEmbed
      title="Pump.fun · New Pairs"
      subtitle="New / Trending / Graduated"
      providers={PROVIDERS}
      defaultProviderId="gecko"
      storageKey="pf-launches-provider"
      height={height}
    />
  );
}