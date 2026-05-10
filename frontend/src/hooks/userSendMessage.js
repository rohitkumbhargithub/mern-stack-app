import { useState } from "react";
import useConverstion from "../zustand/useConverstion";
import toast from "react-hot-toast";

const userSendMessage = () => {
  
    const [loading, setLoading] = useState(false);
    const {messages, setMessages, selectedConverstion} = useConverstion();

    const sendMessage = async (message, options = {}) => {
        setLoading(true);

        try {
            const response = await fetch(`/api/messages/send/${selectedConverstion._id}`, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message,
                    replyTo: options.replyTo,
                    editId: options.editId
                })
            })

            const data = await response.json();

            if (data.err) {
                throw new Error(data.err);
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