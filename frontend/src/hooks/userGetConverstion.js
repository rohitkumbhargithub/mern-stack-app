import { useEffect, useState } from "react";
import toast from 'react-hot-toast';
import useConverstion from "../zustand/useConverstion";

const userGetConverstions = () => {

    const [loading, setLoading] = useState(false);
    const [converstions, setConverstions] = useState([]);
    const { messages } = useConverstion();


    useEffect(() => {
        const getConverstion = async () => {
            setLoading(true);

            try{
                const response = await fetch('/api/users');

                const data = await response.json();

                if(data.err){
                    throw new Error(data.err);
                }
                setConverstions(data);
            }catch(err){
                toast.error(err.message);
            }finally{
                setLoading(false);
            }
        }
        getConverstion();
    }, [messages]);

    return {loading, converstions};
}

export default userGetConverstions;