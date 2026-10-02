import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, Users, User as UserIcon, Check, Loader2, Sparkles, Shield, Image } from "lucide-react";
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
  const [tab, setTab] = useState("dm");
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
    setSelected((prev) => prev.some((x) => (x.id || x._id) === (p.id || p._id))
      ? prev.filter((x) => (x.id || x._id) !== (p.id || p._id))
      : [...prev, p]);
  };

  const handleAction = () => {
    if (tab === "group") {
      if (!groupName.trim()) return toast.error("Please enter a group name");
      if (selected.length === 0) return toast.error("Pick at least one member to join the group");
      
      const chosenAvatar = customLogoUrl.trim() || selectedLogo?.emoji || "👥";
      onStartChat && onStartChat("group", { 
        name: groupName.trim(), 
        members: selected,
        groupAvatar: chosenAvatar
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[94vw] max-h-[90dvh] overflow-y-auto bg-background border-border p-5 sm:p-6">
        {confirmDm ? (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="mb-6">
              <UserAvatar
                src={confirmDm.profile || confirmDm.avatar_url || confirmDm.profilePic}
                name={confirmDm.name || confirmDm.display_name || confirmDm.username || confirmDm.email}
                size="2xl"
                className="border-4 border-primary/20 shadow-xl"
              />
            </div>
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-bold">Start Conversation?</DialogTitle>
              <DialogDescription className="text-base mt-2">
                Would you like to start a chat with <span className="font-semibold text-foreground">{confirmDm.name || confirmDm.display_name || confirmDm.email}</span>?
              </DialogDescription>
            </DialogHeader>
            <div className="flex w-full flex-col gap-3">
              <button
                onClick={() => {
                  onStartChat && onStartChat("dm", confirmDm);
                  setConfirmDm(null);
                  onOpenChange(false);
                }}
                className="w-full rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-[0.98]"
              >
                Start Chatting
              </button>
              <button
                onClick={() => setConfirmDm(null)}
                className="w-full rounded-xl bg-muted px-6 py-3.5 text-sm font-semibold text-muted-foreground hover:bg-muted/80 transition-all"
              >
                Go Back
              </button>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                New Conversation
                <span className="text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  E2E Encrypted
                </span>
              </DialogTitle>
              <DialogDescription>Start a direct message or create a group with friends and colleagues.</DialogDescription>
            </DialogHeader>

            {/* Direct vs Group Tabs */}
            <div className="mb-4 flex gap-1 rounded-xl bg-muted p-1 text-sm font-medium">
              <button
                onClick={() => setTab("dm")}
                className={"flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2 transition-all " + (tab === "dm" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:bg-background/50")}
              >
                <UserIcon className="h-4 w-4" /> Direct
              </button>
              <button
                onClick={() => setTab("group")}
                className={"flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2 transition-all " + (tab === "group" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:bg-background/50")}
              >
                <Users className="h-4 w-4" /> Group
              </button>
            </div>

            {/* Group Configuration: Name & Logo */}
            {tab === "group" && (
              <div className="space-y-3 mb-4 rounded-xl border border-border/70 bg-muted/20 p-3.5">
                <div className="flex items-center gap-3">
                  {/* Live Group Logo Preview */}
                  <div className="shrink-0">
                    {customLogoUrl.trim() ? (
                      <img src={customLogoUrl} alt="Group Logo" className="h-12 w-12 rounded-2xl object-cover border-2 border-primary/40 shadow-sm" onError={(e) => { e.target.style.display = 'none'; }} />
                    ) : (
                      <div className={`h-12 w-12 rounded-2xl ${selectedLogo.bg} grid place-items-center text-xl text-white shadow-md border border-white/20`}>
                        {selectedLogo.emoji}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Group Name</label>
                    <input
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="e.g. Project Alpha, Design Team..."
                      className="w-full mt-0.5 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50 font-medium"
                    />
                  </div>
                </div>

                {/* Group Logo Selector */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Choose Group Logo</label>
                    <button
                      type="button"
                      onClick={() => setShowCustomUrlInput(!showCustomUrlInput)}
                      className="text-[10px] font-semibold text-primary hover:underline flex items-center gap-1"
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
                      className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
                    />
                  ) : (
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
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
                            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
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
            )}

            {/* Search Box */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between ml-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {q.trim() ? `Search Results (${searchResults.length})` : `People Who Joined SendChat (${searchResults.length})`}
                </label>
                {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-muted-foreground/50" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Filter by name or email..."
                  className="w-full rounded-xl border border-border bg-muted/30 py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
                />
              </div>
            </div>

            {/* Selected Members Chips in Group Mode */}
            {tab === "group" && selected.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5 max-h-20 overflow-y-auto p-1">
                {selected.map((p) => (
                  <button
                    key={p.id || p._id}
                    onClick={() => toggle(p)}
                    className="flex items-center gap-1.5 rounded-full bg-primary/15 border border-primary/30 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/25 transition-all"
                  >
                    <span>{p.name || p.display_name || p.email}</span>
                    <span className="opacity-70 text-sm leading-none font-bold">×</span>
                  </button>
                ))}
              </div>
            )}

            {/* Users List */}
            <div className="mt-3 max-h-[280px] overflow-y-auto rounded-xl border border-border bg-muted/10 divide-y divide-border/50">
              {searchResults.length === 0 && !isLoading && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {q.trim() ? "No users found matching your search" : "No other users have joined yet. As soon as users register, they will appear here automatically."}
                </div>
              )}

              {searchResults.map((p) => {
                const userId = p.id || p._id;
                const sel = selected.some((x) => (x.id || x._id) === userId);
                const userInitial = (p.name || p.display_name || p.email || "?").slice(0, 1).toUpperCase();

                return (
                  <button
                    key={userId}
                    onClick={() => tab === "dm" ? setConfirmDm(p) : toggle(p)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors group"
                  >
                    {/* User Avatar */}
                    <UserAvatar
                      src={p.profile || p.avatar_url || p.profilePic}
                      name={p.name || p.display_name || p.email}
                      size="md"
                      online={true}
                      showOnlineDot={true}
                    />

                    {/* Name & Email */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-semibold text-foreground">{p.name || p.display_name || "SendChat User"}</span>
                        <span className="text-[9px] font-medium text-muted-foreground/60 bg-muted px-1.5 py-0.2 rounded">Joined</span>
                      </div>
                      <div className="truncate text-xs text-muted-foreground/70">{p.email}</div>
                    </div>

                    {/* Action Indicator */}
                    {tab === "group" ? (
                      <div className={"h-5 w-5 rounded-full border flex items-center justify-center transition-all " + (sel ? "bg-primary border-primary shadow-xs" : "border-border/80 group-hover:border-primary/50")}>
                        {sel && <Check className="h-3 w-3 text-primary-foreground stroke-[3px]" />}
                      </div>
                    ) : (
                      <div className="shrink-0 text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity px-2.5 py-1 rounded-md bg-primary/10">
                        Chat
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Group Footer */}
            {tab === "group" && (
              <DialogFooter className="mt-4">
                <button
                  onClick={handleAction}
                  disabled={isLoading || selected.length === 0 || !groupName.trim()}
                  className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  Create Group ({selected.length} {selected.length === 1 ? "member" : "members"})
                </button>
              </DialogFooter>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
