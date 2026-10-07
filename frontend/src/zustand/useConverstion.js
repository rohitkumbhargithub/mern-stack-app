import { create } from 'zustand';

const useConverstion = create((set) => ({
    selectedConverstion: null,
    setSelectedConverstion: (selectedConverstion) => set((state) => {
        const convId = selectedConverstion ? String(selectedConverstion._id) : null;
        let nextUnread = state.unreadCounts;
        if (convId && state.unreadCounts[convId]) {
            nextUnread = { ...state.unreadCounts };
            delete nextUnread[convId];
        }
        return { selectedConverstion, unreadCounts: nextUnread };
    }),
    messages: [],
    conversations: [],
    unreadCounts: {},
    incrementUnread: (conversationId) => set((state) => {
        const id = String(conversationId);
        // Never increment unread count for the currently active chat
        if (state.selectedConverstion && String(state.selectedConverstion._id) === id) {
            return state;
        }
        return {
            unreadCounts: {
                ...state.unreadCounts,
                [id]: (state.unreadCounts[id] || 0) + 1
            }
        };
    }),
    clearUnread: (conversationId) => set((state) => {
        const id = String(conversationId);
        if (!state.unreadCounts[id]) return state;
        const next = { ...state.unreadCounts };
        delete next[id];
        return { unreadCounts: next };
    }),
    isSidebarCollapsed: false,
    setIsSidebarCollapsed: (isSidebarCollapsed) => set({ isSidebarCollapsed }),
    toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
    
    // Supports both direct arrays and atomic functional updates (prev => [...prev, item])
    setMessages: (messagesOrUpdater) => set((state) => ({
        messages: typeof messagesOrUpdater === 'function' 
            ? messagesOrUpdater(state.messages) 
            : messagesOrUpdater
    })),

    // Conversations management
    setConversations: (conversationsOrUpdater) => set((state) => ({
        conversations: typeof conversationsOrUpdater === 'function'
            ? conversationsOrUpdater(state.conversations)
            : conversationsOrUpdater
    })),

    removeConversation: (conversationId) => set((state) => {
        const idStr = String(conversationId);
        const nextConversations = state.conversations.filter(
            (c) => String(c._id) !== idStr
        );
        const isCurrentSelected = state.selectedConverstion && String(state.selectedConverstion._id) === idStr;
        return {
            conversations: nextConversations,
            ...(isCurrentSelected ? { selectedConverstion: null, messages: [] } : {})
        };
    }),

    addConversation: (newConv) => set((state) => {
        const newId = String(newConv._id);
        const exists = state.conversations.some((c) => String(c._id) === newId);
        if (exists) {
            return {
                conversations: state.conversations.map((c) => String(c._id) === newId ? { ...c, ...newConv } : c)
            };
        }
        return {
            conversations: [newConv, ...state.conversations]
        };
    }),

    updateConversation: (conversationId, updates) => set((state) => {
        const idStr = String(conversationId);
        const nextConversations = state.conversations.map((c) =>
            String(c._id) === idStr ? { ...c, ...updates } : c
        );
        const isCurrentSelected = state.selectedConverstion && String(state.selectedConverstion._id) === idStr;
        return {
            conversations: nextConversations,
            ...(isCurrentSelected ? { selectedConverstion: { ...state.selectedConverstion, ...updates } } : {})
        };
    })
}));

export default useConverstion;