import { createFileRoute } from "@tanstack/react-router";
import { WalletView } from "@/components/wallet/WalletView";

export const Route = createFileRoute("/wallet-pnl")({
  validateSearch: (s: Record<string, unknown>) => ({
    address: typeof s.address === "string" ? s.address : undefined,
  }),
  head: () => ({ meta: [
    { title: "Wallet P&L · SCBOL" },
    { name: "description", content: "Analyse any Solana wallet's memecoin P&L, ROI, win rate, and trade history (mock preview in Phase 1)." },
  ]}),
  component: WalletPnLPage,
});

function WalletPnLPage() {
  const { address } = Route.useSearch();
  return <div className="p-3"><WalletView initialAddress={address} /></div>;
}
