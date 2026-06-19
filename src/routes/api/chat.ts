import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

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

        let snapshotJson = "{}";
        try {
          const snap = await buildMarketSnapshot();
          snapshotJson = JSON.stringify(snap);
        } catch (e) {
          console.error("snapshot failed", e);
        }

        const system = [
          "You are MemeDesk AI, a Solana memecoin trading-desk analyst.",
          "You only reason from the JSON market snapshot below. NEVER invent",
          "tokens, prices, market caps, or % moves not present in the snapshot.",
          "When the user asks 'what's the meta', summarise the dominant theme +",
          "the fastest-growing sub-narrative and cite 2-3 leading tokens by symbol.",
          "When asked about a token, find it in the snapshot by symbol or address.",
          "If it's missing, say it isn't in today's trending feed instead of guessing.",
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
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
        });
      },
    },
  },
});