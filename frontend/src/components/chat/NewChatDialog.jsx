import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, Users, User as UserIcon, Check } from "lucide-react";

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

  useEffect(() => {
    if (!open) { setQ(""); setSelected([]); setGroupName(""); setTab("dm"); }
  }, [open]);

  useEffect(() => {
    if (onSearch) {
      const t = setTimeout(() => {
        onSearch(q);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [q, onSearch]);

  const toggle = (p) => {
    setSelected((prev) => prev.some((x) => (x.id || x._id) === (p.id || p._id)) 
      ? prev.filter((x) => (x.id || x._id) !== (p.id || p._id)) 
      : [...prev, p]);
  };

  const handleAction = () => {
    if (tab === "group") {
      if (!groupName.trim()) return toast.error("Give the group a name");
      if (selected.length === 0) return toast.error("Pick at least one person");
      onStartChat && onStartChat("group", { name: groupName, members: selected });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-background border-border">
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
          <DialogDescription>Start a direct message or create a group.</DialogDescription>
        </DialogHeader>

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

        {tab === "group" && (
          <div className="space-y-1.5 mb-4">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Group Name</label>
            <input
              value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Marketing Team..."
              className="w-full rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Search People</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-muted-foreground/50" />
            <input
              value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email..."
              className="w-full rounded-xl border border-border bg-muted/30 py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
            />
          </div>
        </div>

        {tab === "group" && selected.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {selected.map((p) => (
              <button key={p.id || p._id} onClick={() => toggle(p)}
                className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
                {p.display_name || p.username || p.email}
                <span className="opacity-60 text-lg leading-none">×</span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 max-h-[300px] overflow-y-auto rounded-xl border border-border bg-muted/10">
          {searchResults.length === 0 && !isLoading && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              {q ? "No users found" : "Search to find people"}
            </div>
          )}
          
          {searchResults.map((p) => {
            const userId = p.id || p._id;
            const sel = selected.some((x) => (x.id || x._id) === userId);
            return (
              <button
                key={userId}
                onClick={() => tab === "dm" ? (onStartChat && onStartChat("dm", p)) : toggle(p)}
                className="flex w-full items-center gap-3 border-b border-border/50 px-4 py-3 text-left last:border-b-0 hover:bg-muted/50 transition-colors"
              >
                {p.avatar_url || p.profilePic
                  ? <img src={p.avatar_url || p.profilePic} className="h-10 w-10 rounded-full object-cover border border-border" alt="" />
                  : <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary border border-primary/20">
                      {(p.display_name || p.username || p.email || "?").slice(0, 2).toUpperCase()}
                    </div>}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{p.display_name || p.username || "Unnamed"}</div>
                  <div className="truncate text-xs text-muted-foreground/70">{p.email}</div>
                </div>
                {tab === "group" && (
                  <div className={"h-5 w-5 rounded-full border flex items-center justify-center transition-all " + (sel ? "bg-primary border-primary" : "border-border")}>
                    {sel && <Check className="h-3 w-3 text-primary-foreground stroke-[3px]" />}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {tab === "group" && (
          <DialogFooter className="mt-6">
            <button
              onClick={handleAction}
              disabled={isLoading || selected.length === 0 || !groupName.trim()}
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-primary/20"
            >
              Create Group ({selected.length})
            </button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
