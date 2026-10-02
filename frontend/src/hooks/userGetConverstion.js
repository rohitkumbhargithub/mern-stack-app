import { useEffect, useState, useCallback } from "react";
import { toast } from 'sonner';
import { api } from "../lib/api";
import useConverstion from "../zustand/useConverstion";

const userGetConverstions = () => {
    const [loading, setLoading] = useState(false);
    const { conversations, setConversations } = useConverstion();

    const fetchConversations = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.get('/api/users');
            setConversations(Array.isArray(data) ? data : []);
        } catch (err) {
            setConversations([]);
            if (err.status !== 401) {
                toast.error(err.message || "Failed to load conversations");
            }
        } finally {
            setLoading(false);
        }
    }, [setConversations]);

    useEffect(() => {
        fetchConversations();
    }, [fetchConversations]);

    return {
        loading,
        converstions: Array.isArray(conversations) ? conversations : [],
        refetch: fetchConversations
    };
};

export default userGetConverstions;