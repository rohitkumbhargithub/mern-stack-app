import React, { useState, useMemo } from "react";
import { toast } from "sonner";
import { Search, Forward, Check, Loader2, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import useConverstion from "../../zustand/useConverstion";
import { UserAvatar } from "../common/UserAvatar";
import userSendMessage from "../../hooks/userSendMessage";

export function ForwardMessageModal({
  open,
  onOpenChange,
  messageToForward,
}) {
  const { conversations, selectedConverstion } = useConverstion();
  const { sendMessage } = userSendMessage();
  const [searchQuery, setSearchQuery] = useState("");
  const [forwardingIds, setForwardingIds] = useState(new Set());
  const [forwardedIds, setForwardedIds] = useState(new Set());

  const messageText = messageToForward?.message || messageToForward?.body || "";

  const filteredConversations = useMemo(() => {
    const list = Array.isArray(conversations) ? conversations : [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter((c) =>
      (c?.name || c?.username || "").toLowerCase().includes(q)
    );
  }, [conversations, searchQuery]);

  const handleForwardTo = async (targetConv) => {
    const targetId = targetConv._id;
    if (!targetId || forwardingIds.has(targetId)) return;

    setForwardingIds((prev) => new Set(prev).add(targetId));

    try {
      const res = await sendMessage(messageText, {
        targetConversationId: targetId,
        isForwarded: true
      });

      if (res) {
        setForwardedIds((prev) => new Set(prev).add(targetId));
        toast.success(`Forwarded to ${targetConv.name || "chat"}!`);
      }
    } catch (err) {
      toast.error(`Failed to forward: ${err.message}`);
    } finally {
      setForwardingIds((prev) => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-5 gap-4">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary font-bold">
            <Forward className="h-5 w-5" />
            <DialogTitle className="text-base font-bold">Forward Message</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Select a contact or group to forward this message to.
          </DialogDescription>
        </DialogHeader>

        {/* Message preview snippet */}
        <div className="rounded-xl bg-muted/60 dark:bg-muted/30 p-3 border border-border/60 text-xs text-foreground/90 flex items-start gap-2.5">
          <Forward className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1 line-clamp-2 italic text-muted-foreground">
            "{messageText}"
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations…"
            className="w-full rounded-lg bg-accent/40 border border-border/50 pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary transition-all"
          />
        </div>

        {/* Conversations List */}
        <div className="max-h-64 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
          {filteredConversations.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No conversations found
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSending = forwardingIds.has(conv._id);
              const isSent = forwardedIds.has(conv._id);
              const isCurrentChat = selectedConverstion?._id === conv._id;

              return (
                <div
                  key={conv._id}
                  className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-accent/40 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <UserAvatar
                      src={conv.profile || conv.profilePic}
                      name={conv.name || conv.username || "Chat"}
                      size="sm"
                      isAI={conv.isAI || conv.type === "ai"}
                      isGroup={conv.type === "group" || conv.isGroupChat}
                      groupAvatar={conv.groupAvatar}
                      showOnlineDot={false}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-xs font-semibold text-foreground truncate">
                          {conv.name || conv.username || "Chat"}
                        </span>
                        {isCurrentChat && (
                          <span className="text-[9px] text-muted-foreground font-medium shrink-0">
                            (Current)
                          </span>
                        )}
                        {conv.type === "group" && (
                          <span className="text-[8px] font-bold px-1 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20 shrink-0">
                            GROUP
                          </span>
                        )}
                        {conv.isAI && (
                          <span className="text-[8px] font-bold px-1 rounded bg-primary/10 text-primary border border-primary/20 shrink-0">
                            BOT
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {conv.type === "group" ? `${conv.membersCount || 2} members` : conv.email || "Direct Message"}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleForwardTo(conv)}
                    disabled={isSending || isSent}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-2xs cursor-pointer ${
                      isSent
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 cursor-default"
                        : "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 disabled:opacity-50"
                    }`}
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Sending…</span>
                      </>
                    ) : isSent ? (
                      <>
                        <Check className="h-3 w-3" />
                        <span>Sent</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3 w-3" />
                        <span>Send</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ForwardMessageModal;
