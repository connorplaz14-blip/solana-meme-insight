import { DexScreenerEmbed } from "./DexScreenerEmbed";

export function PumpfunLaunches({ height = 640 }: { height?: number }) {
  return (
    <DexScreenerEmbed
      title="Pump.fun · New Pairs"
      subtitle="Trending / New / Graduated"
      src="https://dexscreener.com/solana/pumpfun?embed=1&theme=dark&info=0"
      height={height}
    />
  );
}