import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Sparkles } from "lucide-react";
import { TokenDeepDive } from "./TokenDeepDive";

export function TokenDeepDiveDialog({
  query,
  open,
  onOpenChange,
}: {
  query: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-border bg-panel p-0">
        <VisuallyHidden>
          <DialogTitle>AI deep dive: {query}</DialogTitle>
          <DialogDescription>AI-generated token analysis</DialogDescription>
        </VisuallyHidden>
        <div className="border-b border-border px-3 py-2 flex items-center gap-2 bg-info/[0.04]">
          <Sparkles className="h-3.5 w-3.5 text-info" />
          <span className="font-mono text-[11px] uppercase tracking-wider text-info">
            AI Deep Dive
          </span>
          <span className="font-mono text-[11px] text-muted-foreground ml-auto">
            ${query}
          </span>
        </div>
        <TokenDeepDive query={query} />
      </DialogContent>
    </Dialog>
  );
}