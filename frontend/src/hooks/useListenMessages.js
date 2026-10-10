import { useEffect } from 'react';
import { toast } from 'sonner';
import { useSocketContext } from '../context/SocketContext';
import { useAuthContext } from '../context/AuthContext';
import useConverstion from '../zustand/useConverstion';
import notification from '../assets/sounds/notification.mp3';
import { locallySentMessageIds } from './userSendMessage';
import { generateAvatarDataUrl } from '../utils/avatarGenerator';
import { saveCachedPoll, getCachedPoll, cleanMessageText } from '../utils/pollCache';
import { playNotificationSound, isNotificationsEnabled } from '../utils/soundManager';

// Safely extract string ID from any user or ID representation
const getCleanId = (val) => {
    if (!val) return "";
    if (typeof val === "object") {
        return String(val._id || val.id || val.userId || (val.user && (val.user._id || val.user.id)) || "");
    }
    return String(val).trim();
};

// Global set of processed message IDs in this client session to eliminate duplicate processing
const processedMessageIds = new Set();

const useListenMessages = () => {
  const { socket } = useSocketContext();
  const { authUser } = useAuthContext();
  const { 
    setMessages, 
    removeConversation, 
    addConversation, 
    updateConversation, 
    selectedConverstion,
    setSelectedConverstion,
    conversations,
    incrementUnread
  } = useConverstion();

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (newMessage) => {
        const msgId = getCleanId(newMessage._id) || getCleanId(newMessage.id);

        // Deduplication: Ignore if this exact message has already been processed in this session
        if (msgId) {
            if (processedMessageIds.has(msgId)) {
                return;
            }
            processedMessageIds.add(msgId);
            if (processedMessageIds.size > 500) {
                const first = processedMessageIds.values().next().value;
                processedMessageIds.delete(first);
            }
        }

        let myId = getCleanId(authUser);
        if (!myId && typeof window !== "undefined") {
            try {
                const stored = JSON.parse(localStorage.getItem("chat-user"));
                myId = getCleanId(stored);
            } catch (_) {}
        }

        const senderId = getCleanId(newMessage.senderId) || getCleanId(newMessage.sender) || getCleanId(newMessage.sender_id);

        // Check if sent by me (either ID matches or was dispatched by this client session)
        const isFromMe = Boolean(
            (myId && senderId && String(myId) === String(senderId)) ||
            (msgId && locallySentMessageIds.has(msgId))
        );

        // Only play sound and notify if message is received from someone else
        if (!isFromMe) {
            newMessage.shouldShake = true;
            playNotificationSound();

            // Increment unread count for the conversation if not currently focused
            const isDifferentChat = !selectedConverstion || String(selectedConverstion._id) !== String(newMessage.conversationId);
            if (isDifferentChat && newMessage.conversationId) {
                incrementUnread(newMessage.conversationId);
            }

            // Check if current user is tagged / mentioned
            const myId = String(authUser?._id || authUser?.id || "");
            const myName = (authUser?.name || "").toLowerCase();
            const myUsername = (authUser?.username || "").toLowerCase();
            const rawMsgText = (newMessage.message || newMessage.body || "");
            const msgTextLower = rawMsgText.toLowerCase();

            const isMentioned = (
                (Array.isArray(newMessage.mentions) && newMessage.mentions.map(String).includes(myId)) ||
                msgTextLower.includes("@everyone") ||
                (myName && msgTextLower.includes(`@${myName}`)) ||
                (myUsername && msgTextLower.includes(`@${myUsername}`))
            );

            // In-app mention alert banner/toast if mentioned
            if (isMentioned) {
                const mentionSender = newMessage.senderName || "Someone";
                toast.info(`🔔 ${mentionSender} tagged you: "${cleanMessageText(rawMsgText).slice(0, 60)}"`, {
                    duration: 6000
                });
            }

            // Google Chat-style desktop notification when tab is in background OR user is viewing a different chat OR user is mentioned
            const isTabHidden = typeof document !== 'undefined' && document.hidden;

            if (isNotificationsEnabled() && (isTabHidden || isDifferentChat || isMentioned)) {
                // Access fresh conversations directly from zustand store
                const allConversations = useConverstion.getState().conversations || conversations || [];
                const conv = allConversations.find(c => String(c._id) === String(newMessage.conversationId));

                // Resolve sender's real name
                let senderName = newMessage.senderName;
                if ((!senderName || senderName === "Someone") && conv) {
                    if (conv.isGroupChat && Array.isArray(conv.participated)) {
                        const participant = conv.participated.find(p => getCleanId(p) === senderId);
                        if (participant) {
                            senderName = participant.name || participant.display_name || participant.username;
                        }
                    } else if (!conv.isGroupChat) {
                        senderName = conv.name || conv.display_name;
                    }
                }
                if (!senderName || senderName === "Someone") {
                    senderName = conv?.name || "SendChat User";
                }

                // Determine notification title with mention indicator
                const title = isMentioned
                    ? `🔔 ${senderName} tagged you in ${conv?.name || "Group"}`
                    : (conv?.isGroupChat
                        ? `${senderName} in ${conv.name || "Group"}`
                        : senderName);
                const bodyText = (newMessage.message || newMessage.body || "New message").slice(0, 120);

                // Ensure icon is a valid image URL, otherwise generate the Text/Initials avatar like in the sidebar
                const isValidUrl = (u) => typeof u === 'string' && (
                    !u.includes('avatar.iran.liara.run') && (
                        u.startsWith('http://') || 
                        u.startsWith('https://') || 
                        u.startsWith('data:image/') || 
                        (u.startsWith('/') && !u.includes(' '))
                    )
                );

                const origin = typeof window !== 'undefined' ? window.location.origin : '';
                const defaultBadgeUrl = `${origin}/icons/badge-72.png`;

                let iconUrl = null;
                if (isValidUrl(newMessage.senderProfile)) {
                    iconUrl = newMessage.senderProfile;
                } else if (isValidUrl(conv?.profile)) {
                    iconUrl = conv.profile;
                } else if (isValidUrl(conv?.groupAvatar)) {
                    iconUrl = conv.groupAvatar;
                }

                // If user or chat has no uploaded photo, generate the circular Text/Initials avatar (e.g. "TU", "RK")
                if (!iconUrl) {
                    iconUrl = generateAvatarDataUrl(senderName, {
                        isAI: Boolean(newMessage.isAI),
                        isGroup: Boolean(conv?.isGroupChat),
                        groupAvatar: conv?.groupAvatar
                    });
                }

                // 1. Native desktop browser notification
                if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                    try {
                        const notif = new Notification(title, {
                            body: bodyText,
                            icon: iconUrl,
                            badge: defaultBadgeUrl,
                            tag: `conv-${newMessage.conversationId}`,
                            renotify: true
                        });

                        notif.onclick = () => {
                            window.focus();
                            if (conv) {
                                setSelectedConverstion(conv);
                            }
                            notif.close();
                        };
                    } catch (_) {
                        if (navigator.serviceWorker && navigator.serviceWorker.ready) {
                            navigator.serviceWorker.ready.then(reg => {
                                reg.showNotification(title, {
                                    body: bodyText,
                                    icon: iconUrl,
                                    badge: defaultBadgeUrl,
                                    tag: `conv-${newMessage.conversationId}`,
                                    data: { url: '/' }
                                });
                            }).catch(() => {});
                        }
                    }
                }

                // 2. Flash tab title like Google Chat: 💬 (Rohit) Hello...
                if (isTabHidden && typeof document !== 'undefined') {
                    const originalTitle = "SendChat - AI Real-Time Chat";
                    document.title = `💬 (${senderName}) ${bodyText.slice(0, 24)}...`;

                    const handleTabFocus = () => {
                        document.title = originalTitle;
                        window.removeEventListener('focus', handleTabFocus);
                    };
                    window.addEventListener('focus', handleTabFocus);
                }
            }
        }

        // Attach and cache poll data if available or embedded in message
        const pollData = newMessage.poll || getCachedPoll(newMessage);
        if (pollData) {
            newMessage.poll = pollData;
            saveCachedPoll(newMessage._id || newMessage.id, pollData);
        }

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
            const rawMsg = newMessage.message || newMessage.body || "";
            updateConversation(newMessage.conversationId, {
                lastMessage: cleanMessageText(rawMsg),
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

    const handleGroupMembersUpdated = ({ conversationId, participated, membersCount }) => {
        updateConversation(conversationId, { participated, membersCount });
        if (selectedConverstion && String(selectedConverstion._id) === String(conversationId)) {
            setSelectedConverstion({
                ...selectedConverstion,
                participated,
                membersCount
            });
        }
    };

    const handleGroupUpdated = ({ conversationId, name, groupAvatar }) => {
        updateConversation(conversationId, { 
            name, 
            chatName: name, 
            groupAvatar, 
            profile: groupAvatar 
        });
        if (selectedConverstion && String(selectedConverstion._id) === String(conversationId)) {
            setSelectedConverstion(prev => ({
                ...prev,
                name,
                chatName: name,
                groupAvatar,
                profile: groupAvatar
            }));
            toast.info(`Group info updated to "${name}"`);
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
    socket.on("groupMembersUpdated", handleGroupMembersUpdated);
    socket.on("groupUpdated", handleGroupUpdated);
    socket.on("newConversation", handleNewConversation);

    return () => {
        socket.off("newMessage", handleNewMessage);
        socket.off("messageDeleted", handleDeletedMessage);
        socket.off("messageUpdated", handleUpdatedMessage);
        socket.off("conversationDeleted", handleConversationDeleted);
        socket.off("conversationCleared", handleConversationCleared);
        socket.off("userLeftGroup", handleUserLeftGroup);
        socket.off("groupMembersUpdated", handleGroupMembersUpdated);
        socket.off("groupUpdated", handleGroupUpdated);
        socket.off("newConversation", handleNewConversation);
    };
  }, [socket, setMessages, removeConversation, addConversation, updateConversation, selectedConverstion, setSelectedConverstion, authUser]);
};

export default useListenMessages;