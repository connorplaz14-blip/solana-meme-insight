export function fmtUsd(n: number, opts: { compact?: boolean; digits?: number } = {}) {
  const { compact = true, digits } = opts;
  if (!isFinite(n)) return "—";
  if (compact && Math.abs(n) >= 1000) {
    return "$" + new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n);
  }
  return "$" + new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits ?? (Math.abs(n) < 1 ? 6 : 2),
    maximumFractionDigits: digits ?? (Math.abs(n) < 1 ? 8 : 2),
  }).format(n);
}
export function fmtNum(n: number, compact = true) {
  if (!isFinite(n)) return "—";
  if (compact && Math.abs(n) >= 1000) {
    return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
  }
  return new Intl.NumberFormat("en-US").format(n);
}
export function fmtPct(n: number, digits = 2) {
  if (!isFinite(n)) return "—";
  const s = n >= 0 ? "+" : "";
  return s + n.toFixed(digits) + "%";
}
export function fmtAge(hours: number) {
  if (!isFinite(hours) || hours < 0) return "—";
  if (hours < 1) {
    const mins = Math.max(1, Math.round(hours * 60));
    return mins + "m";
  }
  if (hours < 24) return Math.round(hours) + "h";
  const d = Math.round(hours / 24);
  if (d < 30) return d + "d";
  const m = Math.round(d / 30);
  if (m < 12) return m + "mo";
  return (d / 365).toFixed(1) + "y";
}
export function shortAddr(a: string, head = 4, tail = 4) {
  if (!a) return "";
  if (a.length <= head + tail + 1) return a;
  return a.slice(0, head) + "…" + a.slice(-tail);
}
export function fmtTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
