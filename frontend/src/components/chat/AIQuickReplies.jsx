import React from "react";
import { Sparkles, X, RotateCw, Loader2 } from "lucide-react";

export const AIQuickReplies = React.memo(function AIQuickReplies({
  suggestions = [],
  onSelectReply,
  onRefresh,
  onDismiss,
  isLoading = false
}) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-primary/5 via-accent/30 to-background border-t border-border animate-in slide-in-from-bottom-2 select-none overflow-x-auto scrollbar-none">
      <div className="flex items-center gap-1 text-[10px] font-semibold text-primary uppercase tracking-wider shrink-0 mr-1">
        <Sparkles className="h-3 w-3 text-primary animate-pulse" />
        <span className="hidden sm:inline">AI Suggested</span>
      </div>

      <div className="flex items-center gap-1.5 flex-1 overflow-x-auto py-0.5">
        {isLoading ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground py-0.5 px-2">
            <Loader2 className="h-3 w-3 animate-spin text-primary" />
            <span className="text-[11px]">Generating suggestions…</span>
          </div>
        ) : (
          suggestions.map((reply, idx) => (
            <button
              key={idx}
              onClick={() => onSelectReply && onSelectReply(reply)}
              className="shrink-0 text-xs px-2.5 py-1 rounded-full bg-card hover:bg-primary hover:text-primary-foreground border border-border/80 shadow-xs transition-all active:scale-95 text-foreground/90 font-medium truncate max-w-[200px]"
              title={`Click to use: "${reply}"`}
            >
              {reply}
            </button>
          ))
        )}
      </div>

      <div className="flex items-center gap-0.5 shrink-0 ml-1">
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1 hover:bg-accent rounded-full text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            title="Refresh suggestions"
          >
            <RotateCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 hover:bg-accent rounded-full text-muted-foreground hover:text-foreground transition-colors"
            title="Dismiss suggestions"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
});

export default AIQuickReplies;
