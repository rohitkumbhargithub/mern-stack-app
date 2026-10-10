import { useState } from "react";
import useConverstion from "../zustand/useConverstion";
import { toast } from "sonner";
import { saveCachedPoll, cleanMessageText } from "../utils/pollCache";

// Tracks IDs of messages sent from this client session so incoming socket echo never triggers sound
export const locallySentMessageIds = new Set();

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

            const pollText = options.poll?.question ? `📊 Poll: ${options.poll.question}` : "";
            const finalMessage = (message && typeof message === 'string' && message.trim()) ? message : (pollText || " ");

            const response = await fetch(`/api/messages/send/${targetConvId}`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    message: finalMessage,
                    replyTo: options.replyTo,
                    editId: options.editId,
                    isForwarded: options.isForwarded || false,
                    poll: options.poll || undefined,
                    mentions: options.mentions || undefined
                })
            });

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            if (data._id) {
                locallySentMessageIds.add(String(data._id));
            }

            if (options.poll) {
                saveCachedPoll(data._id, options.poll);
            }

            const messageToStore = {
                ...data,
                poll: data.poll || options.poll || undefined
            };

            if (String(targetConvId) === String(selectedConverstion?._id)) {
                if (options.editId) {
                    setMessages(messages.map(m => (m._id || m.id) === data._id ? messageToStore : m));
                } else {
                    setMessages([...messages, messageToStore]);
                }
            }

            if (updateConversation) {
                updateConversation(targetConvId, {
                    lastMessage: cleanMessageText(finalMessage),
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