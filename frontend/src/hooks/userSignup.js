import { useState } from "react";
import { toast } from "sonner";

const useSignup = () => {
    const [loading, setLoading] = useState(false);
    const [otpLoading, setOtpLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [otpStep, setOtpStep] = useState(false);
    const [otpEmail, setOtpEmail] = useState("");

    const handleInputsErrors = ({ name, email, password, confirmPassword, gender }) => {
        if (!name || !email || !password || !confirmPassword || !gender) {
            toast.error("Please fill in all fields");
            return true;
        }
        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return true;
        }
        if (password.length < 6) {
            toast.error("Password must be at least 6 characters");
            return true;
        }
        return false;
    };

    const signup = async (inputs) => {
        const { name, email, password, confirmPassword, gender } = inputs;
        if (handleInputsErrors({ name, email, password, confirmPassword, gender })) return;

        setLoading(true);
        try {
            const res = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, confirmPassword, gender })
            });

            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || 'Failed to send verification code');
                return;
            }

            setOtpEmail(data.email || email);
            setOtpStep(true);
            if (data.devOtp) {
                toast.info(`[Dev Mode] Verification OTP: ${data.devOtp}`, { duration: 12000 });
            } else {
                toast.success(data.message || 'Verification code sent to your email');
            }
            return data;
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const verifyOtp = async (email, otp) => {
        if (!email || !otp) {
            toast.error('Email and OTP are required');
            return;
        }

        setOtpLoading(true);
        try {
            const res = await fetch('/api/auth/signup/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, otp })
            });

            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || 'Invalid verification code');
                return;
            }

            localStorage.setItem('chat-user', JSON.stringify(data));
            const authEvent = new Event('auth:login');
            window.dispatchEvent(authEvent);
            toast.success('Account created successfully! Welcome!');
            return data;
        } catch (error) {
            toast.error(error.message);
        } finally {
            setOtpLoading(false);
        }
    };

    const resendOtp = async (email) => {
        if (!email) return;
        setResendLoading(true);
        try {
            const res = await fetch('/api/auth/signup/resend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || 'Failed to resend code');
                return;
            }
            if (data.devOtp) {
                toast.info(`[Dev Mode] Verification OTP: ${data.devOtp}`, { duration: 12000 });
            } else {
                toast.success(data.message || 'Verification code resent');
            }
            return data;
        } catch (error) {
            toast.error(error.message);
        } finally {
            setResendLoading(false);
        }
    };

    const resetOtpStep = () => {
        setOtpStep(false);
    };

    return { loading, otpLoading, resendLoading, otpStep, otpEmail, signup, verifyOtp, resendOtp, resetOtpStep };
};

export default useSignup;
