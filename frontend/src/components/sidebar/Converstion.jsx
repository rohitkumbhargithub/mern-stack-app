import React from 'react'
import useConverstion from '../../zustand/useConverstion';
import { useSocketContext } from '../../context/SocketContext';
import { Users, User as UserIcon } from 'lucide-react';

const Converstion = ({ converstion }) => {
    const { selectedConverstion, setSelectedConverstion } = useConverstion();
    const isSelected = selectedConverstion?._id === converstion._id;
    const { onlineUsers } = useSocketContext();
    const isOnline = onlineUsers.includes(converstion._id);

    console.log(converstion.name, "from trst");

    const name = converstion.name || converstion.username || "Test";
    const initials = (name || "?")
        .split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();

    return (
        <button
            onClick={() => setSelectedConverstion(converstion)}
            className={
                "mb-0.5 flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-all " +
                (isSelected ? "bg-primary/10 text-foreground" : "hover:bg-accent text-muted-foreground hover:text-foreground")
            }
        >
            <div className="relative shrink-0">
                {converstion.profile || converstion.profilePic ? (
                    <img
                        src={converstion.profile || converstion.profilePic}
                        alt={name}
                        className="h-9 w-9 rounded-full object-cover border border-border/50"
                    />
                ) : (
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {converstion.type === "group" ? <Users className="h-4 w-4" /> : initials}
                    </div>
                )}
                {isOnline && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-green-500" />
                )}
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                    <span className={`truncate text-sm ${isSelected ? "font-bold" : "font-medium"}`}>{name}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="line-clamp-1 flex-1 text-xs opacity-70">
                        {converstion.lastMessage || (converstion.type === "group" ? "Group conversation" : "Start a conversation")}
                    </span>
                </div>
            </div>
        </button>
    );
}

export default Converstion;