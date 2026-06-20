import { useEffect } from "react";

/**
 * Dev-only runtime guard. Scans the DOM for elements that exceed the
 * viewport width on mobile and logs them to the console so we can fix
 * the source rather than silently clipping with overflow-x: hidden.
 * No-op in production.
 */
export function OverflowGuard() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!import.meta.env.DEV) return;

    let raf = 0;
    let lastReportedAt = 0;

    const scan = () => {
      const vw = document.documentElement.clientWidth;
      if (vw >= 768) return; // mobile only
      const now = performance.now();
      if (now - lastReportedAt < 1000) return;

      const offenders: { el: Element; w: number }[] = [];
      const all = document.body.querySelectorAll("*");
      for (let i = 0; i < all.length; i++) {
        const el = all[i];
        const rect = el.getBoundingClientRect();
        // ignore iframes and their internals — they scroll internally
        if (el.closest("iframe")) continue;
        if (rect.right > vw + 1) {
          offenders.push({ el, w: Math.round(rect.right - vw) });
        }
      }
      if (offenders.length) {
        lastReportedAt = now;
        // eslint-disable-next-line no-console
        console.warn(
          `[OverflowGuard] ${offenders.length} element(s) overflow viewport (${vw}px):`,
          offenders.slice(0, 8).map((o) => ({ el: o.el, overBy: `${o.w}px` })),
        );
      }
    };

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(scan);
    };

    schedule();
    const ro = new ResizeObserver(schedule);
    ro.observe(document.body);
    window.addEventListener("resize", schedule);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return null;
}