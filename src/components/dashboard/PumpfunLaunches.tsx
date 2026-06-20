import { TokenListEmbed } from "./embeds/TokenListEmbed";

export function PumpfunLaunches({ height = 640 }: { height?: number }) {
  return <TokenListEmbed kind="new-pairs" height={height} />;
}