import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TokenAvatar } from "@/components/terminal/TokenAvatar";
import { CopyAddress } from "@/components/terminal/CopyAddress";
import { TokenChartEmbed } from "@/components/dashboard/embeds/TokenChartEmbed";

export type TokenRef = {
  address: string;
  symbol: string;
  name?: string;
  logoUrl?: string;
  bonded?: boolean;
};

type Ctx = { open: (t: TokenRef) => void };
const TokenDetailCtx = createContext<Ctx | null>(null);

export function useTokenDetail() {
  const ctx = useContext(TokenDetailCtx);
  if (!ctx) throw new Error("useTokenDetail must be used inside TokenDetailProvider");
  return ctx;
}

export function TokenDetailProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<TokenRef | null>(null);
  const open = useCallback((t: TokenRef) => setToken(t), []);

  return (
    <TokenDetailCtx.Provider value={{ open }}>
      {children}
      <Dialog open={!!token} onOpenChange={(o) => !o && setToken(null)}>
        <DialogContent className="max-w-5xl w-[95vw] p-0 bg-panel border border-border">
          {token && <TokenDetailBody token={token} />}
        </DialogContent>
      </Dialog>
    </TokenDetailCtx.Provider>
  );
}

function TokenDetailBody({ token }: { token: TokenRef }) {
  const addr = token.address;
  const txnsSrc = `https://dexscreener.com/solana/${addr}?embed=1&theme=dark&trades=1&info=0`;
  const bonded = token.bonded;

  return (
    <div className="flex flex-col max-h-[88vh]">
      <DialogHeader className="px-4 py-3 border-b border-border">
        <DialogTitle asChild>
          <div className="flex items-center gap-3">
            <TokenAvatar symbol={token.symbol} size={32} logoUrl={token.logoUrl} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-medium">{token.name ?? token.symbol}</span>
                <span className="font-mono text-xs text-muted-foreground">${token.symbol}</span>
              </div>
              <div className="mt-0.5"><CopyAddress address={addr} /></div>
            </div>
            <div className="ml-auto flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider">
              <a href={`https://dexscreener.com/solana/${addr}`} target="_blank" rel="noreferrer"
                className="border border-border bg-panel-2 px-2 py-1 hover:bg-accent">DexScreener ↗</a>
              <a href={`https://pump.fun/${addr}`} target="_blank" rel="noreferrer"
                className="border border-border bg-panel-2 px-2 py-1 hover:bg-accent">Pump.fun ↗</a>
              <a href={`https://solscan.io/token/${addr}`} target="_blank" rel="noreferrer"
                className="border border-border bg-panel-2 px-2 py-1 hover:bg-accent">Solscan ↗</a>
            </div>
          </div>
        </DialogTitle>
      </DialogHeader>

      <Tabs defaultValue="chart" className="flex-1 min-h-0 flex flex-col">
        <TabsList className="mx-4 mt-3 self-start bg-panel-2 border border-border h-8">
          <TabsTrigger value="chart" className="font-mono text-[11px] uppercase tracking-wider">Chart</TabsTrigger>
          <TabsTrigger value="txns" className="font-mono text-[11px] uppercase tracking-wider">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="chart" className="flex-1 min-h-0 m-0 p-3 pt-2">
          <TokenChartEmbed
            address={addr}
            symbol={token.symbol}
            bonded={bonded}
            withChrome={false}
            height="65vh"
          />
        </TabsContent>

        <TabsContent value="txns" className="flex-1 min-h-0 m-0 p-3 pt-2">
          {bonded === false ? (
            <div className="h-[65vh] flex items-center justify-center text-muted-foreground font-mono text-[11px]">
              No DEX pool yet — token still on Pump.fun bonding curve.
            </div>
          ) : (
            <iframe
              key={`txns-${addr}`}
              src={txnsSrc}
              title={`${token.symbol} transactions`}
              loading="lazy"
              className="w-full h-[65vh] border-0 bg-background"
              allow="clipboard-write"
            />
          )}
        </TabsContent>

      </Tabs>
    </div>
  );
}