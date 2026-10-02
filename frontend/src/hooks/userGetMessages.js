import { useEffect, useState } from "react";
import { toast } from "sonner";
import useConverstion from "../zustand/useConverstion";
import { api } from "../lib/api";

const userGetMessages = () => {
    const [loading, setLoading] = useState(false);
    const { messages, setMessages, selectedConverstion } = useConverstion();

    useEffect(() => {
        let isCurrent = true;
        const getMessages = async () => {
            if (!selectedConverstion?._id) return;
            setLoading(true);
            setMessages([]);

            try {
                const data = await api.get(`/api/messages/${selectedConverstion._id}`);
                if (isCurrent) {
                    setMessages(Array.isArray(data) ? data : []);
                }
            } catch (err) {
                if (isCurrent) {
                    setMessages([]);
                    if (err.status !== 401) {
                        toast.error(err.message || "Failed to load messages");
                    }
                }
            } finally {
                if (isCurrent) setLoading(false);
            }
        };

        getMessages();
        return () => { isCurrent = false; };
    }, [selectedConverstion?._id, setMessages]);

    return { messages: Array.isArray(messages) ? messages : [], loading };
};

export default userGetMessages;