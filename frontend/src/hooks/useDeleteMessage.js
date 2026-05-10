import { useState } from "react";
import toast from "react-hot-toast";
import useConverstion from "../zustand/useConverstion";

const useDeleteMessage = () => {
    const [loading, setLoading] = useState(false);
    const { messages, setMessages } = useConverstion();

    const deleteMessage = async (messageId) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/messages/delete/${messageId}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            // Update local state
            const updatedMessages = messages.map((m) => 
                (m._id || m.id) === messageId ? { ...m, isDeleted: true } : m
            );
            setMessages(updatedMessages);
            toast.success("Message deleted");
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return { loading, deleteMessage };
};

export default useDeleteMessage;
