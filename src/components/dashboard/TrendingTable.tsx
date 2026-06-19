import { useMemo, useState } from "react";
import { useTrending } from "@/lib/data";
import { Panel, PanelHeader, PanelBody } from "@/components/terminal/Panel";
import { ChangeCell } from "@/components/terminal/ChangeCell";
import { RiskBadge } from "@/components/terminal/RiskBadge";
import { SourceBadge } from "@/components/terminal/SourceBadge";
import { CopyAddress } from "@/components/terminal/CopyAddress";
import { TokenAvatar } from "@/components/terminal/TokenAvatar";
import { fmtUsd, fmtNum, fmtAge } from "@/lib/format";
import { Star, Search } from "lucide-react";
import type { Risk, Token } from "@/types";
import { addToWatchlist, isWatched, removeFromWatchlist } from "@/lib/watchlist-store";
import { cn } from "@/lib/utils";

type SortKey = "rank" | "marketCapUsd" | "liquidityUsd" | "volume24hUsd" | "ageHours" | "h24";

export function TrendingTable({ limit, dense = false }: { limit?: number; dense?: boolean }) {
  const { data, status } = useTrending();
  const [q, setQ] = useState("");
  const [risk, setRisk] = useState<Risk | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [asc, setAsc] = useState(true);
  const [, force] = useState(0);

  const rows = useMemo(() => {
    let r = (data ?? []).slice();
    if (q) {
      const s = q.toLowerCase();
      r = r.filter((t) => t.name.toLowerCase().includes(s) || t.symbol.toLowerCase().includes(s) || t.address.toLowerCase().includes(s));
    }
    if (risk !== "all") r = r.filter((t) => t.risk === risk);
    r.sort((a, b) => {
      const av = sortKey === "h24" ? a.changes.h24 : (a[sortKey as keyof Token] as number);
      const bv = sortKey === "h24" ? b.changes.h24 : (b[sortKey as keyof Token] as number);
      return asc ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return limit ? r.slice(0, limit) : r;
  }, [data, q, risk, sortKey, asc, limit]);

  function toggleSort(k: SortKey) {
    if (k === sortKey) setAsc(!asc); else { setSortKey(k); setAsc(k === "rank"); }
  }

  function HeaderBtn({ k, children, align = "right" }: { k: SortKey; children: React.ReactNode; align?: "left" | "right" }) {
    return (
      <button
        onClick={() => toggleSort(k)}
        className={cn("uppercase tracking-wider text-[10px] text-muted-foreground hover:text-foreground w-full",
          align === "right" ? "text-right" : "text-left")}
      >
        {children}{sortKey === k ? (asc ? " ▲" : " ▼") : ""}
      </button>
    );
  }

  return (
    <Panel>
      <PanelHeader
        title="Trending Tokens"
        subtitle={`${rows.length} listed`}
        accent="info"
        right={
          !limit && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 border border-border bg-panel-2 px-2 h-6">
                <Search className="h-3 w-3 text-muted-foreground" />
                <input
                  value={q} onChange={(e) => setQ(e.target.value)}
                  placeholder="Search symbol / address"
                  className="bg-transparent outline-none font-mono text-[11px] w-44 placeholder:text-muted-foreground/60"
                />
              </div>
              <select value={risk} onChange={(e) => setRisk(e.target.value as Risk | "all")}
                className="bg-panel-2 border border-border px-2 h-6 font-mono text-[11px] uppercase">
                <option value="all">All risk</option>
                <option value="low">Low</option>
                <option value="medium">Med</option>
                <option value="high">High</option>
                <option value="extreme">Extreme</option>
              </select>
            </div>
          )
        }
      />
      <PanelBody className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="bg-panel-2/60 border-b border-border">
              <tr className="[&>th]:px-2 [&>th]:py-1.5 [&>th]:font-normal">
                <th className="text-left w-8"><HeaderBtn k="rank" align="left">#</HeaderBtn></th>
                <th className="text-left">Token</th>
                <th className="text-left">Contract</th>
                <th className="text-right"><HeaderBtn k="marketCapUsd">Mcap</HeaderBtn></th>
                <th className="text-right"><HeaderBtn k="liquidityUsd">Liq</HeaderBtn></th>
                <th className="text-right"><HeaderBtn k="volume24hUsd">Vol 24h</HeaderBtn></th>
                <th className="text-right">5m</th>
                <th className="text-right">1h</th>
                <th className="text-right">6h</th>
                <th className="text-right"><HeaderBtn k="h24">24h</HeaderBtn></th>
                <th className="text-right">Txns 24h</th>
                <th className="text-right"><HeaderBtn k="ageHours">Age</HeaderBtn></th>
                <th className="text-left">Src</th>
                <th className="text-left">Risk</th>
                <th className="text-center w-8">★</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.address} className={cn(
                  "border-b border-border/50 hover:bg-accent/20 [&>td]:px-2",
                  dense ? "[&>td]:py-1" : "[&>td]:py-1.5"
                )}>
                  <td className="font-mono text-muted-foreground">{t.rank}</td>
                  <td>
                    <div className="flex items-center gap-2 min-w-0">
                      <TokenAvatar symbol={t.symbol} size={20} logoUrl={t.logoUrl} />
                      <div className="min-w-0">
                        <div className="truncate">{t.name}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">${t.symbol}</div>
                      </div>
                    </div>
                  </td>
                  <td><CopyAddress address={t.address} /></td>
                  <td className="text-right font-mono">{fmtUsd(t.marketCapUsd)}</td>
                  <td className="text-right font-mono">{fmtUsd(t.liquidityUsd)}</td>
                  <td className="text-right font-mono">{fmtUsd(t.volume24hUsd)}</td>
                  <td className="text-right"><ChangeCell value={t.changes.m5} /></td>
                  <td className="text-right"><ChangeCell value={t.changes.h1} /></td>
                  <td className="text-right"><ChangeCell value={t.changes.h6} /></td>
                  <td className="text-right"><ChangeCell value={t.changes.h24} /></td>
                  <td className="text-right font-mono text-muted-foreground whitespace-nowrap">
                    <span className="text-pos">{fmtNum(t.txns.buys24h)}</span>
                    <span className="px-0.5">/</span>
                    <span className="text-neg">{fmtNum(t.txns.sells24h)}</span>
                  </td>
                  <td className="text-right font-mono">{fmtAge(t.ageHours)}</td>
                  <td><div className="flex gap-1 flex-wrap">{t.sources.map((s) => <SourceBadge key={s} source={s} />)}</div></td>
                  <td><RiskBadge risk={t.risk} /></td>
                  <td className="text-center">
                    <button
                      onClick={() => {
                        if (isWatched(t.address)) removeFromWatchlist(t.address);
                        else addToWatchlist({ address: t.address, name: t.name, symbol: t.symbol, addedAt: new Date().toISOString() });
                        force((x) => x + 1);
                      }}
                      className={cn("hover:text-warn transition-colors", isWatched(t.address) ? "text-warn" : "text-muted-foreground")}
                      title={isWatched(t.address) ? "Remove from watchlist" : "Add to watchlist"}
                    >
                      <Star className={cn("h-3.5 w-3.5", isWatched(t.address) && "fill-current")} />
                    </button>
                  </td>
                </tr>
              ))}
              {status === "loading" && (
                <tr><td colSpan={15} className="px-3 py-4 text-center text-muted-foreground font-mono text-[11px]">Loading…</td></tr>
              )}
              {status === "ready" && rows.length === 0 && (
                <tr><td colSpan={15} className="px-3 py-4 text-center text-muted-foreground font-mono text-[11px]">No matches</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </PanelBody>
    </Panel>
  );
}
