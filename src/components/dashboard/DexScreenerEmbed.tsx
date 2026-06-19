import { Panel, PanelHeader, PanelBody } from "@/components/terminal/Panel";
import { SourceBadge } from "@/components/terminal/SourceBadge";

export function DexScreenerEmbed({
  src,
  title,
  subtitle,
  height = 520,
}: {
  src: string;
  title: string;
  subtitle?: string;
  height?: number | string;
}) {
  return (
    <Panel>
      <PanelHeader title={title} subtitle={subtitle} accent="info" right={<SourceBadge source="dexscreener" />} />
      <PanelBody className="p-0">
        <iframe
          src={src}
          title={title}
          loading="lazy"
          className="w-full border-0 bg-background block"
          style={{ height: typeof height === "number" ? `${height}px` : height }}
          allow="clipboard-write"
        />
      </PanelBody>
    </Panel>
  );
}