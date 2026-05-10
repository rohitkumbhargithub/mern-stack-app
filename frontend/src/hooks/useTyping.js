import { useEffect, useState, useCallback } from "react";
import { useSocketContext } from "../context/SocketContext";
import { useAuthContext } from "../context/AuthContext";
import useConverstion from "../zustand/useConverstion";

const useTyping = () => {
    const { socket } = useSocketContext();
    const { authUser } = useAuthContext();
    const { selectedConverstion } = useConverstion();
    const [typingUsers, setTypingUsers] = useState(new Set());

    useEffect(() => {
        if (!socket || !selectedConverstion?._id) return;

        const roomId = selectedConverstion._id;
        socket.emit("joinRoom", roomId);

        const handleTyping = ({ roomId: rId, userId }) => {
            if (rId === roomId && userId !== authUser._id) {
                setTypingUsers((prev) => new Set(prev).add(userId));
            }
        };

        const handleStopTyping = ({ roomId: rId, userId }) => {
            if (rId === roomId) {
                setTypingUsers((prev) => {
                    const next = new Set(prev);
                    next.delete(userId);
                    return next;
                });
            }
        };

        socket.on("typing", handleTyping);
        socket.on("stopTyping", handleStopTyping);

        // Reset typing users when switching conversation
        setTypingUsers(new Set());

        return () => {
            socket.off("typing", handleTyping);
            socket.off("stopTyping", handleStopTyping);
        };
    }, [socket, selectedConverstion?._id, authUser._id]);

    const sendTyping = useCallback((isTyping) => {
        if (!socket || !selectedConverstion?._id) return;
        const roomId = selectedConverstion._id;
        const event = isTyping ? "typing" : "stopTyping";
        socket.emit(event, { roomId, userId: authUser._id });
    }, [socket, selectedConverstion?._id, authUser._id]);

    return { typingUsers: Array.from(typingUsers), sendTyping };
};

export default useTyping;
