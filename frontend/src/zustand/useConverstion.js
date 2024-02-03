import { create } from 'zustand';

const useConverstion = create((set) => ({
    selectedConversation: null,
    setSelectedConverstion: (selectedConversation) => set({selectedConversation}),
    messages: [],
    sestMessage: (messages) => set({messages}),
    

}));


export default useConverstion;