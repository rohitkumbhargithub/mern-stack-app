import { useEffect, useState } from "react";

import toast from "react-hot-toast";
import useConverstion from "../zustand/useConverstion";

const userGetMessages = () => {
    const [loading, setLoading] = useState(false);
    const {messages, setMessages, selectedConverstion} = useConverstion();

    useEffect(() => {
        const getMessages = async () => {
            setLoading(true);

            try{

                const response = await fetch(`/api/messages/${selectedConverstion._id}`);

                const data = await response.json();

                if(data.err){
                    throw new Error(data.err);
                }

                setMessages(data);

            }catch(err){
                toast.error(err.message);
            }finally{
                setLoading(false);
            }
        }

        if(selectedConverstion?._id) getMessages();

    },[selectedConverstion?._id, setMessages]);

    return {messages, loading};
};

export default userGetMessages;