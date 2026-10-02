import { create } from 'zustand';

const useConverstion = create((set) => ({
    selectedConverstion: null,
    setSelectedConverstion: (selectedConverstion) => set({ selectedConverstion }),
    messages: [],
    conversations: [],
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