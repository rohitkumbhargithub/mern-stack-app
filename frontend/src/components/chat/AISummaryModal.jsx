import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Sparkles, Copy, Check, RotateCw, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function AISummaryModal({
  open,
  onOpenChange,
  summary,
  onRegenerate,
  isLoading = false
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!summary) return;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    toast.success("Summary copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[94vw] max-h-[90dvh] overflow-y-auto bg-card border-border shadow-2xl p-5 sm:p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">AI Conversation Catch-Up</DialogTitle>
              <DialogDescription className="text-xs">
                Smart summary of recent messages & discussion highlights.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium text-foreground">Analyzing conversation thread…</p>
              <p className="text-xs text-muted-foreground">Extracting key topics, decisions, and action items</p>
            </div>
          ) : summary ? (
            <div className="rounded-xl bg-muted/40 border border-border/80 p-4 max-h-[380px] overflow-y-auto text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed font-sans scrollbar-thin">
              {summary}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-muted-foreground italic">
              No summary generated yet.
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border/60 pt-3 mt-1">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500"></span>
            Smart AI Assistant
          </div>

          <div className="flex items-center gap-2">
            {onRegenerate && (
              <button
                type="button"
                onClick={onRegenerate}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-accent text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                <RotateCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                Regenerate
              </button>
            )}

            <button
              type="button"
              onClick={handleCopy}
              disabled={isLoading || !summary}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-xs active:scale-95 disabled:opacity-50"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy Summary"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AISummaryModal;
