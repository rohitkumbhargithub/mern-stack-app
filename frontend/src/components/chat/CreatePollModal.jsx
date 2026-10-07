import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { BarChart2, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[94vw] bg-card border-border p-5 sm:p-6 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-sky-500/10 text-sky-500">
              <BarChart2 className="h-4 w-4" />
            </span>
            Create a Poll
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Ask a question and let everyone vote directly inside the chat.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 my-2">
          {/* Question Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Question
            </label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. What time should we meet today?"
              className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/50"
              maxLength={150}
              required
            />
          </div>

          {/* Options */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex justify-between">
              <span>Options</span>
              <span className="text-[10px] text-muted-foreground">{options.length}/8</span>
            </label>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground w-4 text-center shrink-0">
                    {idx + 1}.
                  </span>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                    className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/50"
                    maxLength={80}
                    required
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
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
                className="w-full py-2 text-xs font-semibold text-primary hover:bg-primary/10 border border-dashed border-primary/30 rounded-lg flex items-center justify-center gap-1.5 transition-all mt-1"
              >
                <Plus className="h-3.5 w-3.5" /> Add Option
              </button>
            )}
          </div>

          {/* Settings */}
          <div className="pt-2 border-t border-border/60">
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-foreground select-none">
              <input
                type="checkbox"
                checked={allowMultiple}
                onChange={(e) => setAllowMultiple(e.target.checked)}
                className="rounded border-input text-primary focus:ring-primary h-4 w-4 cursor-pointer"
              />
              <span>Allow multiple choices</span>
            </label>
          </div>

          <DialogFooter className="pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50 flex items-center gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {loading ? "Creating…" : "Send Poll"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CreatePollModal;
