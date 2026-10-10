import { useEffect, useState } from "react";
import {
  Dialog, DialogContent,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  Search, Users, User as UserIcon, Check, Loader2, Sparkles, ShieldCheck, 
  Image, MessageSquarePlus, ArrowRight, X, Shield
} from "lucide-react";
import { UserAvatar } from "../common/UserAvatar";

const PRESET_GROUP_LOGOS = [
  { id: "team", emoji: "👥", bg: "bg-gradient-to-tr from-blue-600 to-indigo-600", label: "Team" },
  { id: "rocket", emoji: "🚀", bg: "bg-gradient-to-tr from-purple-600 to-pink-600", label: "Projects" },
  { id: "idea", emoji: "💡", bg: "bg-gradient-to-tr from-amber-500 to-orange-500", label: "Ideas" },
  { id: "gaming", emoji: "🎮", bg: "bg-gradient-to-tr from-emerald-600 to-teal-600", label: "Gaming" },
  { id: "lounge", emoji: "☕", bg: "bg-gradient-to-tr from-rose-500 to-red-500", label: "Lounge" },
  { id: "spark", emoji: "⚡", bg: "bg-gradient-to-tr from-yellow-500 to-amber-600", label: "Sprint" },
  { id: "global", emoji: "🌐", bg: "bg-gradient-to-tr from-cyan-600 to-blue-500", label: "Community" },
  { id: "lock", emoji: "🔒", bg: "bg-gradient-to-tr from-slate-700 to-zinc-900", label: "Private" },
];

export function NewChatDialog({
  open,
  onOpenChange,
  onStartChat,
  onSearch,
  searchResults = [],
  isLoading = false
}) {
  const [tab, setTab] = useState("dm"); // 'dm' | 'group'
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [selectedLogo, setSelectedLogo] = useState(PRESET_GROUP_LOGOS[0]);
  const [customLogoUrl, setCustomLogoUrl] = useState("");
  const [showCustomUrlInput, setShowCustomUrlInput] = useState(false);
  const [confirmDm, setConfirmDm] = useState(null);

  useEffect(() => {
    if (!open) {
      setQ("");
      setSelected([]);
      setGroupName("");
      setTab("dm");
      setConfirmDm(null);
      setSelectedLogo(PRESET_GROUP_LOGOS[0]);
      setCustomLogoUrl("");
      setShowCustomUrlInput(false);
    }
  }, [open]);

  useEffect(() => {
    if (open && onSearch && !confirmDm) {
      const t = setTimeout(() => {
        onSearch(q);
      }, 250);
      return () => clearTimeout(t);
    }
  }, [q, onSearch, confirmDm, open]);

  const toggle = (p) => {
    const id = p.id || p._id;
    setSelected((prev) =>
      prev.some((x) => (x.id || x._id) === id)
        ? prev.filter((x) => (x.id || x._id) !== id)
        : [...prev, p]
    );
  };

  const handleAction = () => {
    if (tab === "group") {
      if (!groupName.trim()) return toast.error("Please enter a group name");
      if (selected.length === 0) return toast.error("Pick at least one member to join the group");

      const chosenAvatar = customLogoUrl.trim() || selectedLogo?.emoji || "👥";
      onStartChat && onStartChat("group", {
        name: groupName.trim(),
        members: selected,
        groupAvatar: chosenAvatar,
      });
      onOpenChange(false);
    }
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
                  <MessageSquarePlus className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground leading-tight">New Chat</h2>
                  <p className="text-[11px] text-muted-foreground">Start conversations</p>
                </div>
              </div>
            </div>

            {/* Vertical Tabs */}
            <nav className="p-2 md:p-3 flex md:flex-col gap-1.5 overflow-x-auto md:overflow-x-visible">
              <button
                type="button"
                onClick={() => {
                  setTab("dm");
                  setConfirmDm(null);
                }}
                className={`flex-1 md:flex-initial flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all ${
                  tab === "dm"
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground font-medium"
                }`}
              >
                <div className={`h-8 w-8 rounded-lg grid place-items-center shrink-0 ${
                  tab === "dm" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                }`}>
                  <UserIcon className="h-4 w-4" />
                </div>
                <div className="hidden md:block min-w-0">
                  <div className="text-xs font-semibold leading-tight">Direct Message</div>
                  <div className={`text-[10px] truncate ${tab === "dm" ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                    1-on-1 private chat
                  </div>
                </div>
                <span className="md:hidden text-xs font-semibold">Direct</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTab("group");
                  setConfirmDm(null);
                }}
                className={`flex-1 md:flex-initial flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all ${
                  tab === "group"
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground font-medium"
                }`}
              >
                <div className={`h-8 w-8 rounded-lg grid place-items-center shrink-0 ${
                  tab === "group" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                }`}>
                  <Users className="h-4 w-4" />
                </div>
                <div className="hidden md:block min-w-0">
                  <div className="text-xs font-semibold leading-tight">Group Chat</div>
                  <div className={`text-[10px] truncate ${tab === "group" ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                    Multi-user channel
                  </div>
                </div>
                <span className="md:hidden text-xs font-semibold">Group</span>
              </button>
            </nav>
          </div>

          {/* Sidebar Context Card (Desktop only) */}
          <div className="hidden md:block p-3.5 m-3 rounded-xl bg-card border border-border/80 shadow-2xs">
            {tab === "group" ? (
              <div className="space-y-2.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Group Preview
                </div>
                <div className="flex items-center gap-3">
                  <div className="shrink-0">
                    {customLogoUrl.trim() ? (
                      <img
                        src={customLogoUrl}
                        alt="Group Logo"
                        className="h-10 w-10 rounded-xl object-cover border border-primary/30"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className={`h-10 w-10 rounded-xl ${selectedLogo.bg} grid place-items-center text-lg text-white shadow-xs`}>
                        {selectedLogo.emoji}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-foreground truncate">
                      {groupName.trim() || "Untitled Group"}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {selected.length} {selected.length === 1 ? "member" : "members"} selected
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                  <ShieldCheck className="h-4 w-4" /> E2E Encrypted
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Direct chats are secured with end-to-end cryptographic keys. Only you and the recipient can read messages.
                </p>
              </div>
            )}
          </div>
        </aside>

        {/* Right Content Pane */}
        <section className="flex-1 min-h-0 flex flex-col overflow-hidden bg-background">
          {confirmDm ? (
            /* Confirmation View */
            <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
              <div className="mb-5 relative">
                <UserAvatar
                  src={confirmDm.profile || confirmDm.avatar_url || confirmDm.profilePic}
                  name={confirmDm.name || confirmDm.display_name || confirmDm.username || confirmDm.email}
                  size="2xl"
                  online={true}
                  showOnlineDot={true}
                  className="border-4 border-primary/20 shadow-xl"
                />
              </div>
              <h3 className="text-xl font-bold text-foreground">
                Start Chat with {confirmDm.name || confirmDm.display_name || "User"}?
              </h3>
              <p className="text-xs text-muted-foreground mt-1.5 max-w-xs leading-relaxed">
                Connect and exchange end-to-end encrypted messages, voice clips, files, and reactions.
              </p>

              <div className="flex w-full flex-col gap-2.5 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    onStartChat && onStartChat("dm", confirmDm);
                    setConfirmDm(null);
                    onOpenChange(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-md shadow-primary/20 active:scale-98 cursor-pointer"
                >
                  <span>Open Conversation</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDm(null)}
                  className="w-full rounded-xl bg-muted px-5 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all cursor-pointer"
                >
                  Choose Someone Else
                </button>
              </div>
            </div>
          ) : tab === "dm" ? (
            /* Direct Message User Selection */
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              {/* Header with Search */}
              <div className="p-4 md:p-5 pr-12 border-b border-border/60 shrink-0 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-foreground">Select a Contact</h3>
                    <p className="text-xs text-muted-foreground">Search and connect with friends and teammates</p>
                  </div>
                  <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {searchResults.length} {searchResults.length === 1 ? "user" : "users"}
                  </span>
                </div>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground/60" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search by name, username or email..."
                    className="w-full rounded-xl border border-border bg-muted/20 py-2 pl-9 pr-8 text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50 font-medium"
                  />
                  {isLoading && (
                    <Loader2 className="absolute right-3 top-2.5 h-3.5 w-3.5 animate-spin text-primary" />
                  )}
                  {q && !isLoading && (
                    <button
                      onClick={() => setQ("")}
                      className="absolute right-2.5 top-2 h-4 w-4 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Scrollable User List */}
              <div className="flex-1 overflow-y-auto divide-y divide-border/40 scrollbar-thin">
                {searchResults.length === 0 && !isLoading && (
                  <div className="p-10 text-center space-y-2">
                    <p className="text-xs text-muted-foreground">
                      {q.trim() ? "No users matching your search." : "No registered contacts found yet."}
                    </p>
                    <p className="text-[11px] text-muted-foreground/70">
                      As soon as users register on SendChat, they will appear here automatically.
                    </p>
                  </div>
                )}

                {searchResults.map((p) => {
                  const userId = p.id || p._id;
                  return (
                    <div
                      key={userId}
                      onClick={() => setConfirmDm(p)}
                      className="flex items-center justify-between p-3.5 px-5 hover:bg-muted/40 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <UserAvatar
                          src={p.profile || p.avatar_url || p.profilePic}
                          name={p.name || p.display_name || p.email}
                          size="md"
                          online={true}
                          showOnlineDot={true}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                              {p.name || p.display_name || "SendChat User"}
                            </span>
                            <span className="text-[9px] font-medium text-muted-foreground bg-muted px-1.5 py-0.2 rounded">
                              Contact
                            </span>
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">{p.email}</div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground text-xs font-semibold transition-all shadow-2xs group-hover:scale-102"
                      >
                        <span>Chat</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Group Chat Setup */
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              {/* Header */}
              <div className="p-4 md:p-5 pr-12 border-b border-border/60 shrink-0">
                <h3 className="text-base font-bold text-foreground">Create New Group</h3>
                <p className="text-xs text-muted-foreground">Configure group details and invite members to participate</p>
              </div>

              {/* Scrollable Setup & Member Picker */}
              <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-5 scrollbar-thin">
                {/* Group Details Card */}
                <div className="p-4 rounded-2xl border border-border bg-card/60 space-y-4">
                  <div className="flex items-center gap-3.5">
                    {/* Live Logo Preview */}
                    <div className="shrink-0">
                      {customLogoUrl.trim() ? (
                        <img
                          src={customLogoUrl}
                          alt="Group Logo"
                          className="h-12 w-12 rounded-2xl object-cover border-2 border-primary/40 shadow-sm"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div className={`h-12 w-12 rounded-2xl ${selectedLogo.bg} grid place-items-center text-xl text-white shadow-md border border-white/20`}>
                          {selectedLogo.emoji}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Group Name
                      </label>
                      <input
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        placeholder="e.g. Design Sync, Engineering, Friends..."
                        className="w-full mt-1 rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all font-semibold"
                      />
                    </div>
                  </div>

                  {/* Logo Selector */}
                  <div className="space-y-2 pt-1 border-t border-border/50">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Choose Group Icon
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowCustomUrlInput(!showCustomUrlInput)}
                        className="text-[10px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Image className="h-3 w-3" />
                        {showCustomUrlInput ? "Use preset icons" : "Custom image URL"}
                      </button>
                    </div>

                    {showCustomUrlInput ? (
                      <input
                        value={customLogoUrl}
                        onChange={(e) => setCustomLogoUrl(e.target.value)}
                        placeholder="https://example.com/logo.png"
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                      />
                    ) : (
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                        {PRESET_GROUP_LOGOS.map((logo) => {
                          const isSelected = selectedLogo.id === logo.id && !customLogoUrl;
                          return (
                            <button
                              key={logo.id}
                              type="button"
                              onClick={() => {
                                setSelectedLogo(logo);
                                setCustomLogoUrl("");
                              }}
                              className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-primary/20 border-2 border-primary scale-105 shadow-sm"
                                  : "bg-muted/60 hover:bg-muted border border-border/40 hover:scale-102"
                              }`}
                              title={logo.label}
                            >
                              <span className="text-lg leading-none">{logo.emoji}</span>
                              <span className="text-[9px] mt-1 text-muted-foreground font-medium truncate w-full text-center">
                                {logo.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Selected Member Chips */}
                {selected.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
                      <span>Selected Members ({selected.length})</span>
                      <button
                        type="button"
                        onClick={() => setSelected([])}
                        className="text-primary hover:underline lowercase"
                      >
                        clear all
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 p-2 rounded-xl border border-border bg-muted/20 max-h-24 overflow-y-auto scrollbar-thin">
                      {selected.map((p) => {
                        const id = p.id || p._id;
                        return (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 border border-primary/30 px-2.5 py-0.5 text-xs font-semibold text-primary"
                          >
                            <span>{p.name || p.display_name || p.email}</span>
                            <button
                              type="button"
                              onClick={() => toggle(p)}
                              className="text-primary hover:text-foreground transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Member Search & Checklist */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Add Members
                    </label>
                    {isLoading && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                  </div>

                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground/60" />
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Filter members by name..."
                      className="w-full rounded-xl border border-border bg-muted/20 py-2 pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                    />
                  </div>

                  <div className="rounded-xl border border-border bg-muted/10 divide-y divide-border/40 max-h-56 overflow-y-auto scrollbar-thin">
                    {searchResults.length === 0 && !isLoading && (
                      <div className="p-4 text-center text-xs text-muted-foreground">
                        No contacts available.
                      </div>
                    )}

                    {searchResults.map((p) => {
                      const id = p.id || p._id;
                      const isSel = selected.some((x) => (x.id || x._id) === id);

                      return (
                        <div
                          key={id}
                          onClick={() => toggle(p)}
                          className={`flex items-center justify-between p-3 px-4 hover:bg-muted/40 transition-colors cursor-pointer ${
                            isSel ? "bg-primary/5" : ""
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <UserAvatar
                              src={p.profile || p.avatar_url || p.profilePic}
                              name={p.name || p.display_name || p.email}
                              size="sm"
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-foreground truncate">
                                {p.name || p.display_name || "User"}
                              </div>
                              <div className="text-[10px] text-muted-foreground truncate">{p.email}</div>
                            </div>
                          </div>

                          <div
                            className={`h-5 w-5 rounded-md border flex items-center justify-center transition-all ${
                              isSel ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40"
                            }`}
                          >
                            {isSel && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Group Sticky Footer */}
              <div className="border-t border-border/70 p-3.5 px-6 bg-card/60 backdrop-blur-xs flex items-center justify-between shrink-0">
                <span className="text-xs text-muted-foreground font-medium">
                  {selected.length} {selected.length === 1 ? "member" : "members"} selected
                </span>
                <button
                  type="button"
                  onClick={handleAction}
                  disabled={isLoading || selected.length === 0 || !groupName.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all shadow-md shadow-primary/20 active:scale-95 cursor-pointer"
                >
                  <Users className="h-4 w-4" />
                  <span>Create Group ({selected.length})</span>
                </button>
              </div>
            </div>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}

export default NewChatDialog;
