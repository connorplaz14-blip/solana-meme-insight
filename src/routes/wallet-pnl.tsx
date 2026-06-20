import { createFileRoute } from "@tanstack/react-router";
import { WalletView } from "@/components/wallet/WalletView";

export const Route = createFileRoute("/wallet-pnl")({
  head: () => ({ meta: [
    { title: "Wallet P&L · MemeDesk" },
    { name: "description", content: "Analyse any Solana wallet's memecoin portfolio, 24h P&L, ROI and positions — powered by Birdeye." },
  ]}),
  component: () => <div className="p-3"><WalletView /></div>,
});
