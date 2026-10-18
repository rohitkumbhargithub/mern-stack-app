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
            const hasAttachments = Array.isArray(options.attachments) && options.attachments.length > 0;
            const finalMessage = (message && typeof message === 'string' && message.trim()) 
                ? message 
                : (pollText || (hasAttachments ? "" : " "));

            const response = await fetch(`/api/messages/send/${targetConvId}`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    message: finalMessage,
                    attachments: options.attachments || undefined,
                    replyTo: options.replyTo,
                    editId: options.editId,
                    isForwarded: options.isForwarded || false,
                    poll: options.poll || undefined,
                    mentions: options.mentions || undefined
                })
            });

            let data;
            const contentType = response.headers.get("content-type") || "";
            if (contentType.includes("application/json")) {
                data = await response.json();
            } else {
                const rawText = await response.text();
                throw new Error(response.status === 404 ? "Message route not found (404). Please restart your backend server." : `Server error (${response.status})`);
            }

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
                poll: data.poll || options.poll || undefined,
                attachments: data.attachments || options.attachments || []
            };

            if (String(targetConvId) === String(selectedConverstion?._id)) {
                if (options.editId) {
                    setMessages(messages.map(m => (m._id || m.id) === data._id ? messageToStore : m));
                } else {
                    setMessages([...messages, messageToStore]);
                }
            }

            if (updateConversation) {
                let previewText = cleanMessageText(finalMessage);
                if (!previewText && hasAttachments) {
                    const firstAtt = options.attachments[0];
                    if (options.attachments.length > 1) {
                        previewText = `📎 ${options.attachments.length} attachments`;
                    } else {
                        previewText = firstAtt.type === 'image' 
                            ? '📷 Photo' 
                            : firstAtt.type === 'audio' 
                            ? '🎙️ Voice note' 
                            : firstAtt.type === 'pdf' 
                            ? `📄 ${firstAtt.name || 'PDF Document'}` 
                            : `📎 ${firstAtt.name || 'Attachment'}`;
                    }
                }
                const convIdToUpdate = data.conversationId || targetConvId;
                updateConversation(convIdToUpdate, {
                    lastMessage: previewText || "Message",
                    lastMessageTime: data.createdAt || new Date().toISOString()
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