import { create } from 'zustand';

const useConverstion = create((set) => ({
    selectedConverstion: null,
    setSelectedConverstion: (selectedConverstion) => set({selectedConverstion}),
    messages: [],
    setMessages: (messages) => set({messages}),

}));


export default useConverstion;