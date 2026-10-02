import { useState } from "react";
import useConverstion from "../zustand/useConverstion";
import { toast } from "sonner";

const userSendMessage = () => {
  
    const [loading, setLoading] = useState(false);
    const {messages, setMessages, selectedConverstion} = useConverstion();

    const sendMessage = async (message, options = {}) => {
        setLoading(true);

        try {
            const headers = { 'Content-Type': 'application/json' };
            const customKey = localStorage.getItem("gemini_api_key");
            if (customKey && customKey.trim()) {
                headers['x-gemini-api-key'] = customKey.trim();
            }

            const response = await fetch(`/api/messages/send/${selectedConverstion._id}`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    message,
                    replyTo: options.replyTo,
                    editId: options.editId
                })
            })

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            if (options.editId) {
                setMessages(messages.map(m => (m._id || m.id) === data._id ? data : m));
            } else {
                setMessages([...messages, data]);
            }

        }catch(err){
           toast.error(err.message);
        }finally{
            setLoading(false);
        }
    };

    return {sendMessage, loading};
};

export default userSendMessage;