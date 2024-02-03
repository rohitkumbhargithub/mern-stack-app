import { useState } from "react"
import toast from "react-hot-toast";
import { useAuthContext } from "../context/AuthContext";

const userSignup = () => {

    const [loading, setLoading] = useState(false);
    const {setAuthUser} = useAuthContext();
    
    const signup = async ({name,email,password,confirmPassword,gender}) => {
        const success = handleInputsErrors({name,email,password,confirmPassword,gender});
        if(!success) return;

        setLoading(true);

        try{

            const response = await fetch("/api/auth/signup", {
                method: "POST",
                headers: {
                    'Content-type': 'application/json'
                },
                body: JSON.stringify({name, email, password, confirmPassword, gender})
            });

            const data = await response.json();
            if(data.error){
                throw new Error(data.error);
            }

            // localstorage 
            localStorage.setItem("chat-user", JSON.stringify(data));

            // context
           setAuthUser(data);

        }catch(err){
            toast.error(err.message);
        }finally{
            setLoading(false);
        }
    };
    return {loading, signup}
};

export default userSignup;


function handleInputsErrors({name, email, password, confirmPassword, gender}){
    if(!name || !email || !password || !confirmPassword || !gender){
        toast.error("Fill's all field!.");
        return false;
    }

    if(password !== confirmPassword){
        toast.error("password not match!.");
        return false;
    }

    if(password.length < 6){
        toast.error("password must be at least 6 character!.");
        return false;
    }

    return true;
}