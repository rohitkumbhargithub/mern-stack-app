import { useEffect } from 'react';
import {useSocketContext} from '../context/SocketContext';
import useConverstion from '../zustand/useConverstion';
import notification from '../assets/sounds/notification.mp3';


const useListenMessages = () => {
  const {socket} = useSocketContext();
  const {messages, setMessages} = useConverstion();

  useEffect(()=> {
    const handleNewMessage = (newMessage) => {
        newMessage.shouldShake = true;
        const sound = new Audio(notification);
        sound.play();
        setMessages([...messages, newMessage]);
    };

    socket?.on("newMessage", handleNewMessage);

    const handleDeletedMessage = ({ messageId }) => {
        const updatedMessages = messages.map((m) =>
            (m._id || m.id) === messageId ? { ...m, isDeleted: true } : m
        );
        setMessages(updatedMessages);
    };

    socket?.on("messageDeleted", handleDeletedMessage);

    const handleUpdatedMessage = (updatedMessage) => {
        const updatedMessages = messages.map((m) =>
            (m._id || m.id) === updatedMessage._id ? updatedMessage : m
        );
        setMessages(updatedMessages);
    };

    socket?.on("messageUpdated", handleUpdatedMessage);

    return () => {
        socket?.off("newMessage", handleNewMessage);
        socket?.off("messageDeleted", handleDeletedMessage);
        socket?.off("messageUpdated", handleUpdatedMessage);
    };
  }, [socket, setMessages, messages]);
}

export default useListenMessages;