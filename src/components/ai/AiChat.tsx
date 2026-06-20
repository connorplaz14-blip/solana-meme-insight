import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Panel, PanelHeader, PanelBody } from "@/components/terminal/Panel";
import { Sparkles, Send, RotateCcw, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

const transport = new DefaultChatTransport({ api: "/api/chat" });

const SUGGESTIONS = [
  "What's the meta of the day?",
  "Which sub-narrative is growing fastest?",
  "Show me the leading dog coin right now",
  "Any risky launches I should know about?",
];

export function AiChat() {
  const [chatId, setChatId] = useState(() => crypto.randomUUID());
  const { messages, sendMessage, status, error, stop } = useChat({
    id: chatId,
    transport,
  });
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    inputRef.current?.focus();
  }, [chatId]);

  useEffect(() => {
    if (!busy) inputRef.current?.focus();
  }, [busy]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setInput("");
    await sendMessage({ text: trimmed });
  }

  function resetChat() {
    stop();
    setChatId(crypto.randomUUID());
  }

  return (
    <Panel className="flex flex-col h-[calc(100vh-7rem)] md:h-[78vh]">
      <PanelHeader
        title="AI Desk · Chat"
        subtitle="Gemini 3 flash · live trending + PF context"
        accent="info"
        right={
          <button
            onClick={resetChat}
            className="inline-flex items-center gap-1 border border-border bg-panel-2 hover:bg-accent px-2 py-[2px] font-mono text-[10px] uppercase tracking-wider"
            title="New conversation"
          >
            <RotateCcw className="h-3 w-3" /> New
          </button>
        }
      />
      <PanelBody className="flex-1 min-h-0 p-0 flex flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
          {messages.length === 0 && (
            <div className="text-[12px] text-muted-foreground font-mono space-y-3">
              <div className="flex items-center gap-2 text-info">
                <Sparkles className="h-3.5 w-3.5" />
                Ask anything about today&apos;s Solana memecoin meta.
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => submit(s)}
                    className="border border-border bg-panel-2 hover:bg-accent px-2 py-1 text-left"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
          {status === "submitted" && (
            <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-info animate-pulse" />
              Thinking…
            </div>
          )}
          {error && (
            <div className="text-[11px] font-mono text-neg border-l-2 border-neg/40 pl-2">
              {error.message || "Chat error"}
            </div>
          )}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit(input);
          }}
          className="border-t border-border bg-panel-2/40 px-2 py-2 flex items-end gap-2"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit(input);
              }
            }}
            rows={1}
            placeholder="Ask about today's meta…"
            className="flex-1 resize-none bg-panel border border-border px-2 py-1.5 font-mono text-[12px] outline-none focus:border-info max-h-32"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="inline-flex items-center justify-center border border-info/40 bg-info/10 hover:bg-info/20 text-info h-8 w-8 disabled:opacity-40"
            title="Send"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      </PanelBody>
    </Panel>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const text = message.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("");
  const toolCalls = message.parts
    .filter(
      (p): p is { type: string; toolName?: string; state?: string } & Record<string, unknown> =>
        typeof (p as { type?: unknown }).type === "string" &&
        ((p as { type: string }).type.startsWith("tool-") ||
          (p as { type: string }).type === "tool-call"),
    )
    .map((p) => {
      const t = (p as { type: string }).type;
      const name =
        (p as { toolName?: string }).toolName ??
        (t.startsWith("tool-") ? t.slice(5) : t);
      return name;
    })
    .filter((n, i, a) => a.indexOf(n) === i);
  const isUser = message.role === "user";
  return (
    <div className={cn("flex flex-col gap-1", isUser ? "items-end" : "items-start")}>
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
        {isUser ? "You" : "SCBOL AI"}
      </div>
      {!isUser && toolCalls.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {toolCalls.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1 border border-info/30 bg-info/5 text-info px-1.5 py-[1px] font-mono text-[9px] uppercase tracking-wider"
            >
              <Wrench className="h-2.5 w-2.5" />
              {name}
            </span>
          ))}
        </div>
      )}
      <div
        className={cn(
          "max-w-[88%] text-[12px] leading-relaxed",
          isUser
            ? "border border-info/30 bg-info/10 text-foreground px-2.5 py-1.5"
            : "text-foreground/90",
        )}
      >
        {isUser ? (
          <span className="whitespace-pre-wrap font-mono">{text}</span>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-table:my-2 prose-headings:my-2">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{text || "…"}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}