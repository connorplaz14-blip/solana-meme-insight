import { useState } from "react";
import { Panel, PanelHeader, PanelBody } from "@/components/terminal/Panel";
import { StatCell } from "@/components/terminal/StatCell";
import { useWalletPnL } from "@/lib/data";
import { fmtUsd, fmtPct } from "@/lib/format";
import { ChangeCell } from "@/components/terminal/ChangeCell";
import { CopyAddress } from "@/components/terminal/CopyAddress";
import { SourceBadge } from "@/components/terminal/SourceBadge";
import { Info, KeyRound, AlertTriangle } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function WalletView() {
  const [addr, setAddr] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const { data: response, status } = useWalletPnL(submitted);
  const data = response && response.kind === "ok" ? response.data : null;
  const notice = response && response.kind === "notice" ? response.notice : null;

  return (
    <div className="space-y-3">
      <Panel>
        <PanelHeader title="Wallet Lookup" accent="info" />
        <PanelBody>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(addr.trim());
            }}
          >
            <input
              value={addr}
              onChange={(e) => setAddr(e.target.value)}
              placeholder="Solana wallet address (32–44 chars)"
              className="flex-1 bg-panel-2 border border-border px-2 py-1.5 font-mono text-[12px] outline-none focus:border-info"
            />
            <button
              type="submit"
              disabled={!addr.trim()}
              className="border border-info/40 bg-info/10 hover:bg-info/20 text-info font-mono text-[11px] uppercase tracking-wider px-4"
            >
              Analyse
            </button>
          </form>
          <div className="mt-2 text-[10px] text-muted-foreground font-mono flex items-center gap-1.5">
            <Info className="h-3 w-3" />
            Live portfolio via Birdeye for valid Solana addresses. Realised P&L needs trade history (not wired yet) — shown as 0; unrealised is 24h price-change inferred.
          </div>
        </PanelBody>
      </Panel>

      {submitted && status === "loading" && (
        <Panel><PanelBody><p className="text-[12px] text-muted-foreground text-center py-6 font-mono">Loading wallet…</p></PanelBody></Panel>
      )}

      {notice && (
        <Panel>
          <PanelHeader
            title={
              notice.kind === "missing-key"
                ? "Wallet P&L not configured"
                : notice.kind === "invalid-address"
                  ? "Invalid Solana address"
                  : "Birdeye request failed"
            }
            accent={notice.kind === "error" ? "neg" : "warn"}
            right={<SourceBadge source="birdeye" />}
          />
          <PanelBody>
            <div className="flex flex-col items-start gap-3">
              <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-warn">
                {notice.kind === "error" ? <AlertTriangle className="h-3.5 w-3.5 text-neg" /> : <KeyRound className="h-3.5 w-3.5" />}
                {notice.kind === "missing-key" ? "Needs API key" : notice.kind === "invalid-address" ? "Bad input" : "Upstream error"}
              </div>
              <p className="text-[12px] text-foreground/80">{notice.message}</p>
              {notice.kind === "missing-key" && (
                <Link
                  to="/settings"
                  className="font-mono text-[10px] uppercase tracking-wider border border-warn/40 bg-warn/10 hover:bg-warn/20 text-warn px-2 py-[3px]"
                >
                  Open settings →
                </Link>
              )}
            </div>
          </PanelBody>
        </Panel>
      )}

      {data && (
        <>
          <Panel>
            <PanelHeader
              title="Wallet Score"
              subtitle={data.address}
              accent="pos"
              right={
                <div className="flex items-center gap-2">
                  <SourceBadge source="birdeye" />
                  <span className="font-mono text-pos text-base">{data.score}/100</span>
                </div>
              }
            />
            <PanelBody>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCell label="Realised P&L" value={fmtUsd(data.realisedUsd)} tone={data.realisedUsd >= 0 ? "pos" : "neg"} />
                <StatCell label="Unrealised P&L" value={fmtUsd(data.unrealisedUsd)} tone={data.unrealisedUsd >= 0 ? "pos" : "neg"} />
                <StatCell label="ROI (24h)" value={fmtPct(data.roiPct)} tone={data.roiPct >= 0 ? "pos" : "neg"} />
                <StatCell label="Win rate" value={`${data.winRatePct}%`} />
                <StatCell label="Avg hold" value={`${data.avgHoldHours}h`} />
                <StatCell label="Best trade" value={`${data.bestTrade.symbol} ${fmtPct(data.bestTrade.roiPct)}`} tone="pos" sub={fmtUsd(data.bestTrade.pnlUsd)} />
                <StatCell label="Worst trade" value={`${data.worstTrade.symbol} ${fmtPct(data.worstTrade.roiPct)}`} tone="neg" sub={fmtUsd(data.worstTrade.pnlUsd)} />
                <StatCell label="Positions" value={data.positions.length.toString()} />
              </div>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader title="Token-level P&L" subtitle={`${data.positions.length} positions`} />
            <PanelBody className="p-0">
              {/* Mobile card list */}
              <ul className="md:hidden divide-y divide-border">
                {data.positions.map((p) => (
                  <li key={p.address || p.symbol} className="px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-[12px]">{p.name}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">${p.symbol}</div>
                      </div>
                      <span className={`font-mono text-[10px] uppercase tracking-wider px-1.5 py-[1px] border shrink-0 ${p.status === "open" ? "border-info/40 text-info bg-info/10" : "border-border text-muted-foreground bg-panel-2"}`}>
                        {p.status}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 font-mono text-[11px]">
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Cost</div>
                        <div>{fmtUsd(p.costUsd)}</div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Value</div>
                        <div>{fmtUsd(p.valueUsd)}</div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-muted-foreground">P&L</div>
                        <div className={p.pnlUsd >= 0 ? "text-pos" : "text-neg"}>{fmtUsd(p.pnlUsd)}</div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-muted-foreground">ROI 24h</div>
                        <div><ChangeCell value={p.roiPct} /></div>
                      </div>
                    </div>
                    <div className="mt-1.5"><CopyAddress address={p.address} /></div>
                  </li>
                ))}
              </ul>
              {/* Desktop table */}
              <table className="hidden md:table w-full text-[12px]">
                <thead className="bg-panel-2/60 border-b border-border">
                  <tr className="[&>th]:px-2 [&>th]:py-1.5 [&>th]:font-normal [&>th]:text-[10px] [&>th]:uppercase [&>th]:tracking-wider [&>th]:text-muted-foreground">
                    <th className="text-left">Token</th>
                    <th className="text-left">Contract</th>
                    <th className="text-right">Cost</th>
                    <th className="text-right">Value</th>
                    <th className="text-right">P&L</th>
                    <th className="text-right">ROI (24h)</th>
                    <th className="text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.positions.map((p) => (
                    <tr key={p.address || p.symbol} className="border-b border-border/50 [&>td]:px-2 [&>td]:py-1.5">
                      <td>
                        <div>{p.name}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">${p.symbol}</div>
                      </td>
                      <td><CopyAddress address={p.address} /></td>
                      <td className="text-right font-mono">{fmtUsd(p.costUsd)}</td>
                      <td className="text-right font-mono">{fmtUsd(p.valueUsd)}</td>
                      <td className={`text-right font-mono ${p.pnlUsd >= 0 ? "text-pos" : "text-neg"}`}>{fmtUsd(p.pnlUsd)}</td>
                      <td className="text-right"><ChangeCell value={p.roiPct} /></td>
                      <td>
                        <span className={`font-mono text-[10px] uppercase tracking-wider px-1.5 py-[1px] border ${p.status === "open" ? "border-info/40 text-info bg-info/10" : "border-border text-muted-foreground bg-panel-2"}`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </PanelBody>
          </Panel>
        </>
      )}

      {!submitted && (
        <Panel>
          <PanelBody>
            <p className="text-[12px] text-muted-foreground text-center py-6 font-mono">
              Enter a Solana wallet address above to see its current portfolio + 24h P&L.
            </p>
          </PanelBody>
        </Panel>
      )}
    </div>
  );
}