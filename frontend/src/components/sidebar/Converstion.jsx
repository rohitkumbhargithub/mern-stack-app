import React, { useState } from 'react';
import { MoreVertical, Trash2, LogOut, Loader2 } from 'lucide-react';
import useConverstion from '../../zustand/useConverstion';
import { useSocketContext } from '../../context/SocketContext';
import { UserAvatar } from '../common/UserAvatar';
import useDeleteConversation from '../../hooks/useDeleteConversation';
import {
    DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';

const Converstion = ({ converstion }) => {
    const { selectedConverstion, setSelectedConverstion } = useConverstion();
    const isSelected = selectedConverstion?._id === converstion._id;
    const { onlineUsers } = useSocketContext();
    const isAI = converstion.isAI || converstion.type === "ai";
    const isOnline = isAI || onlineUsers.includes(converstion.userId || converstion._id);
    const isGroup = converstion.type === "group" || converstion.isGroupChat;

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [exitDialogOpen, setExitDialogOpen] = useState(false);
    const { deleteConversation, exitGroup, loading: actionLoading } = useDeleteConversation();

    const name = converstion.name || converstion.username || "Chat";

    const handleConfirmDelete = async () => {
        await deleteConversation(converstion._id);
        setDeleteDialogOpen(false);
    };

    const handleConfirmExit = async () => {
        await exitGroup(converstion._id);
        setExitDialogOpen(false);
    };

    return (
        <>
            <div
                role="button"
                tabIndex={0}
                onClick={() => setSelectedConverstion(converstion)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedConverstion(converstion); }}
                className={
                    "group relative mb-0.5 flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-all cursor-pointer " +
                    (isSelected 
                        ? (isAI ? "bg-primary/15 text-foreground shadow-2xs border border-primary/20" : "bg-primary/10 text-foreground") 
                        : "hover:bg-accent text-muted-foreground hover:text-foreground")
                }
            >
                <UserAvatar
                    src={converstion.profile || converstion.profilePic}
                    name={name}
                    size="md"
                    isAI={isAI}
                    isGroup={isGroup}
                    groupAvatar={converstion.groupAvatar}
                    online={isOnline}
                    showOnlineDot={!isGroup}
                />

                <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                        <div className="flex items-center gap-1.5 truncate">
                            <span className={`truncate text-sm ${isSelected ? "font-bold" : "font-medium"}`}>{name}</span>
                            {isAI ? (
                                <span className="shrink-0 text-[8px] font-bold px-1 py-0.2 rounded-full bg-primary/10 text-primary border border-primary/20">
                                    BOT
                                </span>
                            ) : isGroup ? (
                                <span className="shrink-0 text-[8px] font-bold px-1 py-0.2 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                    GROUP
                                </span>
                            ) : null}
                        </div>
                        <span className="shrink-0 text-[10px] opacity-50">
                            {isAI ? (
                                <span className="text-primary font-bold">Always On</span>
                            ) : isOnline && !isGroup ? (
                                <span className="text-green-500 font-bold">Online</span>
                            ) : (
                                converstion.lastMessageTime && new Date(converstion.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || ""
                            )}
                        </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                        <span className="line-clamp-1 flex-1 text-xs opacity-70">
                            {converstion.lastMessage || (isGroup ? `${converstion.membersCount || 2} members` : isAI ? "Ask me anything!" : "Start a conversation")}
                        </span>

                        {/* Quick options menu on hover */}
                        <div 
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        type="button"
                                        className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                        title="More options"
                                    >
                                        <MoreVertical className="h-3.5 w-3.5" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44">
                                    {isGroup ? (
                                        <>
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
                                    ) : isAI ? (
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
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete / Clear Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {isAI 
                                ? "Clear AI Chat History?" 
                                : (isGroup ? `Delete "${name}"?` : `Delete chat with ${name}?`)}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {isAI 
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
                            {isAI ? "Clear History" : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Exit Group Confirmation Dialog */}
            <AlertDialog open={exitDialogOpen} onOpenChange={setExitDialogOpen}>
                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Exit "{name}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to exit this group? You will no longer receive messages or be able to participate in this group.
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
        </>
    );
};

export default Converstion;