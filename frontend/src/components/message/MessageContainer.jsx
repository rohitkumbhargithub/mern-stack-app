import React, { useEffect } from 'react';
import useConverstion from '../../zustand/useConverstion';
import { useAuthContext } from '../../context/AuthContext';
import { useSocketContext } from '../../context/SocketContext';
import { ConversationView } from '../chat/ConversationView';
import userGetMessages from '../../hooks/userGetMessages';
import useListenMessages from '../../hooks/useListenMessages';
import userSendMessage from '../../hooks/userSendMessage';
import { MessageCircle } from 'lucide-react';

const MessageContainer = () => {
    const { selectedConverstion, setSelectedConverstion } = useConverstion();
    const { authUser } = useAuthContext();
    const { socket, onlineUsers } = useSocketContext();
    const { messages, loading: messagesLoading } = userGetMessages();
    useListenMessages();
    const { sendMessage, loading: sendLoading } = userSendMessage();

    console.log("MessageContainer rendering. Selected:", selectedConverstion?._id);

    useEffect(() => {
        return () => setSelectedConverstion(null);
    }, [setSelectedConverstion]);

    if (!selectedConverstion) {
        return <NoChatSelected authUser={authUser} />;
    }

    return (
        <div className="flex h-full min-h-0 flex-col">
            <ConversationView 
                conversationId={selectedConverstion._id}
                messages={messages}
                onSendMessage={(body) => sendMessage(body)}
                currentUser={authUser}
                members={[
                    { 
                        _id: authUser._id, 
                        id: authUser._id, 
                        display_name: authUser.name, 
                        name: authUser.name, 
                        avatar_url: authUser.profilePic, 
                        profile: authUser.profilePic 
                    },
                    { 
                        _id: selectedConverstion._id, 
                        id: selectedConverstion._id, 
                        display_name: selectedConverstion.name, 
                        name: selectedConverstion.name, 
                        avatar_url: selectedConverstion.profile, 
                        profile: selectedConverstion.profile 
                    }
                ]}
                presence={new Set(onlineUsers)}
                isLoading={messagesLoading}
            />
        </div>
    );
};

const NoChatSelected = ({ authUser }) => {
    return (
        <div className='flex items-center justify-center w-full h-full bg-background'>
            <div className='px-4 text-center text-muted-foreground flex flex-col items-center gap-4'>
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageCircle className="h-10 w-10 text-primary" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-foreground mb-1">Welcome, {authUser?.name}!</h2>
                    <p className="text-sm">Select a conversation from the sidebar to start chatting.</p>
                </div>
            </div>
        </div>
    );
};

export default MessageContainer;
