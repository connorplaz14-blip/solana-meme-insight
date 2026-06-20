import { useMemo, useState } from "react";
import { useTrending } from "@/lib/data";
import { Panel, PanelHeader, PanelBody } from "@/components/terminal/Panel";
import { ChangeCell } from "@/components/terminal/ChangeCell";
import { RiskBadge } from "@/components/terminal/RiskBadge";
import { SourceBadge } from "@/components/terminal/SourceBadge";
import { CopyAddress } from "@/components/terminal/CopyAddress";
import { TokenAvatar } from "@/components/terminal/TokenAvatar";
import { fmtUsd, fmtNum, fmtAge } from "@/lib/format";
import { Star, Search, Sparkles } from "lucide-react";
import type { Risk, Token } from "@/types";
import { addToWatchlist, isWatched, removeFromWatchlist } from "@/lib/watchlist-store";
import { cn } from "@/lib/utils";
import { useTokenDetail } from "@/components/token/TokenDetailProvider";
import { isBonded } from "@/lib/token-bonded";
import { TokenDeepDiveDialog } from "@/components/ai/TokenDeepDiveDialog";

type SortKey = "rank" | "marketCapUsd" | "liquidityUsd" | "volume24hUsd" | "ageHours" | "h24";

export function TrendingTable({ limit, dense = false }: { limit?: number; dense?: boolean }) {
  const { data, status } = useTrending();
  const { open } = useTokenDetail();
  const [q, setQ] = useState("");
  const [risk, setRisk] = useState<Risk | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [asc, setAsc] = useState(true);
  const [, force] = useState(0);
  const [dlg, setDlg] = useState<{ open: boolean; query: string }>({
    open: false,
    query: "",
  });

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
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              <div className="flex items-center gap-1 border border-border bg-panel-2 px-2 h-6 flex-1 sm:flex-none min-w-0">
                <Search className="h-3 w-3 text-muted-foreground" />
                <input
                  value={q} onChange={(e) => setQ(e.target.value)}
                  placeholder="Search symbol / address"
                  className="bg-transparent outline-none font-mono text-[11px] w-full sm:w-44 min-w-0 placeholder:text-muted-foreground/60"
                />
              </div>
              <select value={risk} onChange={(e) => setRisk(e.target.value as Risk | "all")}
                className="bg-panel-2 border border-border px-2 h-6 font-mono text-[11px] uppercase shrink-0">
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
        {/* Mobile card list */}
        <ul className="md:hidden divide-y divide-border">
          {rows.map((t) => (
            <li key={t.address} className="px-3 py-2.5 hover:bg-accent/20">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-muted-foreground w-5 shrink-0">{t.rank}</span>
                <button
                  type="button"
                  onClick={() => open({ address: t.address, symbol: t.symbol, name: t.name, logoUrl: t.logoUrl, bonded: isBonded(t) })}
                  className="flex items-center gap-2 min-w-0 flex-1 text-left hover:text-pos transition-colors"
                >
                  <TokenAvatar symbol={t.symbol} size={22} logoUrl={t.logoUrl} />
                  <div className="min-w-0">
                    <div className="truncate text-[12px]">{t.name}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">${t.symbol}</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    if (isWatched(t.address)) removeFromWatchlist(t.address);
                    else addToWatchlist({ address: t.address, name: t.name, symbol: t.symbol, addedAt: new Date().toISOString() });
                    force((x) => x + 1);
                  }}
                  className={cn("hover:text-warn transition-colors shrink-0 p-1", isWatched(t.address) ? "text-warn" : "text-muted-foreground")}
                  title={isWatched(t.address) ? "Remove from watchlist" : "Add to watchlist"}
                >
                  <Star className={cn("h-3.5 w-3.5", isWatched(t.address) && "fill-current")} />
                </button>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 font-mono text-[11px]">
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Mcap</div>
                  <div>{fmtUsd(t.marketCapUsd)}</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Vol 24h</div>
                  <div>{fmtUsd(t.volume24hUsd)}</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">24h</div>
                  <div><ChangeCell value={t.changes.h24} /></div>
                </div>
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {t.sources.map((s) => <SourceBadge key={s} source={s} />)}
                  <RiskBadge risk={t.risk} />
                </div>
                <CopyAddress address={t.address} />
              </div>
            </li>
          ))}
          {status === "loading" && (
            <li className="px-3 py-4 text-center text-muted-foreground font-mono text-[11px]">Loading…</li>
          )}
          {status === "ready" && rows.length === 0 && (
            <li className="px-3 py-4 text-center text-muted-foreground font-mono text-[11px]">No matches</li>
          )}
        </ul>
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
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
                <th className="text-center w-8">AI</th>
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
                    <button
                      type="button"
                      onClick={() => open({ address: t.address, symbol: t.symbol, name: t.name, logoUrl: t.logoUrl, bonded: isBonded(t) })}
                      className="flex items-center gap-2 min-w-0 text-left hover:text-pos transition-colors"
                    >
                      <TokenAvatar symbol={t.symbol} size={20} logoUrl={t.logoUrl} />
                      <div className="min-w-0">
                        <div className="truncate">{t.name}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">${t.symbol}</div>
                      </div>
                    </button>
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
                  <td className="text-center">
                    <button
                      onClick={() => setDlg({ open: true, query: t.symbol })}
                      className="text-muted-foreground hover:text-info transition-colors"
                      title="AI deep dive"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {status === "loading" && (
                <tr><td colSpan={16} className="px-3 py-4 text-center text-muted-foreground font-mono text-[11px]">Loading…</td></tr>
              )}
              {status === "ready" && rows.length === 0 && (
                <tr><td colSpan={16} className="px-3 py-4 text-center text-muted-foreground font-mono text-[11px]">No matches</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </PanelBody>
      <TokenDeepDiveDialog
        query={dlg.query}
        open={dlg.open}
        onOpenChange={(o) => setDlg((d) => ({ ...d, open: o }))}
      />
    </Panel>
  );
}
