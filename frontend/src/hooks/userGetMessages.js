import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import useConverstion from "../zustand/useConverstion";
import { api } from "../lib/api";

const userGetMessages = () => {
    const [loading, setLoading] = useState(false);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const { messages, setMessages, selectedConverstion } = useConverstion();

    useEffect(() => {
        let isCurrent = true;
        const getMessages = async () => {
            if (!selectedConverstion?._id) return;
            setLoading(true);
            setMessages([]);
            setHasMore(false);

            try {
                const data = await api.get(`/api/messages/${selectedConverstion._id}?limit=35&paginated=true`);
                if (isCurrent) {
                    if (Array.isArray(data)) {
                        setMessages(data);
                        setHasMore(false);
                    } else if (data && Array.isArray(data.messages)) {
                        setMessages(data.messages);
                        setHasMore(Boolean(data.hasMore));
                    } else {
                        setMessages([]);
                        setHasMore(false);
                    }
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

    const loadOlderMessages = useCallback(async () => {
        if (!selectedConverstion?._id || loadingOlder || !hasMore || !messages || messages.length === 0) {
            return;
        }

        const oldestMsg = messages[0];
        const oldestTime = oldestMsg?.createdAt || oldestMsg?.created_at;
        if (!oldestTime) return;

        setLoadingOlder(true);
        try {
            const data = await api.get(`/api/messages/${selectedConverstion._id}?limit=30&before=${encodeURIComponent(oldestTime)}&paginated=true`);
            const olderList = Array.isArray(data) ? data : (data?.messages || []);
            const moreAvailable = Boolean(data?.hasMore);

            if (olderList.length > 0) {
                setMessages(prev => {
                    const existingIds = new Set(prev.map(m => m._id || m.id));
                    const uniqueOlder = olderList.filter(m => !existingIds.has(m._id || m.id));
                    return [...uniqueOlder, ...prev];
                });
            }
            setHasMore(moreAvailable);
        } catch (err) {
            console.error("Error loading older messages:", err);
        } finally {
            setLoadingOlder(false);
        }
    }, [selectedConverstion?._id, loadingOlder, hasMore, messages, setMessages]);

    return { 
        messages: Array.isArray(messages) ? messages : [], 
        loading, 
        loadingOlder, 
        hasMore, 
        loadOlderMessages 
    };
};

export default userGetMessages;