import { DexScreenerEmbed } from "./DexScreenerEmbed";

export function PumpfunLaunches({ height = 640 }: { height?: number }) {
  return (
    <DexScreenerEmbed
      title="Pump.fun · New Pairs"
      subtitle="GeckoTerminal · bonding curve pools"
      src="https://www.geckoterminal.com/solana/pump-fun/pools?embed=1"
      source="geckoterminal"
      height={height}
    />
  );
}