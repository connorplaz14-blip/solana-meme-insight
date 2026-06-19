import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { shortAddr } from "@/lib/format";

export function CopyAddress({ address, full = false }: { address: string; full?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(address);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground hover:text-foreground transition-colors"
      title={address}
    >
      <span>{full ? address : shortAddr(address)}</span>
      {copied ? <Check className="h-3 w-3 text-pos" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}
