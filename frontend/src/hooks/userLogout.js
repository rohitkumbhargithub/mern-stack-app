import { useState } from 'react'
import { useAuthContext } from '../context/AuthContext';
import toast from 'react-hot-toast';

const userLogout = () => {
  const [loading, setLoading] = useState(false);
  const {setAuthUser} = useAuthContext();

  const logout = async () => {
    setLoading(true);

    try{

        const response = await fetch("/api/auth/logout", {
            method: "POST",
            headers: {
                'Content-type': 'application/json'
            },
        });

        // Safely parse the response - body may be empty or non-JSON
        const text = await response.text();
        const data = text ? JSON.parse(text) : {};

        if(!response.ok){
            throw new Error(data.error || data.err || "Logout failed");
        }

        localStorage.removeItem("chat-user");
        setAuthUser(null);

    }catch(error){
        toast.error(error.message);
    }finally{
        setLoading(false);
    }
  }

  return {loading, logout};
};

export default userLogout;