import { useEffect, useState } from "react";
import { Panel, PanelHeader, PanelBody } from "@/components/terminal/Panel";
import { SourceBadge } from "@/components/terminal/SourceBadge";
import type { Source } from "@/types";

export type EmbedProviderOption = {
  id: string;
  label: string;
  src: string;
  source: Source;
};

type Props = {
  title: string;
  subtitle?: string;
  height?: number | string;
  /** Single fixed embed. */
  src?: string;
  source?: Source;
  /** Multi-provider toggle. When provided, takes precedence over `src`. */
  providers?: EmbedProviderOption[];
  defaultProviderId?: string;
  /** localStorage key to persist provider choice. */
  storageKey?: string;
};

export function DexScreenerEmbed({
  title,
  subtitle,
  height = 520,
  src,
  source = "dexscreener",
  providers,
  defaultProviderId,
  storageKey,
}: Props) {
  const hasToggle = providers && providers.length > 1;
  const initialId =
    providers?.[0]?.id ?? defaultProviderId ?? "default";

  const [currentId, setCurrentId] = useState<string>(() => {
    if (!hasToggle) return initialId;
    if (typeof window !== "undefined" && storageKey) {
      const saved = window.localStorage.getItem(storageKey);
      if (saved && providers!.some((p) => p.id === saved)) return saved;
    }
    return defaultProviderId ?? providers![0].id;
  });

  useEffect(() => {
    if (hasToggle && storageKey && typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, currentId);
    }
  }, [currentId, hasToggle, storageKey]);

  const active = hasToggle ? providers!.find((p) => p.id === currentId) ?? providers![0] : null;
  const iframeSrc = active?.src ?? src ?? "";
  const iframeSource: Source = active?.source ?? source;

  return (
    <Panel>
      <PanelHeader
        title={title}
        subtitle={subtitle}
        accent="info"
        right={
          <div className="flex items-center gap-2">
            {hasToggle && (
              <div className="inline-flex border border-border bg-panel-2 font-mono text-[10px] uppercase tracking-wider">
                {providers!.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setCurrentId(p.id)}
                    className={
                      "px-2 py-[2px] transition-colors " +
                      (p.id === currentId
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground")
                    }
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
            <SourceBadge source={iframeSource} />
          </div>
        }
      />
      <PanelBody className="p-0">
        <div
          className="w-full overflow-x-auto overflow-y-hidden"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <iframe
            key={iframeSrc}
            src={iframeSrc}
            title={title}
            loading="lazy"
            className="border-0 bg-background block w-full min-w-[720px] sm:min-w-0"
            style={{
              height: typeof height === "number" ? `${height}px` : height,
            }}
            allow="clipboard-write"
          />
        </div>
      </PanelBody>
    </Panel>
  );
}