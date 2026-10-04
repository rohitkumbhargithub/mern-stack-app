import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { 
  Users, UserPlus, Crown, ShieldCheck, Search, Check, 
  X, Loader2, LogOut, Mail, Calendar, Circle, ChevronRight 
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
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

export function GroupDetailsModal({ open, onOpenChange, conversation }) {
  const { authUser } = useAuthContext();
  const { onlineUsers } = useSocketContext();
  const { updateConversation, setSelectedConverstion } = useConverstion();
  const { exitGroup, loading: exitLoading } = useDeleteConversation();

  const [groupDetails, setGroupDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchMemberQuery, setSearchMemberQuery] = useState("");
  
  // Add member section states
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loadingAvailableUsers, setLoadingAvailableUsers] = useState(false);
  const [selectedNewMemberIds, setSelectedNewMemberIds] = useState([]);
  const [addingLoading, setAddingLoading] = useState(false);
  const [newMemberSearch, setNewMemberSearch] = useState("");

  const [confirmExitOpen, setConfirmExitOpen] = useState(false);

  const groupId = conversation?._id;

  // Fetch full group details when modal opens
  useEffect(() => {
    if (!open || !groupId) return;

    let isMounted = true;
    setLoading(true);

    const fetchDetails = async () => {
      try {
        const data = await api.get(`/api/users/group/${groupId}`);
        if (isMounted) {
          setGroupDetails(data);
        }
      } catch (err) {
        if (isMounted) {
          // Fallback to conversation props if direct fetch fails
          setGroupDetails({
            _id: conversation._id,
            name: conversation.name || conversation.chatName,
            groupAvatar: conversation.groupAvatar,
            groupAdmin: conversation.groupAdmin || conversation.participated?.[0],
            participated: conversation.participated || [],
            membersCount: conversation.membersCount || conversation.participated?.length || 0,
            createdAt: conversation.createdAt || new Date().toISOString()
          });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDetails();
    return () => { isMounted = false; };
  }, [open, groupId, conversation]);

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
      // Filter out users already in the group
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

  const groupName = groupDetails?.name || conversation?.name || "Group Chat";
  const groupAvatar = groupDetails?.groupAvatar || conversation?.groupAvatar;
  const admin = groupDetails?.groupAdmin || conversation?.groupAdmin || groupDetails?.participated?.[0];
  const adminId = admin ? String(admin._id || admin.id || admin) : null;
  const myId = String(authUser?._id || authUser?.id || "");
  const isMeAdmin = adminId === myId;

  const participants = groupDetails?.participated || conversation?.participated || [];

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
        <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden bg-card border-border shadow-2xl">
          <DialogHeader className="p-5 pb-3 bg-muted/30 border-b border-border/50 text-left">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Users className="h-4.5 w-4.5 text-primary" />
                Group Details
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              View group participants, admin creator info, and add new members
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-7 w-7 text-primary animate-spin" />
              <p className="text-xs text-muted-foreground">Loading group info…</p>
            </div>
          ) : (
            <div className="max-h-[75vh] overflow-y-auto p-5 space-y-5">
              {/* Group Identity Card */}
              <div className="flex items-center gap-4 bg-muted/40 p-4 rounded-xl border border-border/60">
                <UserAvatar
                  src={groupAvatar}
                  name={groupName}
                  size="xl"
                  isGroup
                  groupAvatar={groupAvatar}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-foreground truncate">{groupName}</h3>
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-bold border border-blue-500/20">
                      GROUP
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {participants.length} participants
                  </p>
                  <p className="text-[11px] text-muted-foreground/80 mt-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Created {createdDate}
                  </p>
                </div>
              </div>

              {/* Group Creator / Admin Badge Card */}
              {admin && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 flex items-center justify-between">
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
                  <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold px-2 py-0.5 rounded-md border border-amber-500/20 shrink-0">
                    Creator
                  </span>
                </div>
              )}

              {/* Add Members Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Participants ({participants.length})
                  </h4>

                  {!isAddingMembers && (
                    <button
                      type="button"
                      onClick={handleOpenAddMembers}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs active:scale-95"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Add Member
                    </button>
                  )}
                </div>

                {/* Add Member Drawer/Box */}
                {isAddingMembers && (
                  <div className="bg-muted/50 border border-primary/30 rounded-xl p-3.5 space-y-3 animate-in fade-in-50 zoom-in-95">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <UserPlus className="h-3.5 w-3.5 text-primary" />
                        Add New Members
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsAddingMembers(false)}
                        className="text-muted-foreground hover:text-foreground text-xs p-1"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        value={newMemberSearch}
                        onChange={(e) => setNewMemberSearch(e.target.value)}
                        placeholder="Search contacts to add..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div className="max-h-44 overflow-y-auto space-y-1 divide-y divide-border/20 pr-1">
                      {loadingAvailableUsers ? (
                        <div className="py-6 flex justify-center">
                          <Loader2 className="h-5 w-5 text-primary animate-spin" />
                        </div>
                      ) : filteredAvailableUsers.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4 italic">
                          No more contacts available to add
                        </p>
                      ) : (
                        filteredAvailableUsers.map(user => {
                          const isSelected = selectedNewMemberIds.includes(user._id);
                          return (
                            <div
                              key={user._id}
                              onClick={() => toggleSelectNewMember(user._id)}
                              className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                                isSelected ? "bg-primary/10 text-primary" : "hover:bg-accent text-foreground"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <UserAvatar
                                  src={user.profile || user.profilePic}
                                  name={user.name || user.username}
                                  size="sm"
                                />
                                <div className="min-w-0">
                                  <div className="text-xs font-medium truncate">{user.name}</div>
                                  <div className="text-[10px] text-muted-foreground truncate">{user.email}</div>
                                </div>
                              </div>
                              <div className={`h-4 w-4 rounded border flex items-center justify-center transition-colors ${
                                isSelected ? "bg-primary border-primary text-white" : "border-muted-foreground/40"
                              }`}>
                                {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-border/50">
                      <span className="text-[11px] text-muted-foreground">
                        {selectedNewMemberIds.length} selected
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setIsAddingMembers(false)}
                          className="px-2.5 py-1 text-xs rounded-lg border border-border hover:bg-muted text-foreground font-medium"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={selectedNewMemberIds.length === 0 || addingLoading}
                          onClick={handleConfirmAddMembers}
                          className="px-3 py-1 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
                        >
                          {addingLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                          Add to Group
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Filter search for existing participants */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchMemberQuery}
                    onChange={(e) => setSearchMemberQuery(e.target.value)}
                    placeholder="Search group participants..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* List of Current Members */}
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {filteredParticipants.map(member => {
                    const memberId = String(member._id || member.id || member);
                    const isMemberAdmin = memberId === adminId;
                    const isMe = memberId === myId;
                    const isOnline = onlineUsers.includes(memberId);

                    return (
                      <div
                        key={memberId}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border/40"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <UserAvatar
                            src={member.profile || member.profilePic}
                            name={member.name || member.username || "User"}
                            size="md"
                            online={isOnline}
                            showOnlineDot
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-foreground truncate">
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

                        <div>
                          {isMemberAdmin ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              <Crown className="h-2.5 w-2.5" />
                              Admin
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground font-medium px-2 py-0.5 rounded-md bg-muted/60">
                              Member
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Exit Group Button */}
              <div className="pt-2 border-t border-border/50">
                <button
                  type="button"
                  onClick={() => setConfirmExitOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 text-xs font-semibold transition-all active:scale-98"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Exit Group
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Exit Group Dialog */}
      <AlertDialog open={confirmExitOpen} onOpenChange={setConfirmExitOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Exit Group?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave &quot;{groupName}&quot;? You will no longer receive new messages from this group.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExitGroup}
              disabled={exitLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
