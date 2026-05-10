import { useEffect, useRef, useState, useMemo } from "react";
import { toast } from "sonner";
import { Send, Paperclip, Smile, X, Users, User as UserIcon, Check, CheckCheck, FileText, Image as ImageIcon, Loader2, MessageCircle, Trash2, Pencil, Reply, Forward, MoreVertical } from "lucide-react";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🎉", "🔥", "✅"];

export function ConversationView({
  conversationId,
  messages = [],
  onSendMessage,
  onFileUpload,
  onReact,
  currentUser,
  members = [],
  typingUsers = [],
  presence = new Set(),
  isLoading = false,
  onDeleteMessage,
  onEditMessage,
  onReplyMessage,
  onForwardMessage
}) {
  const me = String(currentUser?._id || currentUser?.id || "");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const scrollerRef = useRef(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);

  const scrollToMessage = (msgId) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedId(msgId);
      setTimeout(() => setHighlightedId(null), 3000);
    }
  };

  // Auto scroll to bottom
  useEffect(() => {
    const scroll = () => {
      const el = scrollerRef.current;
      if (el) {
        el.scrollTo({
          top: el.scrollHeight,
          behavior: "instant"
        });
      }
    };
    
    scroll();
    const t = setTimeout(scroll, 100);
    return () => clearTimeout(t);
  }, [messages.length, conversationId]);

  const memberMap = useMemo(() => {
    const map = new Map();
    members.forEach((m) => {
      const id = String(m._id || m.id || "");
      if (id) map.set(id, m);
    });
    return map;
  }, [members]);

  const otherMember = members.find((m) => (m.id || m._id) !== me);
  const isGroup = members.length > 2;

  const handleSend = async (override) => {
    const body = override?.body ?? text.trim();
    if (!body && !override?.attachment_url) return;

    if (onSendMessage) {
      setSending(true);
      await onSendMessage(body, { ...override, replyTo: replyingTo?._id, editId: editingMessage?._id });
      setSending(false);
      setText("");
      setReplyingTo(null);
      setEditingMessage(null);
    }
  };

  const typingNames = typingUsers
    .map((u) => memberMap.get(u)?.display_name || memberMap.get(u)?.username)
    .filter(Boolean);

  const grouped = useMemo(() => groupByDay(messages), [messages]);

  return (
    <div className="flex h-full flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2.5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            {otherMember?.profile || otherMember?.profilePic ? (
              <img src={otherMember.profile || otherMember.profilePic} className="h-9 w-9 rounded-full object-cover border border-border/50" alt="" />
            ) : (
              <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary">
                {isGroup ? <Users className="h-5 w-5" /> : <UserIcon className="h-5 w-5" />}
              </div>
            )}
            {!isGroup && otherMember && presence.has(otherMember._id || otherMember.id) && (
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-green-500" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground leading-tight">{otherMember?.display_name || otherMember?.name || "Chat"}</h3>
            <p className="text-[10px] text-muted-foreground font-medium">
              {!isGroup && otherMember && (presence.has(otherMember._id || otherMember.id) ? "Online now" : "Offline")}
              {isGroup && `${members.length} members`}
            </p>
          </div>
        </div>
      </div>

      {/* Messages Scroller */}
      <div ref={scrollerRef} className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
        {messages.length === 0 && !isLoading ? (
          <div className="flex h-full flex-col items-center justify-center text-center opacity-40">
            <MessageCircle className="mb-4 h-12 w-12 stroke-[1.5]" />
            <p className="text-sm font-medium">No messages yet.<br/>Start the conversation!</p>
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.day} className="space-y-4">
              <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                <span className="h-px flex-1 bg-border" />
                <span>{group.day}</span>
                <span className="h-px flex-1 bg-border" />
              </div>
              {group.items.map((msg, i) => {
                const prev = group.items[i - 1];
                const msgDate = new Date(msg.created_at || msg.createdAt);
                const prevDate = prev ? new Date(prev.created_at || prev.createdAt) : null;
                const senderId = String(msg.sender_id || msg.sender || msg.senderId || "");
                const showHeader = !prev || String(prev.sender_id || prev.sender || prev.senderId || "") !== senderId || (msgDate.getTime() - prevDate.getTime()) > 5 * 60 * 1000;

                return (
                  <MessageItem
                    key={msg.id || msg._id}
                    msg={msg}
                    mine={senderId === me}
                    sender={memberMap.get(senderId)}
                    showHeader={showHeader}
                    reactions={msg.reactions || []}
                    onReact={(e) => onReact && onReact(msg.id || msg._id, e)}
                    onDelete={() => onDeleteMessage && onDeleteMessage(msg.id || msg._id)}
                    onEdit={() => { setEditingMessage(msg); setReplyingTo(null); setText(msg.message || msg.body); }}
                    onReply={() => { setReplyingTo(msg); setEditingMessage(null); }}
                    onForward={() => onForwardMessage && onForwardMessage(msg)}
                    onReplyClick={(id) => scrollToMessage(id)}
                    isHighlighted={highlightedId === (msg.id || msg._id)}
                    meId={me}
                  />
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Typing */}
      <div className="h-5 px-5 text-xs text-muted-foreground">
        {typingNames.length > 0 && (
          <span>{typingNames.slice(0, 2).join(", ")}{typingNames.length > 2 ? " and others" : ""} typing…</span>
        )}
      </div>

      {/* Reply/Edit Bar */}
      {replyingTo && (
        <div className="flex items-center justify-between bg-muted/30 px-4 py-2 border-t border-border animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-1 bg-primary h-8 rounded-full shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-primary uppercase tracking-wider">Replying to {memberMap.get(replyingTo.senderId)?.name || "User"}</div>
              <div className="text-xs text-muted-foreground truncate">{replyingTo.message || replyingTo.body}</div>
            </div>
          </div>
          <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-muted rounded-full transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      )}

      {editingMessage && (
        <div className="flex items-center justify-between bg-primary/5 px-4 py-2 border-t border-primary/20 animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-3 min-w-0">
            <Pencil className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-primary uppercase tracking-wider">Editing Message</div>
              <div className="text-xs text-muted-foreground truncate">{editingMessage.message || editingMessage.body}</div>
            </div>
          </div>
          <button onClick={() => { setEditingMessage(null); setText(""); }} className="p-1 hover:bg-muted rounded-full transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Composer */}
      <div className="border-t border-border bg-card px-4 py-3">
        <div className="flex items-end gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <button className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" title="Emoji">
                <Smile className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" side="top">
              <div className="grid grid-cols-8 gap-1">
                {EMOJIS.map((e) => (
                  <button key={e} onClick={() => setText((t) => t + e)} className="h-8 w-8 rounded hover:bg-accent">
                    {e}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={1}
            placeholder="Type a message"
            className="max-h-32 min-h-9 flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={() => handleSend()}
            disabled={sending || (!text.trim())}
            className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            title="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageItem({
  msg, mine, sender, showHeader, reactions, onReact, onDelete, onEdit, onReply, onForward, onReplyClick, isHighlighted, meId,
}) {
  const grouped = {};
  reactions.forEach((r) => { (grouped[r.emoji] ??= []).push(r); });

  return (
    <div id={`msg-${msg.id || msg._id}`} className={"group mb-1 flex gap-3 transition-all duration-500 " + (mine ? "justify-end " : "justify-start ") + (isHighlighted ? "bg-primary/10 ring-2 ring-primary/20 rounded-lg scale-[1.02] py-2 px-1" : "")}>
      {!mine && (
        <div className="w-7 shrink-0">
          {showHeader && (
            sender?.avatar_url || sender?.profilePic
              ? <img src={sender.avatar_url || sender.profilePic} className="mt-1 h-7 w-7 rounded-full object-cover" alt="" />
              : <div className="mt-1 grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
                {(sender?.display_name || sender?.username || "?").slice(0, 2).toUpperCase()}
              </div>
          )}
        </div>
      )}
      <div className={"max-w-[70%] " + (mine ? "items-end" : "items-start")}>
        {/* Sender name removed for direct messages */}
        <div className={"relative " + (mine ? "" : "")}>
          <div
            className={
              "rounded-2xl px-3.5 py-2 text-sm " +
              (mine
                ? "bg-bubble-mine text-bubble-mine-foreground rounded-br-md"
                : "bg-bubble-theirs text-bubble-theirs-foreground rounded-bl-md")
            }
          >
            {msg.isDeleted ? (
              <div className="italic opacity-60 text-xs py-1">
                This message was deleted by its author
              </div>
            ) : (
              <>
                {msg.replyTo && (
                  <div 
                    onClick={() => onReplyClick && onReplyClick(msg.replyTo._id || msg.replyTo.id)}
                    className={"mb-2 cursor-pointer border-l-2 border-primary/40 bg-black/5 px-2 py-1 rounded hover:bg-black/10 transition-colors " + (mine ? "text-bubble-mine-foreground/80" : "text-bubble-theirs-foreground/80")}
                  >
                    <div className="text-[10px] font-bold">Replying to...</div>
                    <div className="text-xs truncate italic">{msg.replyTo.message || msg.replyTo.body}</div>
                  </div>
                )}
                <div className="relative pb-2">
                  <div className="whitespace-pre-wrap break-words pr-20 leading-relaxed min-w-[90px]">
                    {msg.message || msg.body}
                  </div>
                  <div className="absolute bottom-0 right-0 flex items-center gap-1 pb-0.5 pr-1.5 select-none">
                    {msg.isEdited && (
                      <span className="text-[9px] opacity-50 italic shrink-0">edited</span>
                    )}
                    <span className="text-[9px] opacity-50 font-medium shrink-0">
                      {new Date(msg.created_at || msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {mine && (
                      <CheckCheck className="h-2.5 w-2.5 opacity-50 shrink-0" />
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Hover menu */}
          <div className={"absolute -top-3 hidden items-center gap-0.5 rounded-full border border-border bg-card px-1 py-0.5 shadow-md group-hover:flex " + (mine ? "right-0" : "left-0")}>
            {!msg.isDeleted && (
              <div className="flex items-center border-r border-border pr-0.5 mr-0.5">
                {EMOJIS.slice(0, 4).map((e) => (
                  <button key={e} onClick={() => onReact && onReact(e)} className="grid h-6 w-6 place-items-center rounded-full hover:bg-accent text-xs">
                    {e}
                  </button>
                ))}
              </div>
            )}
            
            {!msg.isDeleted && (
              <>
                <button onClick={onReply} className="grid h-6 w-6 place-items-center rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="Reply">
                  <Reply className="h-3.5 w-3.5" />
                </button>
                <button onClick={onForward} className="grid h-6 w-6 place-items-center rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="Forward">
                  <Forward className="h-3.5 w-3.5" />
                </button>
                {mine && (
                  <button onClick={onEdit} className="grid h-6 w-6 place-items-center rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="Edit">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
                {mine && (
                  <button onClick={onDelete} className="grid h-6 w-6 place-items-center rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function groupByDay(messages) {
  const groups = [];
  const map = {};
  messages.forEach((m) => {
    const d = new Date(m.created_at || m.createdAt);
    if (isNaN(d.getTime())) return;
    const day = d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
    if (!map[day]) {
      map[day] = { day, items: [] };
      groups.push(map[day]);
    }
    map[day].items.push(m);
  });
  return groups;
}
