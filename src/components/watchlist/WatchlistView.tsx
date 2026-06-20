import { useEffect, useState } from "react";
import { Panel, PanelHeader, PanelBody } from "@/components/terminal/Panel";
import { CopyAddress } from "@/components/terminal/CopyAddress";
import { TokenAvatar } from "@/components/terminal/TokenAvatar";
import { useTokensByAddresses } from "@/lib/data";
import { addToWatchlist, getWatchlist, removeFromWatchlist, subscribeWatchlist } from "@/lib/watchlist-store";
import { fmtUsd } from "@/lib/format";
import { ChangeCell } from "@/components/terminal/ChangeCell";
import { X, Plus } from "lucide-react";
import type { WatchlistEntry } from "@/types";
import { useTokenDetail } from "@/components/token/TokenDetailProvider";
import { isBonded } from "@/lib/token-bonded";

export function WatchlistView() {
  const [items, setItems] = useState<WatchlistEntry[]>([]);
  const { open } = useTokenDetail();
  const [addr, setAddr] = useState("");
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const addresses = items.map((e) => e.address);
  const { data: liveTokens } = useTokensByAddresses(addresses);

  useEffect(() => {
    setItems(getWatchlist());
    return subscribeWatchlist(() => setItems(getWatchlist()));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const address = addr.trim();
    if (!address) return;
    setAddError(null);
    let sym = symbol.trim().toUpperCase();
    let nm = name.trim();
    if (!sym || !nm) {
      setAdding(true);
      try {
        const res = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${address}`);
        const pairs = res.ok ? (await res.json()) as Array<{ baseToken?: { name?: string; symbol?: string; address?: string } }> : [];
        const match = pairs.find((p) => p.baseToken?.address === address) ?? pairs[0];
        if (match?.baseToken) {
          sym = sym || (match.baseToken.symbol ?? "").toUpperCase();
          nm = nm || match.baseToken.name || sym;
        }
      } catch { /* ignore — user can still add manually */ }
      setAdding(false);
    }
    if (!sym) { setAddError("Could not resolve token. Enter symbol manually."); return; }
    addToWatchlist({ address, name: nm || sym, symbol: sym, addedAt: new Date().toISOString() });
    setAddr(""); setName(""); setSymbol("");
  }

  function findToken(address: string) { return liveTokens?.find((t) => t.address === address); }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3">
      <Panel>
        <PanelHeader title="Watchlist" subtitle={`${items.length} tokens`} accent="warn" />
        <PanelBody className="p-0">
          {/* Mobile card list */}
          <ul className="md:hidden divide-y divide-border">
            {items.map((e) => {
              const t = findToken(e.address);
              return (
                <li key={e.address} className="px-3 py-2.5 hover:bg-accent/20">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => open({ address: e.address, symbol: e.symbol, name: e.name, logoUrl: t?.logoUrl, bonded: t ? isBonded(t) : undefined })}
                      className="flex items-center gap-2 min-w-0 text-left hover:text-pos transition-colors flex-1"
                    >
                      <TokenAvatar symbol={e.symbol} size={22} logoUrl={t?.logoUrl} />
                      <div className="min-w-0">
                        <div className="truncate text-[12px]">{e.name}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">${e.symbol}</div>
                      </div>
                    </button>
                    <button onClick={() => removeFromWatchlist(e.address)} className="text-muted-foreground hover:text-neg shrink-0 p-1">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 font-mono text-[11px]">
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Price</div>
                      <div>{t ? fmtUsd(t.priceUsd, { compact: false }) : "—"}</div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Mcap</div>
                      <div>{t ? fmtUsd(t.marketCapUsd) : "—"}</div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">24h</div>
                      <div>{t ? <ChangeCell value={t.changes.h24} /> : <span className="text-muted-foreground">—</span>}</div>
                    </div>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <CopyAddress address={e.address} />
                    <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                      {new Date(e.addedAt).toLocaleDateString()}
                    </span>
                  </div>
                </li>
              );
            })}
            {items.length === 0 && (
              <li className="px-3 py-6 text-center text-muted-foreground font-mono text-[11px]">
                Watchlist is empty. Add a token →
              </li>
            )}
          </ul>
          {/* Desktop table */}
          <table className="hidden md:table w-full text-[12px]">
            <thead className="bg-panel-2/60 border-b border-border">
              <tr className="[&>th]:px-2 [&>th]:py-1.5 [&>th]:font-normal [&>th]:text-[10px] [&>th]:uppercase [&>th]:tracking-wider [&>th]:text-muted-foreground">
                <th className="text-left">Token</th>
                <th className="text-left">Contract</th>
                <th className="text-right">Price</th>
                <th className="text-right">Mcap</th>
                <th className="text-right">24h</th>
                <th className="text-left">Added</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((e) => {
                const t = findToken(e.address);
                return (
                  <tr key={e.address} className="border-b border-border/50 hover:bg-accent/20 [&>td]:px-2 [&>td]:py-1.5">
                    <td>
                      <button
                        type="button"
                        onClick={() => open({ address: e.address, symbol: e.symbol, name: e.name, logoUrl: t?.logoUrl, bonded: t ? isBonded(t) : undefined })}
                        className="flex items-center gap-2 text-left hover:text-pos transition-colors"
                      >
                        <TokenAvatar symbol={e.symbol} size={20} logoUrl={t?.logoUrl} />
                        <div>
                          <div>{e.name}</div>
                          <div className="font-mono text-[10px] text-muted-foreground">${e.symbol}</div>
                        </div>
                      </button>
                    </td>
                    <td><CopyAddress address={e.address} /></td>
                    <td className="text-right font-mono">{t ? fmtUsd(t.priceUsd, { compact: false }) : "—"}</td>
                    <td className="text-right font-mono">{t ? fmtUsd(t.marketCapUsd) : "—"}</td>
                    <td className="text-right">{t ? <ChangeCell value={t.changes.h24} /> : <span className="text-muted-foreground">—</span>}</td>
                    <td className="font-mono text-[11px] text-muted-foreground">{new Date(e.addedAt).toLocaleDateString()}</td>
                    <td>
                      <button onClick={() => removeFromWatchlist(e.address)} className="text-muted-foreground hover:text-neg">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground font-mono text-[11px]">Watchlist is empty. Add a token →</td></tr>
              )}
            </tbody>
          </table>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader title="Add Token" accent="pos" />
        <PanelBody>
          <form onSubmit={submit} className="space-y-2">
            <label className="block">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Contract address</span>
              <input value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="Mint address"
                className="w-full mt-0.5 bg-panel-2 border border-border px-2 py-1 font-mono text-[11px] outline-none focus:border-pos" />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Symbol</span>
                <input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="WIF"
                  className="w-full mt-0.5 bg-panel-2 border border-border px-2 py-1 font-mono text-[11px] outline-none focus:border-pos" />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="dogwifhat"
                  className="w-full mt-0.5 bg-panel-2 border border-border px-2 py-1 font-mono text-[11px] outline-none focus:border-pos" />
              </label>
            </div>
            <button type="submit" disabled={adding || !addr.trim()}
              className="w-full mt-1 inline-flex items-center justify-center gap-1 border border-pos/40 bg-pos/10 hover:bg-pos/20 disabled:opacity-40 disabled:cursor-not-allowed text-pos font-mono text-[11px] uppercase tracking-wider py-1.5">
              <Plus className="h-3 w-3" /> {adding ? "Resolving…" : "Add to watchlist"}
            </button>
            {addError && <p className="text-[10px] text-neg mt-1">{addError}</p>}
            <p className="text-[10px] text-muted-foreground mt-2">
              Saved to your browser. Live price &amp; market cap pulled from DexScreener.
            </p>
          </form>
        </PanelBody>
      </Panel>
    </div>
  );
}
