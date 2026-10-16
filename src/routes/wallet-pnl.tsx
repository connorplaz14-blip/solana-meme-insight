import { createFileRoute } from "@tanstack/react-router";
import { WalletView } from "@/components/wallet/WalletView";

export const Route = createFileRoute("/wallet-pnl")({
  validateSearch: (s: Record<string, unknown>): { address?: string } => ({
    address: typeof s.address === "string" ? s.address : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Wallet intelligence · CTRL" },
      {
        name: "description",
        content: "Trace Solana wallet FIFO lots, fees, source evidence and coverage gaps.",
      },
    ],
  }),
  component: WalletPnLPage,
});

function WalletPnLPage() {
  const { address } = Route.useSearch();
  return (
    <div className="p-3">
      <WalletView initialAddress={address} />
    </div>
  );
}
