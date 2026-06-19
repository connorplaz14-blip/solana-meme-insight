import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { MarketBar } from "@/components/dashboard/MarketBar";
import { SideNav } from "@/components/layout/SideNav";
import { TokenDetailProvider } from "@/components/token/TokenDetailProvider";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center font-mono">
        <h1 className="text-6xl font-bold text-pos">404</h1>
        <h2 className="mt-3 text-base uppercase tracking-[0.18em] text-foreground">Route not found</h2>
        <p className="mt-2 text-xs text-muted-foreground">The terminal path you requested doesn't exist.</p>
        <div className="mt-5">
          <Link to="/dashboard" className="inline-flex items-center justify-center border border-pos/40 bg-pos/10 text-pos px-3 py-1.5 text-xs uppercase tracking-wider hover:bg-pos/20">
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center font-mono">
        <h1 className="text-base uppercase tracking-[0.18em] text-neg">Runtime error</h1>
        <p className="mt-2 text-xs text-muted-foreground">{error.message || "Something went wrong."}</p>
        <div className="mt-4 flex justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }}
            className="border border-info/40 bg-info/10 text-info px-3 py-1.5 text-xs uppercase tracking-wider hover:bg-info/20">
            Retry
          </button>
          <a href="/dashboard" className="border border-border bg-panel-2 text-foreground px-3 py-1.5 text-xs uppercase tracking-wider hover:bg-accent">
            Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "MemeDesk · Solana Memecoin Terminal" },
      { name: "description", content: "MemeDesk is a financial-terminal-style intelligence dashboard for Solana memecoins: trending tokens, daily AI narratives, market pulse, watchlist, and wallet P&L." },
      { name: "author", content: "MemeDesk" },
      { name: "theme-color", content: "#0c0c0c" },
      { property: "og:title", content: "MemeDesk · Solana Memecoin Terminal" },
      { property: "og:description", content: "Financial-terminal-style intelligence dashboard for Solana memecoins." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <TokenDetailProvider>
        <div className="min-h-screen flex flex-col bg-background text-foreground">
          <MarketBar />
          <div className="flex flex-1 min-h-0">
            <SideNav />
            <main className="flex-1 min-w-0 overflow-auto">
              <Outlet />
            </main>
          </div>
        </div>
      </TokenDetailProvider>
    </QueryClientProvider>
  );
}
