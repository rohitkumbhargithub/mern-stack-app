import { useState } from "react";
import { toast } from "sonner";
import { useAuthContext } from "../context/AuthContext";

const userLogin = () => {
    const [loading, setLoading] = useState(false);
    const [otpLoading, setOtpLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [otpStep, setOtpStep] = useState(false);
    const [otpEmail, setOtpEmail] = useState("");

    const { setAuthUser } = useAuthContext();

    const login = async (email, password) => {
        if (!email || !password) {
            toast.error("Please fill in both email and password.");
            return false;
        }

        setLoading(true);
        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim(), password }),
            });

            const text = await response.text();
            const data = text ? JSON.parse(text) : {};

            if (!response.ok) {
                throw new Error(data.error || "Login failed");
            }

            // Two-step OTP challenge
            if (data.requireOtp) {
                setOtpEmail(data.email || email.trim());
                setOtpStep(true);
                toast.success(data.message || "A 6-digit code was sent to your email.");
                return { requireOtp: true };
            }

            // Direct login fallback if requireOtp was false
            localStorage.setItem("chat-user", JSON.stringify(data));
            setAuthUser(data);
            toast.success("Welcome back!");
            return { success: true };

        } catch (err) {
            toast.error(err.message || "Failed to log in");
            return false;
        } finally {
            setLoading(false);
        }
    };

    const verifyOtp = async (email, otp) => {
        if (!otp || otp.trim().length !== 6) {
            toast.error("Please enter the complete 6-digit verification code.");
            return false;
        }

        setOtpLoading(true);
        try {
            const response = await fetch("/api/auth/verify-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email || otpEmail, otp: otp.trim() }),
            });

            const text = await response.text();
            const data = text ? JSON.parse(text) : {};

            if (!response.ok) {
                throw new Error(data.error || "Verification failed");
            }

            localStorage.setItem("chat-user", JSON.stringify(data));
            setAuthUser(data);
            toast.success(`Welcome back, ${data.name || "User"}!`);
            return true;

        } catch (err) {
            toast.error(err.message || "Invalid or expired code");
            return false;
        } finally {
            setOtpLoading(false);
        }
    };

    const resendOtp = async (email) => {
        const targetEmail = email || otpEmail;
        if (!targetEmail) return;

        setResendLoading(true);
        try {
            const response = await fetch("/api/auth/resend-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: targetEmail }),
            });

            const text = await response.text();
            const data = text ? JSON.parse(text) : {};

            if (!response.ok) {
                throw new Error(data.error || "Failed to resend code");
            }

            toast.success(data.message || "Fresh code sent to your email!");
            return true;

        } catch (err) {
            toast.error(err.message || "Could not resend code");
            return false;
        } finally {
            setResendLoading(false);
        }
    };

    const resetOtpStep = () => {
        setOtpStep(false);
        setOtpEmail("");
    };

    return {
        loading,
        otpLoading,
        resendLoading,
        otpStep,
        otpEmail,
        login,
        verifyOtp,
        resendOtp,
        resetOtpStep,
    };
};

export default userLogin;