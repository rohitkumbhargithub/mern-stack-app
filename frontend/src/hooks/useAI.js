import { useState, useCallback } from "react";
import { toast } from "sonner";

export const useAI = () => {
    const [loadingAction, setLoadingAction] = useState(null); // 'suggest' | 'rewrite' | 'summarize' | 'translate' | null

    const getHeaders = () => {
        const headers = { "Content-Type": "application/json" };
        const customKey = localStorage.getItem("gemini_api_key");
        if (customKey && customKey.trim()) {
            headers["x-gemini-api-key"] = customKey.trim();
        }
        return headers;
    };

    /**
     * Get 3 smart quick-reply suggestions based on recent conversation messages
     */
    const fetchSmartReplies = useCallback(async (messages = []) => {
        if (!messages || messages.length === 0) return [];
        setLoadingAction("suggest");
        try {
            const res = await fetch("/api/ai/suggestions", {
                method: "POST",
                headers: getHeaders(),
                body: JSON.stringify({ messages })
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error);
            return data.suggestions || [];
        } catch (err) {
            console.warn("Failed to fetch AI smart replies:", err.message);
            return [];
        } finally {
            setLoadingAction(null);
        }
    }, []);

    /**
     * Rewrite draft text (grammar, professional, casual, concise, translate)
     */
    const rewriteDraft = useCallback(async (text, mode = "grammar", targetLanguage = "English") => {
        if (!text || !text.trim()) return text;
        setLoadingAction("rewrite");
        try {
            const res = await fetch("/api/ai/rewrite", {
                method: "POST",
                headers: getHeaders(),
                body: JSON.stringify({ text, mode, targetLanguage })
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error);
            return data.rewritten || text;
        } catch (err) {
            toast.error(err.message || "Failed to rewrite message");
            return text;
        } finally {
            setLoadingAction(null);
        }
    }, []);

    /**
     * Summarize an entire conversation thread
     */
    const summarizeThread = useCallback(async (messages = []) => {
        if (!messages || messages.length === 0) {
            toast.error("No messages to summarize yet");
            return null;
        }
        setLoadingAction("summarize");
        try {
            const res = await fetch("/api/ai/summarize", {
                method: "POST",
                headers: getHeaders(),
                body: JSON.stringify({ messages })
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error);
            return data.summary || "";
        } catch (err) {
            toast.error(err.message || "Failed to summarize conversation");
            return null;
        } finally {
            setLoadingAction(null);
        }
    }, []);

    /**
     * Translate an individual message
     */
    const translateMessage = useCallback(async (text, targetLanguage = "English") => {
        if (!text || !text.trim()) return text;
        setLoadingAction("translate");
        try {
            const res = await fetch("/api/ai/translate", {
                method: "POST",
                headers: getHeaders(),
                body: JSON.stringify({ text, targetLanguage })
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error);
            return data.translation || text;
        } catch (err) {
            toast.error(err.message || "Translation failed");
            return null;
        } finally {
            setLoadingAction(null);
        }
    }, []);

    return {
        fetchSmartReplies,
        rewriteDraft,
        summarizeThread,
        translateMessage,
        loadingAction,
        isLoading: loadingAction !== null
    };
};

export default useAI;
