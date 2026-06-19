import type { WatchlistEntry } from "@/types";
import { seedWatchlist } from "@/mocks/watchlist";

const KEY = "memedesk.watchlist.v1";
const listeners = new Set<() => void>();

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
