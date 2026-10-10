import { useEffect, useCallback } from 'react';
import useConverstion from '../../zustand/useConverstion';
import { useAuthContext } from '../../context/AuthContext';
import { useSocketContext } from '../../context/SocketContext';
import { ConversationView } from '../chat/ConversationView';
import { NoChatSelected } from './NoChatSelected';
import userGetMessages from '../../hooks/userGetMessages';
import useListenMessages from '../../hooks/useListenMessages';
import userSendMessage from '../../hooks/userSendMessage';
import useDeleteMessage from '../../hooks/useDeleteMessage';
import useReactMessage from '../../hooks/useReactMessage';
import useTyping from '../../hooks/useTyping';

const MessageContainer = () => {
    const { selectedConverstion, setSelectedConverstion } = useConverstion();
    const { authUser } = useAuthContext();
    const { socket, onlineUsers } = useSocketContext();
    const { 
        messages, 
        loading: messagesLoading, 
        loadingOlder: loadingOlderMessages, 
        hasMore: hasMoreMessages, 
        loadOlderMessages 
    } = userGetMessages();
    useListenMessages();
    const { sendMessage } = userSendMessage();
    const { deleteMessage } = useDeleteMessage();
    const { reactToMessage } = useReactMessage();
    const { typingUsers, sendTyping } = useTyping();

    useEffect(() => {
        return () => setSelectedConverstion(null);
    }, [setSelectedConverstion]);

    const handleSendMessage = useCallback((body, options) => sendMessage(body, options), [sendMessage]);
    const handleDeleteMessage = useCallback((id) => deleteMessage(id), [deleteMessage]);
    const handleReact = useCallback((id, emoji) => reactToMessage(id, emoji), [reactToMessage]);
    const handleTypingChange = useCallback((isTyping) => sendTyping(isTyping), [sendTyping]);

    const getMembers = useCallback(() => {
        if (selectedConverstion?.isGroupChat && Array.isArray(selectedConverstion?.participated) && selectedConverstion.participated.length > 0) {
            const list = selectedConverstion.participated.map(p => {
                const isObj = typeof p === 'object' && p !== null;
                const id = isObj ? (p._id || p.id) : p;
                const name = isObj ? (p.name || p.display_name || p.username || "Member") : "Member";
                const username = isObj ? (p.username || "") : "";
                const profile = isObj ? (p.profile || p.avatar_url || "") : "";
                return {
                    _id: id,
                    id: id,
                    display_name: name,
                    name: name,
                    username: username,
                    avatar_url: profile,
                    profile: profile
                };
            });
            if (!list.some(m => String(m._id) === String(authUser._id))) {
                list.unshift({
                    _id: authUser._id,
                    id: authUser._id,
                    display_name: authUser.name,
                    name: authUser.name,
                    username: authUser.username || "",
                    avatar_url: authUser.profile,
                    profile: authUser.profile
                });
            }
            return list;
        }

        return [
            {
                _id: authUser._id,
                id: authUser._id,
                display_name: authUser.name,
                name: authUser.name,
                username: authUser.username || "",
                avatar_url: authUser.profile,
                profile: authUser.profile
            },
            {
                _id: selectedConverstion?.userId || selectedConverstion?._id,
                id: selectedConverstion?.userId || selectedConverstion?._id,
                display_name: selectedConverstion?.name,
                name: selectedConverstion?.name,
                username: selectedConverstion?.username || "",
                avatar_url: selectedConverstion?.profile,
                profile: selectedConverstion?.profile,
                isAI: selectedConverstion?.isAI || selectedConverstion?.type === "ai",
                type: selectedConverstion?.type
            }
        ];
    }, [authUser, selectedConverstion]);

    if (!selectedConverstion) {
        return <NoChatSelected authUser={authUser} />;
    }

    return (
        <div className="flex h-full min-h-0 flex-col">
            <ConversationView
                key={selectedConverstion._id}
                conversationId={selectedConverstion._id}
                conversationName={selectedConverstion.name}
                messages={messages}
                onSendMessage={handleSendMessage}
                onDeleteMessage={handleDeleteMessage}
                onReact={handleReact}
                currentUser={authUser}
                members={getMembers()}
                presence={new Set(onlineUsers)}
                typingUsers={typingUsers}
                onTypingChange={handleTypingChange}
                isLoading={messagesLoading}
                hasMoreMessages={hasMoreMessages}
                loadingOlderMessages={loadingOlderMessages}
                onLoadOlderMessages={loadOlderMessages}
            />
        </div>
    );
};

export default MessageContainer;
