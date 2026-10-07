import { createContext, useContext, useState, useEffect, useCallback } from "react";

export const AuthContext = createContext({
  authUser: null,
  setAuthUser: () => {},
  logout: () => {},
});

export const useAuthContext = () => {
  return useContext(AuthContext);
};

/**
 * Safely parse persisted user session from localStorage
 */
const getInitialUser = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("chat-user");
    if (!raw || raw === "undefined" || raw === "null") return null;
    const parsed = JSON.parse(raw);
    if (!parsed || (!parsed._id && !parsed.id)) return null;
    return parsed;
  } catch (err) {
    console.warn("Corrupted session detected in localStorage, resetting:", err);
    localStorage.removeItem("chat-user");
    return null;
  }
};

export const AuthContextProvider = ({ children }) => {
  const [authUser, setAuthUser] = useState(getInitialUser);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.warn("Logout request failed:", err);
    } finally {
      // Guaranteed local session cleanup
      localStorage.removeItem("chat-user");
      setAuthUser(null);
    }
  }, []);

  // Listen for global 401 unauthorized session expiry events
  useEffect(() => {
    const handleUnauthorized = () => {
      console.warn("Session expired or invalid, logging out...");
      localStorage.removeItem("chat-user");
      setAuthUser(null);
    };
    const handleLogin = () => {
      try {
        const raw = localStorage.getItem("chat-user");
        if (raw && raw !== "undefined" && raw !== "null") {
          const parsed = JSON.parse(raw);
          if (parsed && (parsed._id || parsed.id)) {
            setAuthUser(parsed);
            return;
          }
        }
        setAuthUser(getInitialUser());
      } catch (err) {
        setAuthUser(getInitialUser());
      }
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    window.addEventListener("auth:login", handleLogin);
    return () => {
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
      window.removeEventListener("auth:login", handleLogin);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ authUser, setAuthUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};