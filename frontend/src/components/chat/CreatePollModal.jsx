import React, { useState } from 'react';
import {
  Dialog, DialogContent,
} from '@/components/ui/dialog';
import { BarChart2, Plus, Trash2, CheckCircle2, Sparkles, Send, HelpCircle, Check, Vote } from 'lucide-react';
import { toast } from 'sonner';
import { saveCachedPoll } from '@/utils/pollCache';

export function CreatePollModal({ open, onOpenChange, onCreatePoll }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAddOption = () => {
    if (options.length >= 8) {
      return toast.info("Maximum 8 options allowed per poll.");
    }
    setOptions([...options, ""]);
  };

  const handleRemoveOption = (index) => {
    if (options.length <= 2) {
      return toast.error("A poll must have at least 2 options.");
    }
    setOptions(options.filter((_, idx) => idx !== index));
  };

  const handleOptionChange = (index, value) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) {
      return toast.error("Please enter a question for your poll.");
    }

    const cleanOptions = options.map(o => o.trim()).filter(Boolean);
    if (cleanOptions.length < 2) {
      return toast.error("Please enter at least 2 non-empty options.");
    }

    setLoading(true);
    try {
      const pollPayload = {
        question: question.trim(),
        options: cleanOptions.map((text, idx) => ({
          id: `opt-${Date.now()}-${idx}`,
          text,
          votes: []
        })),
        allowMultiple
      };

      saveCachedPoll(pollPayload.question, pollPayload);
      await onCreatePoll(pollPayload);
      // Reset form
      setQuestion("");
      setOptions(["", ""]);
      setAllowMultiple(false);
      onOpenChange(false);
    } catch (err) {
      toast.error(err.message || "Failed to create poll");
    } finally {
      setLoading(false);
    }
  };

  const validOptionsCount = options.filter(o => o.trim()).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl md:max-w-4xl lg:max-w-5xl w-[95vw] h-[88vh] md:h-[86vh] max-h-[88vh] p-0 gap-0 overflow-hidden flex flex-col md:flex-row rounded-2xl bg-background border border-border shadow-2xl transition-all duration-300">
        {/* Left Sidebar: Info & Live Poll Preview */}
        <aside className="w-full md:w-72 lg:w-80 shrink-0 bg-muted/30 md:bg-muted/40 border-b md:border-b-0 md:border-r border-border p-4 md:p-6 flex flex-col justify-between overflow-y-auto scrollbar-thin max-h-[42vh] md:max-h-none">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2.5 pb-3 border-b border-border/50">
              <div className="h-9 w-9 rounded-xl bg-sky-500/10 text-sky-500 grid place-items-center shrink-0 shadow-2xs">
                <BarChart2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-foreground leading-tight">Create a Poll</h2>
                <p className="text-[11px] text-muted-foreground">Live interactive voting</p>
              </div>
            </div>

            {/* Live Poll Preview Card */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Vote className="h-3.5 w-3.5 text-sky-500" />
                Live Chat Preview
              </span>

              <div className="p-4 rounded-2xl border border-sky-500/20 bg-card/60 shadow-md space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-sky-500 uppercase tracking-wider">
                    POLL
                  </span>
                  {allowMultiple && (
                    <span className="text-[9px] bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full border border-primary/20">
                      Multi-choice
                    </span>
                  )}
                </div>

                <div className="text-xs font-bold text-foreground line-clamp-2 leading-snug">
                  {question.trim() || "What question would you like to ask?"}
                </div>

                {/* Option preview items */}
                <div className="space-y-1.5 pt-1">
                  {options.slice(0, 4).map((opt, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-3 py-1.5 rounded-xl border border-border/60 bg-muted/30 text-xs"
                    >
                      <span className="text-muted-foreground truncate font-medium">
                        {opt.trim() || `Option ${idx + 1}`}
                      </span>
                      <span className="text-[10px] text-muted-foreground/60 shrink-0 ml-2">0%</span>
                    </div>
                  ))}
                  {options.length > 4 && (
                    <div className="text-[10px] text-muted-foreground text-center pt-0.5">
                      +{options.length - 4} more options...
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>0 votes</span>
                  <span className="italic">Tap to vote</span>
                </div>
              </div>
            </div>

            {/* Guidelines Card */}
            <div className="p-3.5 rounded-xl bg-muted/20 border border-border/50 space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5 font-bold text-foreground text-[11px]">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Instant Voting
              </div>
              <p className="text-[11px] leading-relaxed">
                Participants can cast votes directly in the chat with real-time percentage graphs.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-border/50 text-[11px] text-muted-foreground">
            {validOptionsCount >= 2 ? (
              <span className="text-emerald-500 font-semibold flex items-center gap-1">
                <Check className="h-3 w-3" /> Ready to publish ({validOptionsCount} choices)
              </span>
            ) : (
              <span>Add at least 2 options to create</span>
            )}
          </div>
        </aside>

        {/* Right Content Pane: Form */}
        <section className="flex-1 min-h-0 flex flex-col overflow-hidden bg-background">
          <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 md:p-5 pr-12 border-b border-border/60 shrink-0">
              <h3 className="text-base font-bold text-foreground">Poll Details & Choices</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Formulate your question and configure choices for chat members to vote on
              </p>
            </div>

            {/* Form Fields */}
            <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-5 scrollbar-thin">
              {/* Question Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
                  Question
                </label>
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g. Which design direction should we take for the launch?"
                  className="w-full px-4 py-2.5 text-xs rounded-xl border border-border bg-muted/20 text-foreground font-semibold focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/50 placeholder:font-normal"
                  maxLength={150}
                  required
                />
              </div>

              {/* Options Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Poll Options ({options.length}/8)
                  </label>
                  <span className="text-[10px] text-muted-foreground">Min 2, Max 8 options</span>
                </div>

                <div className="space-y-2">
                  {options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2 group">
                      <div className="h-7 w-7 rounded-lg bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold shrink-0">
                        {idx + 1}
                      </div>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                        placeholder={`Option ${idx + 1}`}
                        className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-border bg-background text-foreground font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/50"
                        maxLength={80}
                        required
                      />
                      {options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(idx)}
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                          title="Remove option"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {options.length < 8 && (
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="w-full py-2.5 text-xs font-bold text-primary hover:bg-primary/10 border border-dashed border-primary/30 rounded-xl flex items-center justify-center gap-2 transition-all mt-2 active:scale-98 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Another Option</span>
                  </button>
                )}
              </div>

              {/* Voting Settings */}
              <div className="p-4 rounded-2xl border border-border bg-card/60 shadow-2xs space-y-2">
                <label className="flex items-center justify-between cursor-pointer select-none">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-foreground">Allow Multiple Choices</span>
                    <p className="text-[11px] text-muted-foreground">
                      Let participants select more than one answer in this poll.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowMultiple}
                    onChange={(e) => setAllowMultiple(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer accent-sky-500"
                  />
                </label>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="border-t border-border/70 p-3.5 px-6 bg-card/60 backdrop-blur-xs flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-border hover:bg-muted text-foreground transition-all duration-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !question.trim() || validOptionsCount < 2}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all shadow-md shadow-primary/20 active:scale-95 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{loading ? "Posting Poll..." : "Send Poll"}</span>
              </button>
            </div>
          </form>
        </section>
      </DialogContent>
    </Dialog>
  );
}

export default CreatePollModal;
