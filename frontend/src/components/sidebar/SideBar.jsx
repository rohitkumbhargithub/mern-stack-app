import React, { useState, useCallback } from 'react'
import Converstions from './Converstions'
import { MessageCircle, Plus, Settings, LogOut, Search, PanelLeftClose } from 'lucide-react';
import { NewChatDialog } from '../chat/NewChatDialog';
import { SettingsDialog } from '../chat/SettingsDialog';
import userLogout from '../../hooks/userLogout';
import { useNavigate } from 'react-router-dom';
import useConverstion from '../../zustand/useConverstion';

import api from '../../lib/api';
import { toast } from 'sonner';

const SideBar = () => {
    const [newChatOpen, setNewChatOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const { logout } = userLogout();
    const navigate = useNavigate();
    const { setSelectedConverstion, toggleSidebar } = useConverstion();

    const handleLogout = async () => {
        await logout();
        navigate("/login");
    };

    const handleSearchUsers = useCallback(async (query = "") => {
        setSearchLoading(true);
        try {
            const data = await api.get(`/api/users/search?q=${encodeURIComponent(query || "")}`);
            setSearchResults(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Search users error:", err);
            setSearchResults([]);
        } finally {
            setSearchLoading(false);
        }
    }, []);

    const handleOpenNewChat = () => {
        setNewChatOpen(true);
        handleSearchUsers("");
    };

    return (
        <div className='flex flex-col h-full border-r border-border bg-card'>
            {/* Header */}
            <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                    <span className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground">
                        <MessageCircle className="h-3.5 w-3.5" />
                    </span>
                    SendChat
                    <button
                        onClick={toggleSidebar}
                        title="Collapse sidebar"
                        className="hidden md:inline-flex rounded-md p-1 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors ml-0.5"
                    >
                        <PanelLeftClose className="h-3.5 w-3.5" />
                    </button>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleOpenNewChat}
                        title="New chat"
                        className="rounded-md p-1.5 hover:bg-accent text-muted-foreground transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                    </button>
                    <button 
                        onClick={() => setSettingsOpen(true)}
                        className="rounded-md p-1.5 hover:bg-accent text-muted-foreground transition-colors" 
                        title="Settings"
                    >
                        <Settings className="h-4 w-4" />
                    </button>
                    <button
                        onClick={handleLogout}
                        title="Sign out"
                        className="rounded-md p-1.5 hover:bg-accent text-muted-foreground transition-colors"
                    >
                        <LogOut className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="px-3 py-2">
                <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search conversations"
                        className="w-full rounded-md border border-input bg-background py-1.5 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                </div>
            </div>

            <div className='flex-1 overflow-y-auto px-2 pb-2'>
                <Converstions
                    searchFilter={search}
                    onStartNewChat={handleOpenNewChat}
                />
            </div>

            <NewChatDialog
                open={newChatOpen}
                onOpenChange={(isOpen) => {
                    setNewChatOpen(isOpen);
                    if (isOpen) handleSearchUsers("");
                }}
                onSearch={handleSearchUsers}
                searchResults={searchResults}
                isLoading={searchLoading}
                onStartChat={async (type, data) => {
                    if (type === "dm") {
                        setSelectedConverstion(data);
                        setNewChatOpen(false);
                    } else if (type === "group") {
                        try {
                            setSearchLoading(true);
                            const newGroup = await api.post("/api/users/group", {
                                name: data.name,
                                members: data.members,
                                groupAvatar: data.groupAvatar
                            });
                            toast.success(`Group "${data.name}" created!`);
                            setSelectedConverstion(newGroup);
                            setNewChatOpen(false);
                        } catch (err) {
                            toast.error(err.message || "Failed to create group");
                        } finally {
                            setSearchLoading(false);
                        }
                    }
                }}
            />

            <SettingsDialog 
                open={settingsOpen}
                onOpenChange={setSettingsOpen}
            />
        </div>
    )
}

export default SideBar