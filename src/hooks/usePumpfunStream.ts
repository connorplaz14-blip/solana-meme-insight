import { useEffect, useRef, useState, useCallback } from "react";
import type { Launch } from "@/routes/api/pumpfun/latest";

const WS_URL = "wss://pumpportal.fun/api/data";
const MAX_ROWS = 200;
const RECONNECT_MIN = 1000;
const RECONNECT_MAX = 30000;

type WsCreate = {
  txType?: string;
  signature?: string;
  mint?: string;
  traderPublicKey?: string;
  initialBuy?: number;
  solAmount?: number;
  marketCapSol?: number;
  name?: string;
  symbol?: string;
  uri?: string;
  pool?: string;
};

type WsTrade = {
  txType?: "buy" | "sell";
  mint?: string;
  marketCapSol?: number;
};

export type StreamStatus = "connecting" | "open" | "closed" | "offline";

export function usePumpfunStream(opts: {
  seed: Launch[];
  solPriceUsd?: number;
}) {
  const { seed, solPriceUsd } = opts;
  const [launches, setLaunches] = useState<Launch[]>(seed);
  const [status, setStatus] = useState<StreamStatus>("connecting");
  const [perMin, setPerMin] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef(RECONNECT_MIN);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stoppedRef = useRef(false);
  const recentTsRef = useRef<number[]>([]);
  const solPriceRef = useRef<number | undefined>(solPriceUsd);
  const knownMintsRef = useRef<Set<string>>(new Set(seed.map((s) => s.mint)));

  // Reseed when seed changes (e.g. server returned later)
  useEffect(() => {
    setLaunches((prev) => {
      const seen = new Set(prev.map((p) => p.mint));
      const merged = [...prev];
      for (const s of seed) {
        if (!seen.has(s.mint)) {
          merged.push(s);
          knownMintsRef.current.add(s.mint);
        }
      }
      merged.sort((a, b) => b.createdAt - a.createdAt);
      return merged.slice(0, MAX_ROWS);
    });
  }, [seed]);

  useEffect(() => {
    solPriceRef.current = solPriceUsd;
  }, [solPriceUsd]);

  const connect = useCallback(() => {
    if (stoppedRef.current) return;
    setStatus("connecting");
    let ws: WebSocket;
    try {
      ws = new WebSocket(WS_URL);
    } catch {
      scheduleReconnect();
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("open");
      reconnectRef.current = RECONNECT_MIN;
      try {
        ws.send(JSON.stringify({ method: "subscribeNewToken" }));
      } catch {
        /* ignore */
      }
    };

    ws.onmessage = (ev) => {
      let msg: WsCreate & WsTrade;
      try {
        msg = JSON.parse(typeof ev.data === "string" ? ev.data : "");
      } catch {
        return;
      }
      if (!msg || !msg.mint) return;

      // New token creation
      if (msg.txType === "create") {
        if (knownMintsRef.current.has(msg.mint)) return;
        knownMintsRef.current.add(msg.mint);

        const now = Date.now();
        recentTsRef.current.push(now);
        recentTsRef.current = recentTsRef.current.filter((t) => now - t < 60_000);
        setPerMin(recentTsRef.current.length);

        const mcSol = msg.marketCapSol ?? 0;
        const sol = solPriceRef.current;
        const launch: Launch = {
          mint: msg.mint,
          name: msg.name ?? "—",
          symbol: (msg.symbol ?? "").toUpperCase(),
          dev: msg.traderPublicKey,
          devBuySol: msg.solAmount,
          marketCapSol: mcSol,
          marketCapUsd: sol ? mcSol * sol : undefined,
          createdAt: now,
          source: "ws",
        };
        setLaunches((prev) => {
          const next = [launch, ...prev];
          return next.slice(0, MAX_ROWS);
        });
        // Subscribe to trades for this mint to keep mcap fresh
        try {
          ws.send(
            JSON.stringify({ method: "subscribeTokenTrade", keys: [msg.mint] }),
          );
        } catch {
          /* ignore */
        }
      } else if (msg.txType === "buy" || msg.txType === "sell") {
        const mcSol = msg.marketCapSol;
        if (typeof mcSol !== "number" || !msg.mint) return;
        const sol = solPriceRef.current;
        setLaunches((prev) => {
          const idx = prev.findIndex((p) => p.mint === msg.mint);
          if (idx === -1) return prev;
          const cur = prev[idx];
          if (cur.marketCapSol === mcSol) return prev;
          const updated: Launch = {
            ...cur,
            marketCapSol: mcSol,
            marketCapUsd: sol ? mcSol * sol : cur.marketCapUsd,
          };
          const next = prev.slice();
          next[idx] = updated;
          return next;
        });
      }
    };

    ws.onerror = () => {
      // closing will follow
    };
    ws.onclose = () => {
      setStatus("offline");
      scheduleReconnect();
    };
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (stoppedRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    const delay = reconnectRef.current;
    reconnectRef.current = Math.min(delay * 2, RECONNECT_MAX);
    timerRef.current = setTimeout(connect, delay);
  }, [connect]);

  useEffect(() => {
    stoppedRef.current = false;
    connect();
    return () => {
      stoppedRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          /* ignore */
        }
      }
    };
  }, [connect]);

  return { launches, status, perMin };
}