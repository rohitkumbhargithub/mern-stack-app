import { useState } from "react";
import useConverstion from "../zustand/useConverstion";
import { useAuthContext } from "../context/AuthContext";
import { toast } from "sonner";
import { api } from "../lib/api";

const useReactMessage = () => {
    const [loading, setLoading] = useState(false);
    const { messages, setMessages } = useConverstion();
    const { authUser } = useAuthContext();

    const reactToMessage = async (messageId, emoji) => {
        if (!messageId || !emoji) return;

        const myId = String(authUser?._id || authUser?.id || "");
        const myName = authUser?.name || authUser?.display_name || "You";

        // Snapshot for rollback on failure
        const previousMessages = [...messages];

        // Optimistically update reactions immediately for instant UI feedback
        const targetId = String(messageId);
        const optimisticallyUpdated = messages.map((m) => {
            if (String(m._id || m.id) !== targetId) return m;

            const existingReactions = Array.isArray(m.reactions) ? [...m.reactions] : [];
            const existingIdx = existingReactions.findIndex(
                r => String(r.user?._id || r.user || "") === myId && r.emoji === emoji
            );

            if (existingIdx > -1) {
                // Toggle off
                existingReactions.splice(existingIdx, 1);
            } else {
                // Add reaction with user's name
                existingReactions.push({
                    user: myId,
                    userName: myName,
                    emoji
                });
            }

            return { ...m, reactions: existingReactions };
        });

        setMessages(optimisticallyUpdated);
        setLoading(true);

        try {
            const data = await api.post(`/api/messages/react/${messageId}`, { emoji });

            if (data && (data._id || data.id)) {
                const canonicalId = String(data._id || data.id);
                setMessages((prev) =>
                    prev.map((m) => (String(m._id || m.id) === canonicalId ? data : m))
                );
            }
        } catch (error) {
            console.error("reactToMessage error:", error);
            // Revert optimistic update on server error
            setMessages(previousMessages);
            toast.error(error.message || "Failed to update reaction. Please ensure the backend server was restarted.");
        } finally {
            setLoading(false);
        }
    };

    return { reactToMessage, loading };
};

export default useReactMessage;
