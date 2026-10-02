import { useEffect } from 'react';
import { toast } from 'sonner';
import { useSocketContext } from '../context/SocketContext';
import useConverstion from '../zustand/useConverstion';
import notification from '../assets/sounds/notification.mp3';

const useListenMessages = () => {
  const { socket } = useSocketContext();
  const { 
    setMessages, 
    removeConversation, 
    addConversation, 
    updateConversation, 
    selectedConverstion 
  } = useConverstion();

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (newMessage) => {
        newMessage.shouldShake = true;
        try {
            const sound = new Audio(notification);
            sound.play().catch(() => {}); // Gracefully ignore browser autoplay policy restrictions
        } catch (_) {}

        setMessages((prev) => {
            const newId = newMessage._id || newMessage.id;
            // Prevent duplicate message insertions (e.g. if optimistic update or multi-broadcast)
            if (prev.some((m) => (m._id || m.id) === newId)) {
                return prev;
            }
            return [...prev, newMessage];
        });

        // Update last message preview in conversations list
        if (newMessage.conversationId) {
            updateConversation(newMessage.conversationId, {
                lastMessage: newMessage.message || newMessage.body || "",
                lastMessageTime: newMessage.createdAt || new Date().toISOString()
            });
        }
    };

    const handleDeletedMessage = ({ messageId }) => {
        setMessages((prev) => prev.map((m) =>
            (m._id || m.id) === messageId ? { ...m, isDeleted: true } : m
        ));
    };

    const handleUpdatedMessage = (updatedMessage) => {
        const updatedId = updatedMessage._id || updatedMessage.id;
        setMessages((prev) => prev.map((m) =>
            (m._id || m.id) === updatedId ? updatedMessage : m
        ));
    };

    const handleConversationDeleted = ({ conversationId }) => {
        removeConversation(conversationId);
        if (selectedConverstion && String(selectedConverstion._id) === String(conversationId)) {
            toast.info("This conversation was deleted");
        }
    };

    const handleConversationCleared = ({ conversationId }) => {
        if (selectedConverstion && String(selectedConverstion._id) === String(conversationId)) {
            setMessages([]);
            toast.info("Chat history was cleared");
        }
    };

    const handleUserLeftGroup = ({ conversationId, userName, membersCount }) => {
        updateConversation(conversationId, { membersCount });
        if (selectedConverstion && String(selectedConverstion._id) === String(conversationId)) {
            toast.info(`${userName || "A member"} left the group`);
        }
    };

    const handleNewConversation = (groupPayload) => {
        addConversation(groupPayload);
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("messageDeleted", handleDeletedMessage);
    socket.on("messageUpdated", handleUpdatedMessage);
    socket.on("conversationDeleted", handleConversationDeleted);
    socket.on("conversationCleared", handleConversationCleared);
    socket.on("userLeftGroup", handleUserLeftGroup);
    socket.on("newConversation", handleNewConversation);

    return () => {
        socket.off("newMessage", handleNewMessage);
        socket.off("messageDeleted", handleDeletedMessage);
        socket.off("messageUpdated", handleUpdatedMessage);
        socket.off("conversationDeleted", handleConversationDeleted);
        socket.off("conversationCleared", handleConversationCleared);
        socket.off("userLeftGroup", handleUserLeftGroup);
        socket.off("newConversation", handleNewConversation);
    };
  }, [socket, setMessages, removeConversation, addConversation, updateConversation, selectedConverstion]);
};

export default useListenMessages;