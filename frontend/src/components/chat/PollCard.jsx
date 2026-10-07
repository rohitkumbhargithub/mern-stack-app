import React, { useState } from 'react';
import { BarChart2, CheckCircle2, Circle, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export function PollCard({ msg, meId }) {
  const poll = msg?.poll;
  const [votingId, setVotingId] = useState(null);

  if (!poll || !Array.isArray(poll.options)) return null;

  // Calculate total votes across all options
  const totalVotes = poll.options.reduce((acc, opt) => acc + (opt.votes?.length || 0), 0);

  const handleVote = async (optionId) => {
    if (!msg._id || votingId) return;

    setVotingId(optionId);
    try {
      await api.post(`/api/messages/vote/${msg._id}`, { optionId });
    } catch (err) {
      toast.error(err.message || "Failed to submit vote");
    } finally {
      setVotingId(null);
    }
  };

  return (
    <div className="w-full max-w-[340px] sm:max-w-[380px] my-1 rounded-2xl bg-card/90 dark:bg-card/90 border border-border/80 shadow-md p-3.5 sm:p-4 text-foreground select-none">
      {/* Poll Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-lg bg-sky-500/10 text-sky-500 shrink-0">
            <BarChart2 className="h-3.5 w-3.5" />
          </span>
          <span className="text-[10px] font-bold tracking-wider uppercase text-sky-500 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
            POLL
          </span>
          {poll.allowMultiple && (
            <span className="text-[9px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
              Multiple Choice
            </span>
          )}
        </div>
      </div>

      {/* Question */}
      <h4 className="text-sm font-bold text-foreground mb-3 leading-snug">
        {poll.question}
      </h4>

      {/* Options List */}
      <div className="space-y-2">
        {poll.options.map((option) => {
          const votesCount = option.votes?.length || 0;
          const percentage = totalVotes > 0 ? Math.round((votesCount / totalVotes) * 100) : 0;
          const hasVoted = option.votes?.some(v => String(v._id || v) === String(meId));
          const isVotingThis = votingId === option.id;

          return (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={Boolean(votingId)}
              className={`relative w-full text-left p-2.5 rounded-xl border transition-all overflow-hidden group cursor-pointer ${
                hasVoted
                  ? "border-sky-500/60 bg-sky-500/5 shadow-xs"
                  : "border-border/70 hover:border-border hover:bg-accent/40"
              }`}
            >
              {/* Progress Bar Background */}
              <div
                className={`absolute inset-y-0 left-0 transition-all duration-500 rounded-xl ${
                  hasVoted ? "bg-sky-500/20" : "bg-muted/50 group-hover:bg-muted/70"
                }`}
                style={{ width: `${percentage}%` }}
              />

              {/* Option Content */}
              <div className="relative flex items-center justify-between gap-2 text-xs z-10">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {isVotingThis ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-500 shrink-0" />
                  ) : hasVoted ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-sky-500 shrink-0 fill-sky-500/20" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0 group-hover:text-muted-foreground" />
                  )}
                  <span className={`truncate font-medium ${hasVoted ? "font-bold text-foreground" : "text-foreground/90"}`}>
                    {option.text}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 text-[11px] font-semibold text-muted-foreground">
                  <span>{percentage}%</span>
                  <span className="opacity-60 text-[10px]">({votesCount})</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3 opacity-70" />
          {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
        </span>
        <span className="italic opacity-70">
          Click option to vote
        </span>
      </div>
    </div>
  );
}

export default PollCard;
