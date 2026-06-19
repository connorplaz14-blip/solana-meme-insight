import { useState } from "react";
import { Panel, PanelHeader, PanelBody } from "@/components/terminal/Panel";
import { useTokenChart, useMemeOfTheDay } from "@/lib/data";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Bar, BarChart } from "recharts";
import { fmtUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

const TIMEFRAMES = ["5m", "15m", "1h", "4h", "24h"] as const;
type TF = typeof TIMEFRAMES[number];
const tfPoints: Record<TF, number> = { "5m": 60, "15m": 96, "1h": 72, "4h": 60, "24h": 30 };

export function TokenChartPanel() {
  const { data: mod } = useMemeOfTheDay();
  const [tf, setTf] = useState<TF>("15m");
  const { data, status } = useTokenChart(mod?.address ?? "", tfPoints[tf]);

  return (
    <Panel>
      <PanelHeader
        title="Token Chart"
        subtitle={mod ? `${mod.symbol} · ${mod.name}` : ""}
        accent="info"
        right={
          <div className="flex border border-border bg-panel-2">
            {TIMEFRAMES.map((t) => (
              <button key={t} onClick={() => setTf(t)}
                className={cn("px-2 py-0.5 font-mono text-[10px] uppercase",
                  tf === t ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground")}>{t}</button>
            ))}
          </div>
        }
      />
      <PanelBody className="p-0">
        {status === "loading" || !data ? (
          <div className="h-72 flex items-center justify-center text-muted-foreground font-mono text-[11px]">Loading chart…</div>
        ) : data.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center text-muted-foreground font-mono text-[11px]">
            <div className="text-warn mb-1">Chart unavailable</div>
            <div>No data for this timeframe.</div>
          </div>
        ) : (
          <div className="grid grid-rows-[1fr_auto]">
            <div className="h-56 px-2 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-pos)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--color-pos)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--color-grid-line)" strokeDasharray="2 4" />
                  <XAxis dataKey="t" tickFormatter={(t) => new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    stroke="var(--color-muted-foreground)" fontSize={10} tickLine={false} axisLine={{ stroke: "var(--color-border)" }} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={10} tickLine={false} axisLine={{ stroke: "var(--color-border)" }}
                    tickFormatter={(v) => fmtUsd(v, { compact: false, digits: 6 })} width={70} />
                  <Tooltip contentStyle={{ background: "var(--color-panel-2)", border: "1px solid var(--color-border)", fontSize: 11, fontFamily: "var(--font-mono)" }}
                    labelFormatter={(t) => new Date(t as number).toLocaleString()}
                    formatter={(v: number) => [fmtUsd(v, { compact: false, digits: 8 }), "Price"]} />
                  <Area type="monotone" dataKey="price" stroke="var(--color-pos)" strokeWidth={1.5} fill="url(#g1)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="h-16 px-2 pb-2 border-t border-border">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <Bar dataKey="volume" fill="var(--color-info)" opacity={0.55} />
                  <XAxis dataKey="t" hide />
                  <YAxis hide />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </PanelBody>
    </Panel>
  );
}
