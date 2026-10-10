import React, { useState } from 'react';
import { BarChart3, CheckCircle2, Circle, Users, Loader2, CheckSquare, Square } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import useConverstion from '@/zustand/useConverstion';
import { getCachedPoll, saveCachedPoll } from '@/utils/pollCache';

export function PollCard({ msg, meId }) {
  const poll = msg?.poll || getCachedPoll(msg);
  const [votingId, setVotingId] = useState(null);
  const { messages, setMessages } = useConverstion();

  if (!poll || !Array.isArray(poll.options)) return null;

  // Calculate total votes across all options
  const totalVotes = poll.options.reduce((acc, opt) => acc + (opt.votes?.length || 0), 0);

  // Check if current user has voted on any option
  const hasUserVotedAny = poll.options.some(opt => 
    opt.votes?.some(v => String(v?._id || v) === String(meId))
  );

  const handleVote = async (optionId) => {
    const msgId = msg?._id || msg?.id;
    if (!msgId || votingId) return;

    setVotingId(optionId);

    // Optimistic vote update for instant UI responsiveness
    const previousMessages = [...messages];
    let updatedPollData = null;

    const updatedMessages = messages.map(m => {
      const currentId = m._id || m.id;
      if (currentId !== msgId) return m;

      const currentPoll = m.poll || getCachedPoll(m);
      if (!currentPoll || !Array.isArray(currentPoll.options)) return m;

      const allowMultiple = Boolean(currentPoll.allowMultiple);
      const newOptions = currentPoll.options.map(opt => {
        let optVotes = Array.isArray(opt.votes) ? [...opt.votes] : [];
        const hasVotedThis = optVotes.some(v => String(v?._id || v) === String(meId));

        if (opt.id === optionId) {
          if (hasVotedThis) {
            optVotes = optVotes.filter(v => String(v?._id || v) !== String(meId));
          } else {
            optVotes.push(meId);
          }
        } else if (!allowMultiple) {
          optVotes = optVotes.filter(v => String(v?._id || v) !== String(meId));
        }

        return { ...opt, votes: optVotes };
      });

      updatedPollData = { ...currentPoll, options: newOptions };
      return { ...m, poll: updatedPollData };
    });

    if (updatedPollData) {
      saveCachedPoll(msgId, updatedPollData);
      setMessages(updatedMessages);
    }

    try {
      const data = await api.post(`/api/messages/vote/${msgId}`, { optionId });
      if (data && (data._id || data.id)) {
        if (data.poll) saveCachedPoll(msgId, data.poll);
        setMessages(prev => prev.map(m => ((m._id || m.id) === (data._id || data.id) ? data : m)));
      }
    } catch (err) {
      console.error("Poll vote error:", err);
      setMessages(previousMessages);
      toast.error(err.message || "Failed to submit vote. Please ensure backend server is restarted.");
    } finally {
      setVotingId(null);
    }
  };

  const isMultiple = Boolean(poll.allowMultiple);

  return (
    <div className="w-full min-w-[260px] max-w-[340px] sm:max-w-[380px] p-4 text-foreground select-none">
      {/* Poll Header Badge & Subtitle */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5">
          <span className="grid h-6 w-6 place-items-center rounded-lg bg-sky-500/15 text-sky-500 border border-sky-500/20 shrink-0">
            <BarChart3 className="h-3.5 w-3.5" />
          </span>
          <span className="text-[10px] font-bold tracking-wider uppercase text-sky-500 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
            POLL
          </span>
        </div>
        <span className="text-[10px] font-medium text-muted-foreground bg-muted/60 dark:bg-muted/40 px-2 py-0.5 rounded-full border border-border/40">
          {isMultiple ? "Multiple choice" : "Single choice"}
        </span>
      </div>

      {/* Question */}
      <h4 className="text-sm sm:text-[15px] font-bold text-foreground mb-1 leading-snug break-words">
        {poll.question}
      </h4>
      <p className="text-[11px] text-muted-foreground/80 mb-3.5">
        {isMultiple ? "Select one or more options" : "Select one option"}
      </p>

      {/* Options List */}
      <div className="space-y-2">
        {poll.options.map((option) => {
          const votesCount = option.votes?.length || 0;
          const percentage = totalVotes > 0 ? Math.round((votesCount / totalVotes) * 100) : 0;
          const hasVoted = option.votes?.some(v => String(v?._id || v) === String(meId));
          const isVotingThis = votingId === option.id;

          return (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={Boolean(votingId)}
              className={`relative w-full text-left p-3 rounded-xl border transition-all overflow-hidden group cursor-pointer active:scale-[0.99] ${
                hasVoted
                  ? "border-sky-500/60 bg-sky-500/5 ring-1 ring-sky-500/20 shadow-xs"
                  : "border-border/70 hover:border-border hover:bg-accent/40 bg-card/60"
              }`}
            >
              {/* Progress Bar Animated Background */}
              <div
                className={`absolute inset-y-0 left-0 transition-all duration-500 ease-out rounded-xl ${
                  hasVoted ? "bg-sky-500/20 dark:bg-sky-500/25" : "bg-muted/50 dark:bg-muted/30 group-hover:bg-muted/70"
                }`}
                style={{ width: `${percentage}%` }}
              />

              {/* Option Content Foreground */}
              <div className="relative flex items-center justify-between gap-2.5 text-xs z-10">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {isVotingThis ? (
                    <Loader2 className="h-4 w-4 animate-spin text-sky-500 shrink-0" />
                  ) : isMultiple ? (
                    hasVoted ? (
                      <CheckSquare className="h-4 w-4 text-sky-500 shrink-0 fill-sky-500/10" />
                    ) : (
                      <Square className="h-4 w-4 text-muted-foreground/50 shrink-0 group-hover:text-muted-foreground/80" />
                    )
                  ) : (
                    hasVoted ? (
                      <CheckCircle2 className="h-4 w-4 text-sky-500 shrink-0 fill-sky-500/20" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground/50 shrink-0 group-hover:text-muted-foreground/80" />
                    )
                  )}
                  <span className={`truncate font-medium ${hasVoted ? "font-bold text-foreground" : "text-foreground/90"}`}>
                    {option.text}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 text-xs font-semibold">
                  <span className={hasVoted ? "text-sky-500 font-bold" : "text-muted-foreground"}>
                    {percentage}%
                  </span>
                  <span className="opacity-60 text-[10px] text-muted-foreground">({votesCount})</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="mt-3.5 pt-2.5 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Users className="h-3 w-3 opacity-70" />
          <span>{totalVotes} {totalVotes === 1 ? "vote" : "votes"}</span>
          {hasUserVotedAny && (
            <span className="text-sky-500 font-medium ml-1">• You voted</span>
          )}
        </span>
        <span className="text-[10px] italic opacity-60">
          Tap option to vote
        </span>
      </div>
    </div>
  );
}

export default PollCard;
