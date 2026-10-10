import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { 
  Users, UserPlus, Crown, ShieldCheck, Search, Check, 
  X, Loader2, LogOut, Calendar, UserMinus, Edit3, Save, Image, Sparkles
} from 'lucide-react';
import {
  Dialog, DialogContent,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { UserAvatar } from '../common/UserAvatar';
import { api } from '../../lib/api';
import { useAuthContext } from '../../context/AuthContext';
import { useSocketContext } from '../../context/SocketContext';
import useConverstion from '../../zustand/useConverstion';
import useDeleteConversation from '../../hooks/useDeleteConversation';

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

export function GroupDetailsModal({ open, onOpenChange, conversation, conversationId: passedConvId }) {
  const { authUser } = useAuthContext();
  const { onlineUsers } = useSocketContext();
  const { updateConversation, setSelectedConverstion } = useConverstion();
  const { exitGroup, loading: exitLoading } = useDeleteConversation();

  const [groupDetails, setGroupDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchMemberQuery, setSearchMemberQuery] = useState("");
  
  // Group editing states (admin only)
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [selectedLogo, setSelectedLogo] = useState(PRESET_GROUP_LOGOS[0]);
  const [customLogoUrl, setCustomLogoUrl] = useState("");
  const [showCustomUrlInput, setShowCustomUrlInput] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  // Add member section states
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loadingAvailableUsers, setLoadingAvailableUsers] = useState(false);
  const [selectedNewMemberIds, setSelectedNewMemberIds] = useState([]);
  const [addingLoading, setAddingLoading] = useState(false);
  const [newMemberSearch, setNewMemberSearch] = useState("");

  const [confirmExitOpen, setConfirmExitOpen] = useState(false);

  const groupId = passedConvId || conversation?._id || conversation?.id || conversation?.conversationId || groupDetails?._id;

  // Fetch full group details when modal opens
  useEffect(() => {
    if (!open || !groupId) return;

    let isMounted = true;
    setLoading(true);
    setIsEditing(false);
    setIsAddingMembers(false);

    const fetchDetails = async () => {
      try {
        const data = await api.get(`/api/users/group/${groupId}`);
        if (isMounted) {
          setGroupDetails(data);
          setEditName(data.name || "");
          if (data.groupAvatar && data.groupAvatar.startsWith("http")) {
            setCustomLogoUrl(data.groupAvatar);
            setShowCustomUrlInput(true);
          } else {
            const matched = PRESET_GROUP_LOGOS.find(l => l.emoji === data.groupAvatar);
            if (matched) setSelectedLogo(matched);
          }
        }
      } catch (err) {
        if (isMounted) {
          // Fallback to conversation props if direct fetch fails
          const fallbackData = {
            _id: groupId,
            name: conversation?.name || conversation?.chatName,
            groupAvatar: conversation?.groupAvatar,
            groupAdmin: conversation?.groupAdmin || conversation?.participated?.[0],
            participated: conversation?.participated || [],
            membersCount: conversation?.membersCount || conversation?.participated?.length || 0,
            createdAt: conversation?.createdAt || new Date().toISOString()
          };
          setGroupDetails(fallbackData);
          setEditName(fallbackData.name || "");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDetails();
    return () => { isMounted = false; };
  }, [open, groupId, conversation]);

  const groupName = groupDetails?.name || conversation?.name || "Group Chat";
  const groupAvatar = groupDetails?.groupAvatar || conversation?.groupAvatar;
  const admin = groupDetails?.groupAdmin || conversation?.groupAdmin || groupDetails?.participated?.[0];
  const adminId = admin ? String(admin._id || admin.id || admin) : null;
  const myId = String(authUser?._id || authUser?.id || "");
  const isMeAdmin = adminId === myId;

  const participants = groupDetails?.participated || conversation?.participated || [];

  // Handle saving group updates (admin only)
  const handleSaveGroupEdit = async () => {
    if (!editName.trim()) {
      toast.error("Group name cannot be empty");
      return;
    }
    const targetGroupId = groupId || conversation?._id || conversation?.id || groupDetails?._id;
    if (!targetGroupId) {
      toast.error("Could not find group ID. Please re-open the conversation.");
      return;
    }
    setEditLoading(true);
    try {
      const chosenAvatar = customLogoUrl.trim() || selectedLogo?.emoji || groupAvatar || "👥";
      const payload = {
        name: editName.trim(),
        groupAvatar: chosenAvatar
      };

      let res;
      try {
        res = await api.put(`/api/users/group/${targetGroupId}`, payload);
      } catch (putErr) {
        // Fallback to POST /update or POST /:id if PUT returns 404
        if (putErr.status === 404 || String(putErr.message).includes("404")) {
          res = await api.post(`/api/users/group/${targetGroupId}/update`, payload);
        } else {
          throw putErr;
        }
      }

      toast.success(res.message || "Group updated successfully!");
      if (res.group) {
        setGroupDetails(prev => ({
          ...prev,
          name: res.group.name,
          groupAvatar: res.group.groupAvatar
        }));
        updateConversation(targetGroupId, {
          name: res.group.name,
          chatName: res.group.name,
          groupAvatar: res.group.groupAvatar,
          profile: res.group.groupAvatar
        });
        setSelectedConverstion(prev => ({
          ...prev,
          name: res.group.name,
          chatName: res.group.name,
          groupAvatar: res.group.groupAvatar,
          profile: res.group.groupAvatar
        }));
      }
      setIsEditing(false);
    } catch (err) {
      toast.error(err.message || "Failed to update group. Please check backend server.");
    } finally {
      setEditLoading(false);
    }
  };

  // Load available users to add
  const handleOpenAddMembers = async () => {
    setIsAddingMembers(true);
    setLoadingAvailableUsers(true);
    setSelectedNewMemberIds([]);
    try {
      const users = await api.get('/api/users/search');
      const currentMemberIds = new Set(
        (groupDetails?.participated || conversation?.participated || []).map(p => 
          typeof p === 'object' ? (p._id || p.id)?.toString() : p?.toString()
        )
      );
      const nonMembers = (Array.isArray(users) ? users : []).filter(
        u => !currentMemberIds.has(u._id?.toString()) && !u.isAI
      );
      setAvailableUsers(nonMembers);
    } catch (err) {
      toast.error("Failed to load contacts to add");
    } finally {
      setLoadingAvailableUsers(false);
    }
  };

  const toggleSelectNewMember = (userId) => {
    setSelectedNewMemberIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    );
  };

  const handleConfirmAddMembers = async () => {
    if (selectedNewMemberIds.length === 0) return;
    setAddingLoading(true);
    try {
      const res = await api.post(`/api/users/group/${groupId}/members`, {
        memberIds: selectedNewMemberIds
      });

      toast.success(res.message || "Members added to group");
      if (res.group) {
        setGroupDetails(res.group);
        updateConversation(groupId, {
          participated: res.group.participated,
          membersCount: res.group.membersCount,
          lastMessage: res.group.lastMessage,
          lastMessageTime: res.group.lastMessageTime
        });
        setSelectedConverstion(prev => ({
          ...prev,
          participated: res.group.participated,
          membersCount: res.group.membersCount
        }));
      }
      setIsAddingMembers(false);
      setSelectedNewMemberIds([]);
    } catch (err) {
      toast.error(err.message || "Failed to add members to group");
    } finally {
      setAddingLoading(false);
    }
  };

  const handleExitGroup = async () => {
    await exitGroup(groupId);
    setConfirmExitOpen(false);
    onOpenChange(false);
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName} from the group?`)) return;
    try {
      const res = await api.post(`/api/users/group/${groupId}/remove-member`, { memberId });
      toast.success(res.message || "Member removed from group");
      setGroupDetails(prev => {
        if (!prev) return prev;
        const newPart = (prev.participated || []).filter(p => String(p._id || p.id || p) !== String(memberId));
        return { ...prev, participated: newPart, membersCount: newPart.length };
      });
      updateConversation(groupId, {
        participated: (conversation?.participated || []).filter(p => String(p._id || p.id || p) !== String(memberId)),
        membersCount: Math.max(0, (conversation?.membersCount || 1) - 1)
      });
    } catch (err) {
      toast.error(err.message || "Failed to remove member");
    }
  };

  const filteredParticipants = useMemo(() => {
    if (!searchMemberQuery.trim()) return participants;
    const q = searchMemberQuery.toLowerCase();
    return participants.filter(p => {
      const pName = (p.name || p.username || "").toLowerCase();
      const pEmail = (p.email || "").toLowerCase();
      return pName.includes(q) || pEmail.includes(q);
    });
  }, [participants, searchMemberQuery]);

  const filteredAvailableUsers = useMemo(() => {
    if (!newMemberSearch.trim()) return availableUsers;
    const q = newMemberSearch.toLowerCase();
    return availableUsers.filter(u => 
      (u.name || u.username || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q)
    );
  }, [availableUsers, newMemberSearch]);

  const createdDate = groupDetails?.createdAt 
    ? new Date(groupDetails.createdAt).toLocaleDateString(undefined, { 
        year: 'numeric', month: 'short', day: 'numeric' 
      }) 
    : "Recently";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl md:max-w-4xl lg:max-w-5xl w-[95vw] h-[88vh] md:h-[86vh] max-h-[88vh] p-0 gap-0 overflow-hidden flex flex-col md:flex-row rounded-2xl bg-background border border-border shadow-2xl transition-all duration-300">
          {/* Left Sidebar: Group Identity, Creator & Admin Edit */}
          <aside className="w-full md:w-72 lg:w-80 shrink-0 bg-muted/30 md:bg-muted/40 border-b md:border-b-0 md:border-r border-border flex flex-col justify-between overflow-y-auto scrollbar-thin max-h-[42vh] md:max-h-none">
            <div className="p-4 md:p-5 space-y-4">
              {/* Header */}
              <div className="flex items-center gap-2.5 pb-3 border-b border-border/50">
                <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0 shadow-2xs">
                  <Users className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-foreground leading-tight">Group Info</h2>
                  <p className="text-[11px] text-muted-foreground">Identity & creator admin</p>
                </div>
              </div>

              {/* Group Identity Card (Design Team) */}
              <div className="p-4 rounded-2xl border border-border bg-card/60 shadow-2xs space-y-3 transition-all duration-200">
                <div className="flex items-center gap-3.5">
                  <div className="relative group shrink-0">
                    <UserAvatar
                      src={groupAvatar}
                      name={groupName}
                      size="xl"
                      isGroup
                      groupAvatar={groupAvatar}
                      className="border-2 border-primary/20 shadow-md"
                    />
                    {isMeAdmin && !isEditing && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(true);
                          setEditName(groupName);
                        }}
                        className="absolute inset-0 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="Edit group logo & name"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-sm font-bold text-foreground truncate">{groupName}</h3>
                      <span className="px-1.5 py-0.2 rounded-full bg-blue-500/10 text-blue-500 text-[9px] font-bold border border-blue-500/20">
                        GROUP
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {participants.length} participants
                    </p>
                    <p className="text-[10px] text-muted-foreground/80 mt-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Created {createdDate}
                    </p>
                  </div>
                </div>

                {/* Admin Quick Edit Button */}
                {isMeAdmin && !isEditing && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(true);
                      setEditName(groupName);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl border border-border/70 bg-background hover:bg-muted text-foreground text-xs font-semibold transition-all duration-200 active:scale-98 shadow-2xs cursor-pointer"
                  >
                    <Edit3 className="h-3.5 w-3.5 text-primary" />
                    <span>Edit Group Details</span>
                  </button>
                )}
              </div>

              {/* Admin Editing Inline Panel */}
              {isMeAdmin && isEditing && (
                <div className="p-3.5 rounded-2xl border border-primary/30 bg-primary/5 space-y-3 animate-in fade-in-50 zoom-in-95 duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Edit3 className="h-3.5 w-3.5 text-primary" />
                      Edit Group
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="text-muted-foreground hover:text-foreground text-xs p-1 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Group Name
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Enter new group name..."
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-border bg-background text-foreground font-semibold outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                    />
                  </div>

                  {/* Logo Selector */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Group Logo
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowCustomUrlInput(!showCustomUrlInput)}
                        className="text-[10px] text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Image className="h-3 w-3" />
                        {showCustomUrlInput ? "Presets" : "Custom URL"}
                      </button>
                    </div>

                    {showCustomUrlInput ? (
                      <input
                        type="text"
                        value={customLogoUrl}
                        onChange={(e) => setCustomLogoUrl(e.target.value)}
                        placeholder="https://example.com/logo.png"
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-border bg-background text-foreground font-mono outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    ) : (
                      <div className="grid grid-cols-4 gap-1.5">
                        {PRESET_GROUP_LOGOS.map((logo) => {
                          const isSel = selectedLogo.id === logo.id && !customLogoUrl;
                          return (
                            <button
                              key={logo.id}
                              type="button"
                              onClick={() => {
                                setSelectedLogo(logo);
                                setCustomLogoUrl("");
                              }}
                              className={`p-1.5 rounded-xl flex flex-col items-center justify-center transition-all duration-200 cursor-pointer ${
                                isSel
                                  ? "bg-primary/20 border-2 border-primary scale-105 shadow-2xs"
                                  : "bg-background/80 hover:bg-muted border border-border/50"
                              }`}
                            >
                              <span className="text-base leading-none">{logo.emoji}</span>
                              <span className="text-[8px] text-muted-foreground mt-0.5 truncate w-full text-center">
                                {logo.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="flex-1 py-1.5 text-xs rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground font-medium transition-all duration-200 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={editLoading || !editName.trim()}
                      onClick={handleSaveGroupEdit}
                      className="flex-1 py-1.5 text-xs rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold transition-all duration-200 flex items-center justify-center gap-1.5 shadow-md shadow-primary/20 active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      {editLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Save
                    </button>
                  </div>
                </div>
              )}

              {/* Group Creator & Admin Badge Card */}
              {admin && (
                <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-3.5 flex items-center justify-between shadow-2xs transition-all duration-200">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-amber-500/20 text-amber-500 grid place-items-center shrink-0">
                      <Crown className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400">
                        Group Creator & Admin
                      </div>
                      <div className="text-xs font-semibold text-foreground truncate">
                        {admin.name || admin.username || "Admin"}
                        {adminId === myId && " (You)"}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold px-2 py-0.5 rounded-full border border-amber-500/25 shrink-0">
                    Creator
                  </span>
                </div>
              )}
            </div>

            {/* Exit Group Button (Desktop & Bottom) */}
            <div className="p-4 md:p-5 pt-2 border-t border-border/50">
              <button
                type="button"
                onClick={() => setConfirmExitOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 text-xs font-semibold transition-all duration-200 active:scale-98 cursor-pointer shadow-2xs"
              >
                <LogOut className="h-3.5 w-3.5" />
                Exit Group
              </button>
            </div>
          </aside>

          {/* Right Content Pane: Add Member & Participants List */}
          <section className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-background">
            {/* Header: Title on Left, Add Member Button on Right */}
            <div className="p-4 md:p-5 pr-12 border-b border-border/60 shrink-0 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  Participants ({participants.length})
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Manage members, roles, and invite new colleagues
                </p>
              </div>

              {!isAddingMembers && (
                <button
                  type="button"
                  onClick={handleOpenAddMembers}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 shadow-md shadow-primary/20 active:scale-95 cursor-pointer"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Add Member</span>
                </button>
              )}
            </div>

            {loading ? (
              <div className="p-16 flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-7 w-7 text-primary animate-spin" />
                <p className="text-xs text-muted-foreground">Loading group participants…</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4 scrollbar-thin">
                {/* Add Member Drawer/Box */}
                {isAddingMembers && (
                  <div className="bg-card border border-primary/30 rounded-2xl p-4 space-y-3.5 animate-in fade-in-50 slide-in-from-top-2 duration-250 shadow-md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-lg bg-primary/10 text-primary grid place-items-center">
                          <UserPlus className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-xs font-bold text-foreground">
                          Add New Members to {groupName}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAddingMembers(false)}
                        className="text-muted-foreground hover:text-foreground text-xs p-1 rounded-md hover:bg-muted transition-colors cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        value={newMemberSearch}
                        onChange={(e) => setNewMemberSearch(e.target.value)}
                        placeholder="Search contacts to add..."
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium transition-all"
                      />
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-1 divide-y divide-border/20 pr-1 scrollbar-thin">
                      {loadingAvailableUsers ? (
                        <div className="py-8 flex justify-center">
                          <Loader2 className="h-5 w-5 text-primary animate-spin" />
                        </div>
                      ) : filteredAvailableUsers.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-6 italic">
                          No more contacts available to add
                        </p>
                      ) : (
                        filteredAvailableUsers.map(user => {
                          const isSelected = selectedNewMemberIds.includes(user._id);
                          return (
                            <div
                              key={user._id}
                              onClick={() => toggleSelectNewMember(user._id)}
                              className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all duration-200 ${
                                isSelected ? "bg-primary/10 text-primary border border-primary/20" : "hover:bg-muted/50 text-foreground"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <UserAvatar
                                  src={user.profile || user.profilePic}
                                  name={user.name || user.username}
                                  size="sm"
                                />
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold truncate">{user.name}</div>
                                  <div className="text-[10px] text-muted-foreground truncate">{user.email}</div>
                                </div>
                              </div>
                              <div className={`h-5 w-5 rounded-md border flex items-center justify-center transition-all duration-200 ${
                                isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40"
                              }`}>
                                {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      <span className="text-xs text-muted-foreground font-medium">
                        {selectedNewMemberIds.length} contact{selectedNewMemberIds.length === 1 ? "" : "s"} selected
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setIsAddingMembers(false)}
                          className="px-3 py-1.5 text-xs rounded-xl border border-border hover:bg-muted text-foreground font-semibold transition-all duration-200 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={selectedNewMemberIds.length === 0 || addingLoading}
                          onClick={handleConfirmAddMembers}
                          className="px-4 py-1.5 text-xs rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-primary/20 active:scale-95 transition-all duration-200 cursor-pointer"
                        >
                          {addingLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                          Add to Group
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Filter Search for existing participants */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground/60" />
                  <input
                    type="text"
                    value={searchMemberQuery}
                    onChange={(e) => setSearchMemberQuery(e.target.value)}
                    placeholder="Search group participants..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-border bg-muted/20 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium transition-all duration-200"
                  />
                </div>

                {/* List of Current Members */}
                <div className="space-y-1.5 divide-y divide-border/30">
                  {filteredParticipants.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground">
                      No participants matching &quot;{searchMemberQuery}&quot;
                    </div>
                  ) : (
                    filteredParticipants.map(member => {
                      const memberId = String(member._id || member.id || member);
                      const isMemberAdmin = memberId === adminId;
                      const isMe = memberId === myId;
                      const isOnline = onlineUsers.includes(memberId);

                      return (
                        <div
                          key={memberId}
                          className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/40 transition-all duration-200 group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <UserAvatar
                              src={member.profile || member.profilePic}
                              name={member.name || member.username || "User"}
                              size="md"
                              online={isOnline}
                              showOnlineDot
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                                  {member.name || member.username || "Member"}
                                </span>
                                {isMe && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-primary/10 text-primary border border-primary/20">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 truncate">
                                {member.email && (
                                  <span className="truncate">{member.email}</span>
                                )}
                                <span>•</span>
                                <span className={isOnline ? "text-emerald-500 font-medium" : "text-muted-foreground"}>
                                  {isOnline ? "Online" : "Offline"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {isMemberAdmin ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-2xs">
                                <Crown className="h-2.5 w-2.5" />
                                Admin
                              </span>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-muted-foreground font-medium px-2 py-0.5 rounded-md bg-muted/60">
                                  Member
                                </span>
                                {isMeAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMember(memberId, member.name || member.username || "Member")}
                                    className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                                    title="Remove member from group"
                                  >
                                    <UserMinus className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </section>
        </DialogContent>
      </Dialog>

      {/* Confirm Exit Group Dialog */}
      <AlertDialog open={confirmExitOpen} onOpenChange={setConfirmExitOpen}>
        <AlertDialogContent className="bg-card border-border rounded-2xl shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Exit Group?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave &quot;{groupName}&quot;? You will no longer receive new messages from this group.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExitGroup}
              disabled={exitLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
            >
              {exitLoading && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              Exit Group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default GroupDetailsModal;
