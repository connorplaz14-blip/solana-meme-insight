import type { WatchlistEntry } from "@/types";
import { seedWatchlist } from "@/mocks/watchlist";

const KEY = "memedesk.watchlist.v1";
const ALERT_KEY = "memedesk.watchlist.alerts.v1";
const listeners = new Set<() => void>();
const alertListeners = new Set<() => void>();

function read(): WatchlistEntry[] {
  if (typeof window === "undefined") return seedWatchlist;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) {
    window.localStorage.setItem(KEY, JSON.stringify(seedWatchlist));
    return seedWatchlist;
  }
  try { return JSON.parse(raw) as WatchlistEntry[]; } catch { return seedWatchlist; }
}
function write(v: WatchlistEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(v));
  listeners.forEach((l) => l());
}

export function getWatchlist() { return read(); }
export function isWatched(address: string) { return read().some((e) => e.address === address); }
export function addToWatchlist(entry: WatchlistEntry) {
  const cur = read();
  if (cur.some((e) => e.address === entry.address)) return;
  write([entry, ...cur]);
}
export function removeFromWatchlist(address: string) {
  write(read().filter((e) => e.address !== address));
}
export function subscribeWatchlist(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb); }; }

export type PriceAlert = {
  address: string;
  targetUsd: number;
  direction: "above" | "below";
  createdAt: string;
  triggeredAt?: string;
};

function readAlerts(): PriceAlert[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(ALERT_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) as PriceAlert[]; } catch { return []; }
}
function writeAlerts(v: PriceAlert[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ALERT_KEY, JSON.stringify(v));
  alertListeners.forEach((l) => l());
}
export function getAlerts() { return readAlerts(); }
export function getAlert(address: string) { return readAlerts().find((a) => a.address === address); }
export function setAlert(alert: PriceAlert) {
  const cur = readAlerts().filter((a) => a.address !== alert.address);
  writeAlerts([alert, ...cur]);
}
export function clearAlert(address: string) {
  writeAlerts(readAlerts().filter((a) => a.address !== address));
}
export function markAlertTriggered(address: string) {
  const cur = readAlerts();
  const idx = cur.findIndex((a) => a.address === address);
  if (idx === -1) return;
  cur[idx] = { ...cur[idx], triggeredAt: new Date().toISOString() };
  writeAlerts(cur);
}
export function subscribeAlerts(cb: () => void) { alertListeners.add(cb); return () => { alertListeners.delete(cb); }; }
