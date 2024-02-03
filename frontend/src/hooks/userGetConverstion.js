import { useEffect, useState } from "react";
import toast from 'react-hot-toast';

const userGetConverstions = () => {

    const [loading, setLoading] = useState(false);
    const [converstions, setConverstions] = useState([]);


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
    }, []);

    return {loading, converstions};
}

export default userGetConverstions;