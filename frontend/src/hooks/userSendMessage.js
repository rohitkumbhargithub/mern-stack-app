import { useState } from "react";
import useConverstion from "../zustand/useConverstion";
import { toast } from "sonner";

const userSendMessage = () => {
    const [loading, setLoading] = useState(false);
    const { messages, setMessages, selectedConverstion, updateConversation } = useConverstion();

    const sendMessage = async (message, options = {}) => {
        const targetConvId = options.targetConversationId || selectedConverstion?._id;
        if (!targetConvId) {
            toast.error("No conversation selected");
            return null;
        }

        setLoading(true);

        try {
            const headers = { 'Content-Type': 'application/json' };
            const customKey = localStorage.getItem("gemini_api_key");
            if (customKey && customKey.trim()) {
                headers['x-gemini-api-key'] = customKey.trim();
            }

            const response = await fetch(`/api/messages/send/${targetConvId}`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    message,
                    replyTo: options.replyTo,
                    editId: options.editId,
                    isForwarded: options.isForwarded || false
                })
            });

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            if (String(targetConvId) === String(selectedConverstion?._id)) {
                if (options.editId) {
                    setMessages(messages.map(m => (m._id || m.id) === data._id ? data : m));
                } else {
                    setMessages([...messages, data]);
                }
            }

            if (updateConversation) {
                updateConversation(targetConvId, {
                    lastMessage: message,
                    lastMessageTime: new Date().toISOString()
                });
            }

            return data;

        } catch(err) {
            toast.error(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    };

    return { sendMessage, loading };
};

export default userSendMessage;