import { useState } from "react";
import { toast } from "sonner";
import { api } from "../lib/api";
import useConverstion from "../zustand/useConverstion";

export const useDeleteConversation = () => {
    const [loading, setLoading] = useState(false);
    const { removeConversation, selectedConverstion, setMessages } = useConverstion();

    const deleteConversation = async (conversationId) => {
        if (!conversationId) return false;
        setLoading(true);
        try {
            const data = await api.delete(`/api/users/conversation/${conversationId}`);
            
            if (data.isAI) {
                if (selectedConverstion?._id === conversationId) {
                    setMessages([]);
                }
                toast.success(data.message || "AI chat history cleared");
            } else {
                removeConversation(conversationId);
                toast.success(data.message || "Conversation deleted successfully");
            }
            return true;
        } catch (err) {
            toast.error(err.message || "Failed to delete conversation");
            return false;
        } finally {
            setLoading(false);
        }
    };

    const exitGroup = async (groupId) => {
        if (!groupId) return false;
        setLoading(true);
        try {
            const data = await api.post(`/api/users/group/${groupId}/exit`);
            removeConversation(groupId);
            toast.success(data.message || "You exited the group");
            return true;
        } catch (err) {
            toast.error(err.message || "Failed to exit group");
            return false;
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        deleteConversation,
        exitGroup
    };
};

export default useDeleteConversation;
