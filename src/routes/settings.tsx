import { createFileRoute } from "@tanstack/react-router";
import { useProviders } from "@/lib/data";
import { ProviderStatusCard } from "@/components/settings/ProviderStatusCard";
import { Panel, PanelHeader, PanelBody } from "@/components/terminal/Panel";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [
    { title: "Settings · MemeDesk" },
    { name: "description", content: "Provider status, integration matrix, and security rules for the MemeDesk dashboard." },
  ]}),
  component: SettingsPage,
});

function SettingsPage() {
  const { data } = useProviders();
  return (
    <div className="p-3 space-y-3">
      <Panel>
        <PanelHeader title="Security & Scope" accent="warn" />
        <PanelBody>
          <ul className="text-[12px] space-y-1 text-foreground/80">
            <li>· Analytics & intelligence only. No swap routing, sniping, or auto-trading.</li>
            <li>· No private keys are accepted, generated, or stored anywhere in this app.</li>
            <li>· API keys live exclusively in backend Edge Functions, never in the frontend bundle.</li>
            <li>· AI summaries operate only on structured DEX / launchpad data — no metric invention.</li>
            <li>· Scraping (Browserbase / Oxylabs / browser-use) is a backend-only Phase 3 job.</li>
          </ul>
        </PanelBody>
      </Panel>

      <div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2 font-mono">Data Providers</div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {(data ?? []).map((p) => <ProviderStatusCard key={p.id} p={p} />)}
        </div>
      </div>
    </div>
  );
}
