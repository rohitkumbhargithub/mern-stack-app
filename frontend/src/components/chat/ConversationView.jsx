import { useEffect, useRef, useState, useMemo } from "react";
import { toast } from "sonner";
import { Send, Paperclip, Smile, X, Users, User as UserIcon, Check, CheckCheck, FileText, Image as ImageIcon, Loader2, MessageCircle } from "lucide-react";
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
  isLoading = false
}) {
  const me = String(currentUser?._id || currentUser?.id || "");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const scrollerRef = useRef(null);

  // Auto scroll on new messages
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

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

  const title = isGroup
    ? "Group Chat"
    : otherMember?.name || otherMember?.display_name || otherMember?.username || "Direct Message";

  const subtitle = isGroup
    ? `${members.length} members`
    : (presence.has(otherMember?.id || otherMember?._id) ? "Online" : "Offline");

  const grouped = useMemo(() => groupByDay(messages), [messages]);

  const handleSend = async (override) => {
    const body = override?.body ?? text.trim();
    if (!body && !override?.attachment_url) return;

    if (onSendMessage) {
      setSending(true);
      await onSendMessage(body, override);
      setSending(false);
      setText("");
    }
  };

  const onPickFile = async (file) => {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) return toast.error("Max 20 MB");

    if (onFileUpload) {
      setUploading(true);
      await onFileUpload(file);
      setUploading(false);
    }
  };

  const typingNames = typingUsers
    .map((u) => memberMap.get(u)?.display_name || memberMap.get(u)?.username)
    .filter(Boolean);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-card px-5 py-3">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary">
          {isGroup ? <Users className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{title}</div>
          <div className="text-xs text-muted-foreground">{subtitle}</div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto px-5 py-4 scroll-smooth"
      >
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <span className="loading loading-spinner text-primary"></span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center px-6">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <MessageCircle className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-base font-bold text-foreground">Start a Conversation</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
              Say hello to start your chat. This user will appear in your sidebar once you send a message.
            </p>
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.day}>
              <div className="my-4 flex items-center gap-3 text-[11px] text-muted-foreground">
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

      {/* Composer */}
      <div className="border-t border-border bg-card px-4 py-3">
        <div className="flex items-end gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            title="Attach"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickFile(f); e.target.value = ""; }}
          />
          <Popover>
            <PopoverTrigger asChild>
              <button className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" title="Emoji">
                <Smile className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2">
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
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
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
  msg, mine, sender, showHeader, reactions, onReact, meId,
}) {
  const grouped = {};
  reactions.forEach((r) => { (grouped[r.emoji] ??= []).push(r); });

  return (
    <div className={"group mb-1 flex gap-3 " + (mine ? "justify-end" : "justify-start")}>
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
        {showHeader && !mine && (
          <div className="mb-0.5 ml-1 text-xs text-muted-foreground">{sender?.display_name || sender?.username || "Unknown"}</div>
        )}
        <div className={"relative " + (mine ? "" : "")}>
          <div
            className={
              "rounded-2xl px-3.5 py-2 text-sm " +
              (mine
                ? "bg-bubble-mine text-bubble-mine-foreground rounded-br-md"
                : "bg-bubble-theirs text-bubble-theirs-foreground rounded-bl-md")
            }
          >
            {(msg.attachment_url || msg.attachment) && (msg.attachment_type === "image" || msg.attachment?.type?.startsWith("image/")) && (
              <a href={msg.attachment_url || msg.attachment?.url} target="_blank" rel="noreferrer">
                <img src={msg.attachment_url || msg.attachment?.url} alt="" className="mb-1 max-h-72 rounded-lg" />
              </a>
            )}
            {(msg.attachment_url || msg.attachment) && (msg.attachment_type === "file" || (msg.attachment && !msg.attachment?.type?.startsWith("image/"))) && (
              <a href={msg.attachment_url || msg.attachment?.url} target="_blank" rel="noreferrer"
                className={"mb-1 flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs " + (mine ? "border-white/20 hover:bg-white/10" : "border-border hover:bg-muted")}>
                <FileText className="h-4 w-4" />
                <span className="truncate">{msg.attachment_name || msg.attachment?.name || "File"}</span>
                {(msg.attachment_size || msg.attachment?.size) && <span className="opacity-60">({Math.round((msg.attachment_size || msg.attachment?.size) / 1024)} KB)</span>}
              </a>
            )}
            {(msg.body || msg.message) && <div className="whitespace-pre-wrap break-words">{msg.body || msg.message}</div>}
          </div>

          {/* Hover reaction picker */}
          <div className={"absolute -top-3 hidden gap-0.5 rounded-full border border-border bg-card px-1 py-0.5 shadow-sm group-hover:flex " + (mine ? "right-0" : "left-0")}>
            {EMOJIS.slice(0, 6).map((e) => (
              <button key={e} onClick={() => onReact && onReact(e)} className="grid h-6 w-6 place-items-center rounded-full hover:bg-accent text-xs">
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Reactions */}
        {Object.keys(grouped).length > 0 && (
          <div className={"mt-1 flex flex-wrap gap-1 " + (mine ? "justify-end" : "justify-start")}>
            {Object.entries(grouped).map(([emoji, rs]) => {
              const mineReacted = rs.some((r) => r.user_id === meId || r.userId === meId);
              return (
                <button
                  key={emoji}
                  onClick={() => onReact && onReact(emoji)}
                  className={"flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs " + (mineReacted ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-accent")}
                >
                  <span>{emoji}</span><span>{rs.length}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className={"mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground " + (mine ? "justify-end" : "justify-start")}>
          <span>{new Date(msg.created_at || msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          {mine && (
            <div className="flex items-center">
              {msg.read ? <CheckCheck className="h-3 w-3 text-primary" /> : <Check className="h-3 w-3" />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function groupByDay(messages) {
  const groups = [];
  for (const m of messages) {
    const dateStr = m.created_at || m.createdAt;
    if (!dateStr) continue;
    const d = new Date(dateStr);
    const today = new Date(); const yest = new Date(); yest.setDate(today.getDate() - 1);
    let label;
    if (d.toDateString() === today.toDateString()) label = "Today";
    else if (d.toDateString() === yest.toDateString()) label = "Yesterday";
    else label = d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
    const last = groups[groups.length - 1];
    if (last && last.day === label) last.items.push(m);
    else groups.push({ day: label, items: [m] });
  }
  return groups;
}
