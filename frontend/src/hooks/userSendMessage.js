import { useState } from "react";
import useConverstion from "../zustand/useConverstion";
import toast from "react-hot-toast";

const userSendMessage = () => {
  
    const [loading, setLoading] = useState(false);
    const {messages, setMessages, selectedConverstion} = useConverstion();

    const sendMessage = async (message) => {
        setLoading(true);

        try{

            const response = await fetch(`/api/message/send/${selectedConverstion._id}`, {
                method: "POST",
                headers: {
                    'Content-Type' : 'application/json'
                },
                body: JSON.stringify({message})
            })

            const data = await response.json();

            if(data.err){
                throw new Error(data.err);
            }
s
            setMessages([...messages, data]);

        }catch(err){
            toast.error(err.message);
        }finally{
            setLoading(false);
        }
    };

    return {loading, sendMessage};
};

export default userSendMessage;