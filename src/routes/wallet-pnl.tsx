import { createFileRoute } from "@tanstack/react-router";
import { WalletView } from "@/components/wallet/WalletView";

export const Route = createFileRoute("/wallet-pnl")({
  head: () => ({ meta: [
    { title: "Wallet P&L · MemeDesk" },
    { name: "description", content: "Analyse any Solana wallet's memecoin P&L, ROI, win rate, and trade history (mock preview in Phase 1)." },
  ]}),
  component: () => <div className="p-3"><WalletView /></div>,
});
