import { useState } from "react";
import { toast } from "sonner";

const useLogin = () => {
    const [loading, setLoading] = useState(false);

    const login = async (inputs) => {
        const { email, password } = inputs;
        if (!email || !password) {
            toast.error('Please enter email and password');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, password })
            });

            let data;
            const text = await res.text();
            try {
                data = JSON.parse(text);
            } catch (parseError) {
                console.error('Failed to parse login response:', parseError);
                toast.error('Invalid server response');
                return;
            }

            if (!res.ok) {
                toast.error(data.error || 'Login failed');
                return;
            }

            localStorage.setItem('chat-user', JSON.stringify(data));
            const authEvent = new Event('auth:login');
            window.dispatchEvent(authEvent);
            toast.success('Login successful');
            return data;
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return { loading, login };
};

export default useLogin;
