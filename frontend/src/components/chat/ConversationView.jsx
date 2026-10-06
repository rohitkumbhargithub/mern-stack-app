import { useEffect, useRef, useState, useMemo, useCallback, memo } from "react";
import { toast } from "sonner";
import { 
  Send, Paperclip, Smile, X, Users, User as UserIcon, Check, CheckCheck, 
  FileText, Image as ImageIcon, Loader2, MessageCircle, Trash2, Pencil, 
  Reply, Forward, MoreVertical, ArrowLeft, Sparkles, Globe, HelpCircle, Bot,
  ShieldCheck, Lock, PanelLeft, PanelLeftClose, LogOut
} from "lucide-react";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

import useConverstion from "../../zustand/useConverstion";
import useAI from "../../hooks/useAI";
import useDeleteConversation from "../../hooks/useDeleteConversation";
import AIQuickReplies from "./AIQuickReplies";
import AIComposerMenu from "./AIComposerMenu";
import AISummaryModal from "./AISummaryModal";
import { ChatSecurityModal } from "./ChatSecurityModal";
import { UserAvatar } from "../common/UserAvatar";
import { ProfileHoverCard } from "../common/ProfileHoverCard";
import { ForwardMessageModal } from "./ForwardMessageModal";
import { GroupDetailsModal } from "./GroupDetailsModal";

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🎉", "🔥", "✅"];

export function ConversationView({
  conversationId,
  conversationName,
  messages = [],
  onSendMessage,
  onFileUpload,
  onReact,
  currentUser,
  members = [],
  typingUsers = [],
  presence = new Set(),
  onDeleteMessage,
  onEditMessage,
  onReplyMessage,
  onForwardMessage,
  onTypingChange,
  isLoading = false,
  hasMoreMessages = false,
  loadingOlderMessages = false,
  onLoadOlderMessages
}) {
  const typingTimeoutRef = useRef(null);
  const { selectedConverstion, setSelectedConverstion, isSidebarCollapsed, toggleSidebar } = useConverstion();
  const me = String(currentUser?._id || currentUser?.id || "");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const scrollerRef = useRef(null);
  const textareaRef = useRef(null);
  const prevScrollHeightRef = useRef(0);
  const prevScrollTopRef = useRef(0);
  const isPrependingRef = useRef(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);

  // AI State
  const { fetchSmartReplies, rewriteDraft, summarizeThread, translateMessage, loadingAction } = useAI();
  const [smartReplies, setSmartReplies] = useState([]);
  const [smartRepliesLoading, setSmartRepliesLoading] = useState(false);
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [threadSummary, setThreadSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [translations, setTranslations] = useState({}); // { [msgId]: translatedText }
  const [showOriginals, setShowOriginals] = useState({}); // { [msgId]: boolean }
  const [explanations, setExplanations] = useState({}); // { [msgId]: explanationText }
  const [aiActionLoadingId, setAiActionLoadingId] = useState(null);
  const [securityModalOpen, setSecurityModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [messageToForward, setMessageToForward] = useState(null);
  const [groupDetailsModalOpen, setGroupDetailsModalOpen] = useState(false);
  const { deleteConversation, exitGroup, loading: actionLoading } = useDeleteConversation();

  const handleConfirmDelete = async () => {
    await deleteConversation(conversationId || selectedConverstion?._id);
    setDeleteDialogOpen(false);
  };

  const handleConfirmExit = async () => {
    await exitGroup(conversationId || selectedConverstion?._id);
    setExitDialogOpen(false);
  };

  // Reset replying, editing, and input state whenever conversationId changes
  useEffect(() => {
    setReplyingTo(null);
    setEditingMessage(null);
    setText("");
    setSmartReplies([]);
  }, [conversationId]);

  // Allow Esc key to quickly cancel replying or editing
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setReplyingTo(null);
        if (editingMessage) {
          setEditingMessage(null);
          setText("");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editingMessage]);

  const scrollToMessage = useCallback((msgId) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedId(msgId);
      setTimeout(() => setHighlightedId(null), 3000);
    }
  }, []);

  // Preserve scroll position when older messages are prepended
  useEffect(() => {
    const el = scrollerRef.current;
    if (el && isPrependingRef.current) {
      const scrollDiff = el.scrollHeight - prevScrollHeightRef.current;
      el.scrollTop = scrollDiff + prevScrollTopRef.current;
      isPrependingRef.current = false;
    }
  }, [messages]);

  // Handle scroll event for auto-fetching older messages near top
  const handleScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;

    if (el.scrollTop < 60 && hasMoreMessages && !loadingOlderMessages && onLoadOlderMessages) {
      prevScrollHeightRef.current = el.scrollHeight;
      prevScrollTopRef.current = el.scrollTop;
      isPrependingRef.current = true;
      onLoadOlderMessages();
    }
  }, [hasMoreMessages, loadingOlderMessages, onLoadOlderMessages]);

  // Auto scroll to bottom on new messages or conversation switch (unless prepending)
  useEffect(() => {
    if (isPrependingRef.current) return;

    let animId;
    const scroll = () => {
      const el = scrollerRef.current;
      if (el) {
        el.scrollTo({
          top: el.scrollHeight,
          behavior: "instant"
        });
      }
    };
    
    animId = requestAnimationFrame(scroll);
    const t = setTimeout(() => {
      animId = requestAnimationFrame(scroll);
    }, 60);

    return () => {
      cancelAnimationFrame(animId);
      clearTimeout(t);
    };
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
  const isGroup = Boolean(selectedConverstion?.isGroupChat || selectedConverstion?.type === "group" || members.length > 2);
  const isAIConversation = otherMember?.isAI || otherMember?.type === "ai";

  // Auto-fetch Smart Quick-Replies when a new incoming message is received
  useEffect(() => {
    if (!messages || messages.length === 0) {
      setSmartReplies([]);
      return;
    }

    const lastMsg = messages[messages.length - 1];
    const lastSenderId = String(lastMsg.sender_id || lastMsg.sender || lastMsg.senderId || "");

    // Only suggest replies if the last message came from the other person
    if (lastSenderId && lastSenderId !== me && !lastMsg.isDeleted) {
      let isMounted = true;
      setSmartRepliesLoading(true);

      const payload = messages.slice(-5).map(m => ({
        senderName: String(m.sender_id || m.sender || m.senderId || "") === me ? "Me" : (memberMap.get(m.senderId)?.name || "Them"),
        message: m.message || m.body
      }));

      fetchSmartReplies(payload).then(replies => {
        if (isMounted) {
          setSmartReplies(replies || []);
          setSmartRepliesLoading(false);
        }
      });

      return () => { isMounted = false; };
    } else {
      setSmartReplies([]);
    }
  }, [messages.length, me, memberMap, fetchSmartReplies]);

  const handleTextChange = (e) => {
    const val = e.target.value;
    setText(val);

    if (onTypingChange) {
      onTypingChange(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        onTypingChange(false);
      }, 2000);
    }
  };

  const handleSend = async (override) => {
    const body = override?.body ?? text.trim();
    if (!body && !override?.attachment_url) return;

    if (onSendMessage) {
      setSending(true);
      await onSendMessage(body, { 
        ...override, 
        replyTo: replyingTo?._id || replyingTo?.id, 
        editId: editingMessage?._id || editingMessage?.id 
      });
      setSending(false);
      setText("");
      setReplyingTo(null);
      setEditingMessage(null);
      setSmartReplies([]); // clear suggestions once sent
    }
  };

  // AI: Rewrite draft message
  const handleAIRewrite = async (mode, targetLanguage = "English") => {
    if (!text.trim()) return;
    const rewritten = await rewriteDraft(text, mode, targetLanguage);
    if (rewritten && rewritten !== text) {
      setText(rewritten);
      toast.success(
        mode === "grammar" ? "Grammar & typos polished!" :
        mode === "professional" ? "Rewritten in professional tone!" :
        mode === "casual" ? "Rewritten in friendly tone!" :
        mode === "concise" ? "Rewritten concisely!" :
        `Translated to ${targetLanguage}!`
      );
    }
  };

  // AI: Open Conversation Catch-Up Summary
  const handleOpenSummary = async () => {
    setSummaryModalOpen(true);
    setSummaryLoading(true);

    const formattedMessages = messages.map(m => ({
      senderName: String(m.sender_id || m.sender || m.senderId || "") === me ? "You" : (memberMap.get(m.senderId)?.name || "Participant"),
      message: m.message || m.body
    }));

    const result = await summarizeThread(formattedMessages);
    setThreadSummary(result || "Could not generate summary.");
    setSummaryLoading(false);
  };

  // AI: Translate individual message
  const handleTranslateMessage = useCallback(async (msgId, messageText) => {
    const targetLang = localStorage.getItem("preferred_translation_lang") || "English";
    setAiActionLoadingId(msgId);
    const translated = await translateMessage(messageText, targetLang);
    setAiActionLoadingId(null);

    if (translated) {
      setTranslations(prev => ({ ...prev, [msgId]: translated }));
      setShowOriginals(prev => ({ ...prev, [msgId]: false }));
      toast.success(`Translated to ${targetLang}`);
    }
  }, [translateMessage]);

  // AI: Explain / Summarize individual message
  const handleExplainMessage = useCallback(async (msgId, messageText) => {
    setAiActionLoadingId(msgId);
    const explanation = await rewriteDraft(
      `Please explain and break down this message in 1-2 bullet points: "${messageText}"`,
      "concise"
    );
    setAiActionLoadingId(null);

    if (explanation) {
      setExplanations(prev => ({ ...prev, [msgId]: explanation }));
    }
  }, [rewriteDraft]);

  // AI: Generate contextual reply to a specific message
  const handleAIReplyToMessage = useCallback(async (msg) => {
    const targetText = msg.message || msg.body;
    setReplyingTo(msg);
    toast.loading("Generating AI reply draft…", { id: "ai-reply" });
    const draft = await rewriteDraft(
      `Draft a polite, helpful reply to this message: "${targetText}"`,
      "casual"
    );
    toast.dismiss("ai-reply");
    if (draft) {
      setText(draft);
      textareaRef.current?.focus();
      toast.success("AI reply draft ready!");
    }
  }, [rewriteDraft]);

  // Stable handlers for memoized MessageItem
  const handleReactItem = useCallback((msgId, emoji) => {
    if (onReact) onReact(msgId, emoji);
  }, [onReact]);

  const handleDeleteItem = useCallback((msgId) => {
    if (onDeleteMessage) onDeleteMessage(msgId);
  }, [onDeleteMessage]);

  const handleEditItem = useCallback((msg) => {
    setEditingMessage(msg);
    setReplyingTo(null);
    setText(msg.message || msg.body);
  }, []);

  const handleReplyItem = useCallback((msg) => {
    setReplyingTo(msg);
    setEditingMessage(null);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  }, []);

  const handleForwardItem = useCallback((msg) => {
    setMessageToForward(msg);
    setForwardModalOpen(true);
    if (onForwardMessage) onForwardMessage(msg);
  }, [onForwardMessage]);

  const handleToggleOriginalItem = useCallback((msgId) => {
    setShowOriginals(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  }, []);

  const typingNames = typingUsers
    .map((u) => memberMap.get(u)?.display_name || memberMap.get(u)?.username)
    .filter(Boolean);

  const grouped = useMemo(() => groupByDay(messages), [messages]);

  return (
    <div className="flex h-full flex-col bg-background overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2.5 shadow-xs">
        <div className="flex items-center gap-1.5">
          {/* Back / Collapse active conversation (always accessible in split-windows) */}
          <button 
            onClick={() => setSelectedConverstion(null)}
            className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors flex items-center"
            title="Collapse conversation / Back to sidebar"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>

          {/* Sidebar Toggle button (collapse / expand sidebar) */}
          <button
            onClick={toggleSidebar}
            className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors"
            title={isSidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
          >
            {isSidebarCollapsed ? <PanelLeft className="h-4.5 w-4.5" /> : <PanelLeftClose className="h-4.5 w-4.5" />}
          </button>

          {/* Avatar and Chat Title */}
          <div
            onClick={() => isGroup && setGroupDetailsModalOpen(true)}
            className={`flex items-center gap-3 transition-colors ${
              isGroup ? "cursor-pointer p-1.5 -ml-1.5 rounded-lg hover:bg-muted/70 active:scale-98" : ""
            }`}
            title={isGroup ? "Click to view group details & members" : ""}
          >
            <UserAvatar
              src={otherMember?.profile || otherMember?.profilePic}
              name={isGroup ? (selectedConverstion?.name || "Group") : (otherMember?.display_name || otherMember?.name || "User")}
              size="md"
              isAI={isAIConversation}
              isGroup={isGroup}
              groupAvatar={selectedConverstion?.groupAvatar}
              online={Boolean(otherMember && presence.has(otherMember._id || otherMember.id))}
              showOnlineDot={!isGroup}
            />
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-foreground leading-tight">
                  {isGroup ? (selectedConverstion?.name || "Group Chat") : (otherMember?.display_name || otherMember?.name || "Chat")}
                </h3>
                {isGroup && (
                  <span className="px-1.5 py-0.2 rounded-full bg-primary/10 text-primary text-[9px] font-bold tracking-wider border border-primary/20">
                    GROUP
                  </span>
                )}
                {isAIConversation && (
                  <span className="px-1.5 py-0.2 rounded-full bg-primary/10 text-primary text-[9px] font-bold tracking-wider border border-primary/20">
                    AI
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground font-medium">
                {isAIConversation ? "Always active" : (
                  isGroup ? `${members.length} members • Click for info` : (presence.has(otherMember?._id || otherMember?.id) ? "Online now" : "Offline")
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-1.5">
          {/* End-to-End Encryption Badge */}
          <button
            onClick={() => setSecurityModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold transition-all shadow-2xs active:scale-95"
            title="View End-to-End Encryption Security Status"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Encrypted</span>
          </button>

          {messages.length > 2 && (
            <button
              onClick={handleOpenSummary}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary text-xs font-semibold transition-all shadow-xs active:scale-95"
              title="Catch up on discussion with AI summary"
            >
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              <span className="hidden sm:inline">Catch Up</span>
            </button>
          )}

          {/* More options menu (Delete conversation, Exit group) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
                title="Conversation options"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {isGroup ? (
                <>
                  <DropdownMenuItem
                    onClick={() => setGroupDetailsModalOpen(true)}
                    className="cursor-pointer font-medium"
                  >
                    <Users className="h-4 w-4 mr-2 text-primary" />
                    Group Info
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setExitDialogOpen(true)}
                    className="text-amber-600 dark:text-amber-400 focus:text-amber-600 focus:bg-amber-500/10 cursor-pointer"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Exit Group
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteDialogOpen(true)}
                    variant="destructive"
                    className="cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Group
                  </DropdownMenuItem>
                </>
              ) : isAIConversation ? (
                <DropdownMenuItem
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear AI History
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => setDeleteDialogOpen(true)}
                  variant="destructive"
                  className="cursor-pointer"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Conversation
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Close conversation button */}
          <button
            onClick={() => setSelectedConverstion(null)}
            className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors ml-0.5"
            title="Close conversation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroller */}
      <div 
        ref={scrollerRef} 
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin"
      >
        {/* WhatsApp-Style Load Older Messages Header */}
        {hasMoreMessages && (
          <div className="flex justify-center py-1">
            {loadingOlderMessages ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/60 border border-border/50 text-xs text-muted-foreground shadow-2xs animate-pulse">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span>Loading earlier messages…</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const el = scrollerRef.current;
                  if (el) {
                    prevScrollHeightRef.current = el.scrollHeight;
                    prevScrollTopRef.current = el.scrollTop;
                    isPrependingRef.current = true;
                  }
                  onLoadOlderMessages && onLoadOlderMessages();
                }}
                className="text-xs font-semibold text-primary hover:underline px-3.5 py-1.5 rounded-full bg-primary/10 hover:bg-primary/15 border border-primary/20 transition-all cursor-pointer shadow-2xs"
              >
                ↑ Load earlier messages
              </button>
            )}
          </div>
        )}

        {!hasMoreMessages && messages.length > 0 && (
          <div className="text-center py-1">
            <span className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-semibold">
              Beginning of chat history
            </span>
          </div>
        )}

        {/* End-to-End Encrypted Notice Banner */}
        <div className="flex justify-center my-1">
          <button
            onClick={() => setSecurityModalOpen(true)}
            className="flex items-center gap-2 max-w-sm px-3.5 py-1.5 rounded-xl bg-muted/40 hover:bg-muted/70 border border-border/60 text-[11px] text-muted-foreground text-center transition-all shadow-2xs active:scale-[0.99] group cursor-pointer"
            title="Click to view end-to-end security details"
          >
            <Lock className="h-3 w-3 shrink-0 text-emerald-500 group-hover:scale-110 transition-transform" />
            <span>Messages are end-to-end encrypted. Tap to verify.</span>
          </button>
        </div>
        {isLoading ? (
          <div className="flex h-full min-h-[220px] flex-col items-center justify-center p-8 space-y-3 text-muted-foreground/60">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
            <p className="text-xs font-medium animate-pulse">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center opacity-60 max-w-sm mx-auto">
            {isAIConversation ? (
              <div className="flex flex-col items-center space-y-3 p-6 rounded-2xl bg-card border border-border shadow-xs">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-primary via-purple-500 to-indigo-500 grid place-items-center text-white shadow-md">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-base text-foreground">Meet SendChat AI ✨</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your smart assistant is ready. Ask questions, brainstorm, debug code, or draft messages together!
                </p>
                <div className="flex flex-wrap gap-1.5 justify-center pt-2">
                  <button onClick={() => setText("Give me 3 creative team name ideas")} className="text-[11px] px-2.5 py-1 rounded-full bg-muted hover:bg-accent text-foreground transition-colors">
                    💡 Team name ideas
                  </button>
                  <button onClick={() => setText("Help me draft a professional email")} className="text-[11px] px-2.5 py-1 rounded-full bg-muted hover:bg-accent text-foreground transition-colors">
                    ✉️ Draft an email
                  </button>
                  <button onClick={() => setText("Explain how websockets work simply")} className="text-[11px] px-2.5 py-1 rounded-full bg-muted hover:bg-accent text-foreground transition-colors">
                    🌐 Explain WebSockets
                  </button>
                </div>
              </div>
            ) : (
              <>
                <MessageCircle className="mb-4 h-12 w-12 stroke-[1.5]" />
                <p className="text-sm font-medium">No messages yet.<br/>Start the conversation!</p>
              </>
            )}
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
                const isMsgFromAI = msg.isAI || otherMember?.isAI && senderId !== me;

                return (
                  <MessageItem
                    key={msg.id || msg._id}
                    msg={msg}
                    mine={senderId === me}
                    isAI={isMsgFromAI}
                    sender={memberMap.get(senderId)}
                    showHeader={showHeader}
                    reactions={msg.reactions || []}
                    onReact={handleReactItem}
                    onDelete={handleDeleteItem}
                    onEdit={handleEditItem}
                    onReply={handleReplyItem}
                    onForward={handleForwardItem}
                    onReplyClick={scrollToMessage}
                    isHighlighted={highlightedId === (msg.id || msg._id)}
                    meId={me}
                    // AI props
                    translatedText={translations[msg.id || msg._id]}
                    showOriginal={showOriginals[msg.id || msg._id]}
                    onToggleOriginal={handleToggleOriginalItem}
                    explanationText={explanations[msg.id || msg._id]}
                    onTranslate={handleTranslateMessage}
                    onExplain={handleExplainMessage}
                    onAIReply={handleAIReplyToMessage}
                    isAILoading={aiActionLoadingId === (msg.id || msg._id)}
                  />
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Typing */}
      <div className="h-6 px-5 flex items-center gap-2 text-[11px] text-muted-foreground font-medium">
        {typingNames.length > 0 && (
          <>
            <div className="flex gap-1">
              <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce"></span>
            </div>
            <span>{typingNames.slice(0, 2).join(", ")}{typingNames.length > 2 ? " and others" : ""} typing…</span>
          </>
        )}
      </div>

      {/* AI Smart Quick-Replies Bar */}
      {smartReplies.length > 0 && (
        <AIQuickReplies
          suggestions={smartReplies}
          isLoading={smartRepliesLoading}
          onSelectReply={(reply) => {
            setText(reply);
            textareaRef.current?.focus();
          }}
          onRefresh={() => {
            const payload = messages.slice(-5).map(m => ({
              senderName: String(m.sender_id || m.sender || m.senderId || "") === me ? "Me" : "Them",
              message: m.message || m.body
            }));
            setSmartRepliesLoading(true);
            fetchSmartReplies(payload).then(res => {
              setSmartReplies(res || []);
              setSmartRepliesLoading(false);
            });
          }}
          onDismiss={() => setSmartReplies([])}
        />
      )}

      {/* Reply/Edit Bar */}
      {replyingTo && (
        <div className="flex items-center justify-between gap-3 bg-muted/80 dark:bg-muted/40 backdrop-blur-xs px-4 py-2 border-t border-border animate-in slide-in-from-bottom-2 shrink-0 z-10 shadow-xs">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-1 bg-primary h-8 rounded-full shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold text-primary uppercase tracking-wider truncate flex items-center gap-1.5">
                <Reply className="h-3 w-3" />
                <span>
                  Replying to {replyingTo.isAI 
                    ? "SendChat AI ✨" 
                    : (memberMap.get(String(replyingTo.senderId || replyingTo.sender_id || replyingTo.sender || ""))?.name 
                       || memberMap.get(String(replyingTo.senderId || replyingTo.sender_id || replyingTo.sender || ""))?.display_name
                       || (String(replyingTo.senderId || replyingTo.sender_id || replyingTo.sender || "") === me ? "You" : "User"))}
                </span>
              </div>
              <div className="text-xs text-muted-foreground truncate block max-w-full">
                {replyingTo.message || replyingTo.body}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setReplyingTo(null);
            }}
            className="shrink-0 h-7 w-7 rounded-full flex items-center justify-center hover:bg-background text-muted-foreground hover:text-foreground transition-all cursor-pointer border border-border/50 hover:border-border shadow-xs active:scale-95"
            title="Cancel reply (Esc)"
            aria-label="Cancel reply"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {editingMessage && (
        <div className="flex items-center justify-between gap-3 bg-primary/10 dark:bg-primary/5 px-4 py-2 border-t border-primary/20 animate-in slide-in-from-bottom-2 shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Pencil className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold text-primary uppercase tracking-wider truncate">Editing Message</div>
              <div className="text-xs text-muted-foreground truncate block max-w-full">{editingMessage.message || editingMessage.body}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setEditingMessage(null); setText(""); }}
            className="shrink-0 h-7 w-7 rounded-full flex items-center justify-center hover:bg-background/80 text-muted-foreground hover:text-foreground transition-all cursor-pointer border border-border/50 hover:border-border shadow-xs"
            title="Cancel edit"
            aria-label="Cancel edit"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Composer */}
      <div className="border-t border-border bg-card px-3 sm:px-4 py-2.5 sm:py-3 pb-[max(0.65rem,env(safe-area-inset-bottom))]">
        <div className="flex items-end gap-1.5 sm:gap-2">
          {/* AI Composer Magic Wand Menu */}
          <AIComposerMenu
            text={text}
            onRewrite={handleAIRewrite}
            isLoading={loadingAction === "rewrite"}
          />

          {/* Emoji Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors shrink-0" title="Emoji">
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
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={1}
            placeholder={isAIConversation ? "Ask SendChat AI anything… (or type @ai in any chat)" : "Type a message… (@ai for AI help)"}
            className="max-h-32 min-h-9 flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-base sm:text-sm outline-none focus:ring-2 focus:ring-ring"
          />

          <button
            onClick={() => handleSend()}
            disabled={sending || (!text.trim())}
            className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            title="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* AI Summary Modal */}
      <AISummaryModal
        open={summaryModalOpen}
        onOpenChange={setSummaryModalOpen}
        summary={threadSummary}
        isLoading={summaryLoading}
        onRegenerate={handleOpenSummary}
      />

      {/* End-to-End Chat Security Modal */}
      <ChatSecurityModal
        open={securityModalOpen}
        onOpenChange={setSecurityModalOpen}
        conversationName={isGroup ? (selectedConverstion?.name || "Group") : (otherMember?.name || otherMember?.display_name || "Contact")}
        conversationId={conversationId}
        isGroup={isGroup}
      />

      {/* Delete / Clear Conversation Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isAIConversation 
                ? "Clear AI Chat History?" 
                : (isGroup ? "Delete Group?" : "Delete Conversation?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isAIConversation 
                ? "This will clear all messages in this AI assistant session. You can start a fresh conversation anytime."
                : (isGroup 
                  ? "Are you sure you want to delete this group? All messages and group data will be permanently removed for all members."
                  : "Are you sure you want to delete this conversation? All messages will be permanently removed. This action cannot be undone.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              {isAIConversation ? "Clear History" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Exit Group Confirmation Dialog */}
      <AlertDialog open={exitDialogOpen} onOpenChange={setExitDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit Group?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to exit "{selectedConverstion?.name || "this group"}"? You will no longer receive messages or be able to participate in this group.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmExit}
              disabled={actionLoading}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Exit Group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Forward Message Modal */}
      <ForwardMessageModal
        open={forwardModalOpen}
        onOpenChange={setForwardModalOpen}
        messageToForward={messageToForward}
      />

      {/* Group Details & Member Management Modal */}
      <GroupDetailsModal
        open={groupDetailsModalOpen}
        onOpenChange={setGroupDetailsModalOpen}
        conversation={selectedConverstion}
      />
    </div>
  );
}

const MessageItem = memo(function MessageItem({
  msg, mine, isAI, sender, showHeader, reactions, onReact, onDelete, onEdit, onReply, onForward, onReplyClick, isHighlighted, meId,
  translatedText, showOriginal, onToggleOriginal, explanationText, onTranslate, onExplain, onAIReply, isAILoading
}) {
  const grouped = {};
  reactions.forEach((r) => { (grouped[r.emoji] ??= []).push(r); });

  const rawText = msg.message || msg.body;
  const displayText = translatedText && !showOriginal ? translatedText : rawText;
  const msgId = msg.id || msg._id;

  return (
    <div id={`msg-${msgId}`} className={"group mb-2.5 sm:mb-3 pt-1 flex gap-3 transition-all duration-300 relative " + (mine ? "justify-end " : "justify-start ") + (isHighlighted ? "bg-primary/10 ring-2 ring-primary/20 rounded-lg scale-[1.02] py-2 px-1" : "")}>
      {!mine && (
        <div className="w-7 shrink-0">
          {showHeader && (
            <ProfileHoverCard
              user={sender}
              isAI={isAI}
              side="right"
              align="start"
            >
              <div className="cursor-pointer">
                <UserAvatar
                  src={sender?.avatar_url || sender?.profilePic || sender?.profile}
                  name={sender?.display_name || sender?.name || sender?.username || "User"}
                  size="sm"
                  isAI={isAI}
                  className="mt-1"
                />
              </div>
            </ProfileHoverCard>
          )}
        </div>
      )}
      <div className={"max-w-[70%] " + (mine ? "items-end" : "items-start")}>
        <div className="relative">
          <div
            className={
              "rounded-2xl px-3.5 py-2 text-sm shadow-2xs " +
              (mine
                ? "bg-bubble-mine text-bubble-mine-foreground rounded-br-md"
                : isAI
                ? "bg-card border border-primary/20 text-foreground rounded-bl-md shadow-xs"
                : "bg-bubble-theirs text-bubble-theirs-foreground rounded-bl-md")
            }
          >
            {msg.isDeleted ? (
              <div className="italic opacity-60 text-xs py-1">
                This message was deleted by its author
              </div>
            ) : (
              <>
                {/* Forwarded Badge */}
                {msg.isForwarded && (
                  <div className={"flex items-center gap-1 mb-1 text-[10px] font-medium italic opacity-75 " + (mine ? "text-bubble-mine-foreground" : "text-bubble-theirs-foreground")}>
                    <Forward className="h-3 w-3" />
                    <span>Forwarded</span>
                  </div>
                )}

                {msg.replyTo && (
                  <div 
                    onClick={() => onReplyClick && onReplyClick(msg.replyTo._id || msg.replyTo.id)}
                    className={"mb-2 cursor-pointer border-l-2 border-primary/40 bg-black/5 px-2 py-1 rounded hover:bg-black/10 transition-colors " + (mine ? "text-bubble-mine-foreground/80" : "text-bubble-theirs-foreground/80")}
                  >
                    <div className="text-[10px] font-bold">Replying to...</div>
                    <div className="text-xs truncate italic">{msg.replyTo.message || msg.replyTo.body}</div>
                  </div>
                )}

                {/* Translation Badge */}
                {translatedText && (
                  <div className="flex items-center gap-1.5 mb-1.5 text-[10px] text-primary font-medium border-b border-border/40 pb-1">
                    <Globe className="h-3 w-3" />
                    <span>{showOriginal ? "Original Text" : "Translated with AI"}</span>
                    <button
                      onClick={() => onToggleOriginal && onToggleOriginal(msgId)}
                      className="ml-auto underline hover:opacity-80 text-[10px]"
                    >
                      {showOriginal ? "View Translation" : "View Original"}
                    </button>
                  </div>
                )}

                <div className="relative pb-2">
                  <div className="whitespace-pre-wrap break-words pr-20 leading-relaxed min-w-[90px]">
                    {displayText}
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

                {/* AI Explanation Box */}
                {explanationText && (
                  <div className="mt-2 pt-2 border-t border-border/50 bg-primary/5 rounded-lg p-2 text-xs text-foreground/90 animate-in fade-in">
                    <div className="flex items-center gap-1 font-semibold text-[10px] text-primary uppercase tracking-wider mb-1">
                      <Sparkles className="h-3 w-3" /> AI Breakdown
                    </div>
                    <div className="whitespace-pre-wrap">{explanationText}</div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Hover Menu */}
          <div className={"absolute -top-7 sm:-top-8 hidden items-center gap-0.5 rounded-full border border-border/80 bg-card/95 backdrop-blur-xs px-1.5 py-0.5 shadow-md group-hover:flex z-20 transition-all " + (mine ? "right-0" : "left-0")}>
            {!msg.isDeleted && (
              <div className="flex items-center border-r border-border pr-0.5 mr-0.5">
                {EMOJIS.slice(0, 4).map((e) => (
                  <button key={e} onClick={() => onReact && onReact(msgId, e)} className="grid h-6 w-6 place-items-center rounded-full hover:bg-accent text-xs">
                    {e}
                  </button>
                ))}
              </div>
            )}
            
            {!msg.isDeleted && (
              <>
                {/* AI Translate */}
                <button 
                  onClick={() => onTranslate && onTranslate(msgId, rawText)} 
                  disabled={isAILoading}
                  className="grid h-6 w-6 place-items-center rounded-full hover:bg-accent text-muted-foreground hover:text-primary transition-colors disabled:opacity-50" 
                  title="Translate with AI"
                >
                  {isAILoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
                </button>

                {/* AI Explain */}
                <button 
                  onClick={() => onExplain && onExplain(msgId, rawText)} 
                  disabled={isAILoading}
                  className="grid h-6 w-6 place-items-center rounded-full hover:bg-accent text-muted-foreground hover:text-primary transition-colors disabled:opacity-50" 
                  title="Explain message with AI"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                </button>

                {/* AI Reply */}
                {!mine && (
                  <button 
                    onClick={() => onAIReply && onAIReply(msg)} 
                    className="grid h-6 w-6 place-items-center rounded-full hover:bg-accent text-muted-foreground hover:text-primary transition-colors" 
                    title="Generate AI reply to this"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                  </button>
                )}

                <button onClick={() => onReply && onReply(msg)} className="grid h-6 w-6 place-items-center rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="Reply">
                  <Reply className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => onForward && onForward(msg)} className="grid h-6 w-6 place-items-center rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="Forward">
                  <Forward className="h-3.5 w-3.5" />
                </button>
                {mine && (
                  <button onClick={() => onEdit && onEdit(msg)} className="grid h-6 w-6 place-items-center rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="Edit">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
                {mine && (
                  <button onClick={() => onDelete && onDelete(msgId)} className="grid h-6 w-6 place-items-center rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Delete">
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
});

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
