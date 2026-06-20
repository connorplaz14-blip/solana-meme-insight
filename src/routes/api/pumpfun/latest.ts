import { createFileRoute } from "@tanstack/react-router";
import { fetchPumpfunSeed } from "@/lib/pumpfun/seed.server";
export type { Launch } from "@/lib/pumpfun/seed.server";

export const Route = createFileRoute("/api/pumpfun/latest")({
  server: {
    handlers: {
      GET: async () => {
        const data = await fetchPumpfunSeed();
        return Response.json(data, {
          headers: { "cache-control": "public, max-age=5" },
        });
      },
    },
  },
});