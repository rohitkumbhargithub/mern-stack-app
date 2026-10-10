import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { 
  Sparkles, Copy, Check, RotateCw, Loader2, CheckCircle2, 
  ListTodo, FileText, ShieldCheck, Bot, Info, CheckSquare, Square
} from "lucide-react";
import { toast } from "sonner";

function parseSummaryContent(rawText) {
  if (!rawText) return { overview: "", decisions: [], actionItems: [], raw: "" };

  const lines = rawText.split("\n");
  let currentSection = "overview";
  const overviewLines = [];
  const decisionLines = [];
  const actionLines = [];

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();

    if (
      lower.includes("action item") ||
      lower.includes("pending task") ||
      lower.includes("next step") ||
      lower.startsWith("### action")
    ) {
      currentSection = "action";
      continue;
    } else if (
      lower.includes("key point") ||
      lower.includes("decision") ||
      lower.includes("conclusion") ||
      lower.startsWith("### decision")
    ) {
      currentSection = "decision";
      continue;
    } else if (
      lower.includes("overview:") ||
      lower.includes("summary:") ||
      lower.startsWith("### summary") ||
      lower.startsWith("### conversation summary")
    ) {
      currentSection = "overview";
      const colonIdx = trimmed.indexOf(":");
      if (colonIdx !== -1 && colonIdx < trimmed.length - 1) {
        overviewLines.push(trimmed.slice(colonIdx + 1).trim());
      }
      continue;
    }

    // Clean bullet markers
    const cleanLine = trimmed.replace(/^[-*•\d.]+\s+/, "").replace(/^\*\*.*?\*\*:\s*/, "");

    if (currentSection === "action") {
      actionLines.push(cleanLine);
    } else if (currentSection === "decision") {
      decisionLines.push(cleanLine);
    } else {
      overviewLines.push(trimmed);
    }
  }

  return {
    overview: overviewLines.join("\n").trim() || rawText,
    decisions: decisionLines,
    actionItems: actionLines,
    raw: rawText
  };
}

export function AISummaryModal({
  open,
  onOpenChange,
  summary,
  onRegenerate,
  isLoading = false
}) {
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'decisions' | 'actions'
  const [copied, setCopied] = useState(false);
  const [checkedItems, setCheckedItems] = useState({});

  const parsed = useMemo(() => parseSummaryContent(summary), [summary]);

  const handleCopy = () => {
    if (!summary) return;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    toast.success("Summary copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleCheck = (idx) => {
    setCheckedItems(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl md:max-w-4xl lg:max-w-5xl w-[95vw] h-[86vh] max-h-[86vh] p-0 gap-0 overflow-hidden flex flex-col md:flex-row rounded-2xl bg-background border border-border shadow-2xl">
        {/* Left Sidebar Navigation */}
        <aside className="w-full md:w-64 lg:w-72 shrink-0 bg-muted/30 md:bg-muted/40 border-b md:border-b-0 md:border-r border-border flex flex-col justify-between">
          <div className="flex flex-col">
            {/* Header */}
            <div className="p-4 md:p-5 border-b border-border/50">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0 shadow-2xs">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground leading-tight">AI Catch-Up</h2>
                  <p className="text-[11px] text-muted-foreground">Smart thread intelligence</p>
                </div>
              </div>
            </div>

            {/* Vertical Tabs */}
            <nav className="p-2 md:p-3 flex md:flex-col gap-1.5 overflow-x-auto md:overflow-x-visible">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`flex-1 md:flex-initial flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all ${
                  activeTab === "all"
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground font-medium"
                }`}
              >
                <div className={`h-8 w-8 rounded-lg grid place-items-center shrink-0 ${
                  activeTab === "all" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                }`}>
                  <FileText className="h-4 w-4" />
                </div>
                <div className="hidden md:block min-w-0">
                  <div className="text-xs font-semibold leading-tight">Full Catch-Up</div>
                  <div className={`text-[10px] truncate ${activeTab === "all" ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                    Comprehensive summary
                  </div>
                </div>
                <span className="md:hidden text-xs font-semibold">Overview</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("decisions")}
                className={`flex-1 md:flex-initial flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all ${
                  activeTab === "decisions"
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground font-medium"
                }`}
              >
                <div className={`h-8 w-8 rounded-lg grid place-items-center shrink-0 ${
                  activeTab === "decisions" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                }`}>
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div className="hidden md:block min-w-0">
                  <div className="text-xs font-semibold leading-tight">Key Decisions</div>
                  <div className={`text-[10px] truncate ${activeTab === "decisions" ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                    Agreed points & topics
                  </div>
                </div>
                <span className="md:hidden text-xs font-semibold">Decisions</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("actions")}
                className={`flex-1 md:flex-initial flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all ${
                  activeTab === "actions"
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground font-medium"
                }`}
              >
                <div className={`h-8 w-8 rounded-lg grid place-items-center shrink-0 ${
                  activeTab === "actions" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                }`}>
                  <ListTodo className="h-4 w-4" />
                </div>
                <div className="hidden md:block min-w-0">
                  <div className="text-xs font-semibold leading-tight">Action Items</div>
                  <div className={`text-[10px] truncate ${activeTab === "actions" ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                    Pending tasks & steps
                  </div>
                </div>
                <span className="md:hidden text-xs font-semibold">Actions</span>
              </button>
            </nav>
          </div>

          {/* Sidebar Bottom AI Info (Desktop only) */}
          <div className="hidden md:block p-3.5 m-3 rounded-xl bg-card border border-border/80 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Bot className="h-4 w-4 text-primary" />
              <span>AI Intelligence Engine</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Synthesized using your configured LLM (Gemini / OpenAI). Messages remain encrypted and confidential.
            </p>
            <div className="pt-1 flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
              <ShieldCheck className="h-3 w-3" /> Encrypted Session
            </div>
          </div>
        </aside>

        {/* Right Content Pane */}
        <section className="flex-1 min-h-0 flex flex-col overflow-hidden bg-background">
          {/* Header */}
          <div className="p-4 md:p-5 pr-12 border-b border-border/60 shrink-0 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                {activeTab === "all" && "Executive Catch-Up Summary"}
                {activeTab === "decisions" && "Key Decisions & Agreements"}
                {activeTab === "actions" && "Action Items & Next Steps"}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activeTab === "all" && "Complete overview of the conversation thread and main discussion topics"}
                {activeTab === "decisions" && "Important conclusions, alignments, and decisions reached in the chat"}
                {activeTab === "actions" && "Follow-ups, tasks, and questions extracted from the thread"}
              </p>
            </div>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-4 scrollbar-thin">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 grid place-items-center text-primary shadow-xs">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-foreground">Analyzing Conversation Thread…</h4>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Reading recent messages, extracting topics, and formatting key decisions and action items.
                  </p>
                </div>
              </div>
            ) : summary ? (
              <div className="space-y-4">
                {/* 1. All Tab (Full Summary Breakdown) */}
                {activeTab === "all" && (
                  <div className="space-y-4">
                    {/* Overview Box */}
                    <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
                        <Sparkles className="h-3.5 w-3.5" /> Thread Overview
                      </div>
                      <div className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap font-sans">
                        {parsed.overview}
                      </div>
                    </div>

                    {/* Key Decisions Preview (if present) */}
                    {parsed.decisions.length > 0 && (
                      <div className="p-4 rounded-2xl border border-border bg-card/60 space-y-2.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Key Decisions ({parsed.decisions.length})
                        </div>
                        <ul className="space-y-2">
                          {parsed.decisions.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2.5 text-xs text-foreground/90">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                              <span className="leading-relaxed">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Action Items Preview (if present) */}
                    {parsed.actionItems.length > 0 && (
                      <div className="p-4 rounded-2xl border border-border bg-card/60 space-y-2.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                          <ListTodo className="h-3.5 w-3.5" /> Action Items ({parsed.actionItems.length})
                        </div>
                        <ul className="space-y-2">
                          {parsed.actionItems.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2.5 text-xs text-foreground/90">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                              <span className="leading-relaxed">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Decisions Tab */}
                {activeTab === "decisions" && (
                  <div className="space-y-3">
                    {parsed.decisions.length > 0 ? (
                      <div className="space-y-2.5">
                        {parsed.decisions.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-start gap-3"
                          >
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                            <div className="text-xs font-medium text-foreground leading-relaxed">
                              {item}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center rounded-2xl border border-border bg-card/40 space-y-2">
                        <Info className="h-6 w-6 text-muted-foreground mx-auto" />
                        <div className="text-xs font-semibold text-foreground">No explicit decisions tagged</div>
                        <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                          Check the Full Catch-Up tab to view the entire conversational overview.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Action Items Tab */}
                {activeTab === "actions" && (
                  <div className="space-y-3">
                    {parsed.actionItems.length > 0 ? (
                      <div className="space-y-2">
                        {parsed.actionItems.map((item, idx) => {
                          const isDone = !!checkedItems[idx];
                          return (
                            <div
                              key={idx}
                              onClick={() => toggleCheck(idx)}
                              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                                isDone
                                  ? "border-border bg-muted/30 opacity-70 line-through text-muted-foreground"
                                  : "border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-foreground"
                              }`}
                            >
                              <div className="shrink-0 mt-0.5 text-amber-500">
                                {isDone ? (
                                  <CheckSquare className="h-4 w-4 text-emerald-500" />
                                ) : (
                                  <Square className="h-4 w-4" />
                                )}
                              </div>
                              <div className="text-xs font-medium leading-relaxed flex-1">
                                {item}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-8 text-center rounded-2xl border border-border bg-card/40 space-y-2">
                        <Info className="h-6 w-6 text-muted-foreground mx-auto" />
                        <div className="text-xs font-semibold text-foreground">No pending action items found</div>
                        <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                          The participants haven't assigned specific tasks or pending questions yet.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                <Sparkles className="h-8 w-8 text-muted-foreground/50" />
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-foreground">No Summary Available Yet</h4>
                  <p className="text-xs text-muted-foreground">
                    Click "Regenerate" below to generate an AI briefing from recent messages.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Sticky Modal Footer */}
          <div className="border-t border-border/70 p-3.5 px-6 bg-card/60 backdrop-blur-xs flex items-center justify-between shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>AI Synthesized Briefing</span>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              {onRegenerate && (
                <button
                  type="button"
                  onClick={onRegenerate}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-background hover:bg-muted text-xs font-semibold text-foreground transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-2xs"
                >
                  <RotateCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                  <span>Regenerate</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleCopy}
                disabled={isLoading || !summary}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? "Copied!" : "Copy Summary"}</span>
              </button>
            </div>
          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
}

export default AISummaryModal;
