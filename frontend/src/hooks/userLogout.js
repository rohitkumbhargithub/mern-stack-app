import { useState } from 'react';
import { useAuthContext } from '../context/AuthContext';
import useConverstion from '../zustand/useConverstion';
import { toast } from 'sonner';

const userLogout = () => {
  const [loading, setLoading] = useState(false);
  const { setAuthUser } = useAuthContext();
  const { setSelectedConverstion } = useConverstion();

  const logout = async () => {
    setLoading(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: {
          'Content-type': 'application/json'
        },
      });
    } catch (error) {
      console.warn("Backend logout notification failed:", error.message);
    } finally {
      // Unconditionally remove local storage session and state
      localStorage.removeItem("chat-user");
      setSelectedConverstion(null);
      setAuthUser(null);
      setLoading(false);
      toast.success("Logged out successfully");
    }
  };

  return { loading, logout };
};

export default userLogout;