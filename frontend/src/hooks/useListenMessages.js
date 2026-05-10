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

    return () => socket?.off("newMessage", handleNewMessage);
  }, [socket, setMessages, messages]);
}

export default useListenMessages;