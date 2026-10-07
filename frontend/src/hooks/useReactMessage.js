import { useState } from "react";
import useConverstion from "../zustand/useConverstion";
import { toast } from "sonner";

const useReactMessage = () => {
    const [loading, setLoading] = useState(false);
    const { messages, setMessages } = useConverstion();

    const reactToMessage = async (messageId, emoji) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/messages/react/${messageId}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ emoji }),
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            // Update local messages in Zustand
            const targetId = data._id || data.id || messageId;
            const updated = messages.map((m) =>
                (m._id || m.id) === targetId ? data : m
            );
            setMessages(updated);
        } catch (error) {
            toast.error(error.message || "Failed to update reaction");
        } finally {
            setLoading(false);
        }
    };

    return { reactToMessage, loading };
};

export default useReactMessage;
