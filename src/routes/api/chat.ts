import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, stepCountIs, type UIMessage } from "ai";

type ChatRequestBody = { messages?: unknown };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = (await request.json()) as ChatRequestBody;
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        }

        const { createLovableAiGatewayProvider } = await import(
          "@/lib/data/providers/gateway.server"
        );
        const { buildMarketSnapshot } = await import("@/lib/ai/snapshot.server");
        const { buildSCBOLTools } = await import("@/lib/ai/tools.server");

        let snapshotJson = "{}";
        try {
          const snap = await buildMarketSnapshot();
          snapshotJson = JSON.stringify(snap);
        } catch (e) {
          console.error("snapshot failed", e);
        }

        const system = [
          "You are SCBOL AI, a Solana memecoin trading-desk analyst.",
          "Reason from the JSON market snapshot below plus tool results. NEVER",
          "invent tokens, prices, market caps, % moves, tweets, or headlines.",
          "Prefer calling tools for specific tokens, KOLs, or recent events:",
          "  - lookup_token: any ticker/mint not in the snapshot",
          "  - get_token_tweets: what people are saying about $TICKER",
          "  - get_kol_take: what a specific handle (Ansem, Murad, etc.) thinks",
          "  - search_news: breaking headlines on a topic",
          "Cite sources inline: tweets as @handle, news as (Source).",
          "When the user asks 'what's the meta', summarise the dominant theme +",
          "the fastest-growing sub-narrative and cite 2-3 leading tokens by symbol.",
          "When asked about a token, first check the snapshot; if missing, call",
          "lookup_token before answering. If still nothing, say so plainly.",
          "Keep replies tight, like a desk note. Use markdown lists/tables when useful.",
          "Never give buy/sell advice or price predictions. Analytics only.",
          "",
          "=== MARKET SNAPSHOT (JSON) ===",
          snapshotJson,
          "=== END SNAPSHOT ===",
        ].join("\n");

        const gateway = createLovableAiGatewayProvider(key);
        const result = streamText({
          model: gateway("google/gemini-3-flash-preview"),
          system,
          messages: await convertToModelMessages(messages as UIMessage[]),
          tools: buildSCBOLTools(),
          stopWhen: stepCountIs(6),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
        });
      },
    },
  },
});