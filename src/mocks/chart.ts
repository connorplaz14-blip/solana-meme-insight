export function generateCandleSeries(points = 96, base = 0.000024) {
  const out: { t: number; price: number; volume: number }[] = [];
  let p = base;
  for (let i = 0; i < points; i++) {
    const drift = (Math.sin(i / 6) + Math.cos(i / 11)) * 0.0005;
    const noise = (Math.random() - 0.5) * 0.0008;
    p = Math.max(base * 0.85, p * (1 + drift + noise));
    out.push({ t: Date.now() - (points - i) * 15 * 60 * 1000, price: p, volume: 200_000 + Math.random() * 800_000 });
  }
  return out;
}
