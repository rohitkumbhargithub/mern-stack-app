import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import userLogin from "../../hooks/userLogin";
import {
  MessageCircle,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  KeyRound,
  RotateCcw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // 6-digit OTP state
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef([]);
  const [countdown, setCountdown] = useState(30);

  const {
    loading,
    otpLoading,
    resendLoading,
    otpStep,
    otpEmail,
    login,
    verifyOtp,
    resendOtp,
    resetOtpStep,
  } = userLogin();

  // Reset timer & focus first box when transitioning to OTP step
  useEffect(() => {
    if (otpStep) {
      setCountdown(30);
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 150);
    }
  }, [otpStep]);

  // Resend countdown timer
  useEffect(() => {
    if (!otpStep || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpStep, countdown]);

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    await login(email, password);
  };

  const handleOtpChange = (index, value) => {
    const cleaned = value.replace(/\D/g, "");
    if (!cleaned) {
      const updated = [...otp];
      updated[index] = "";
      setOtp(updated);
      return;
    }

    const char = cleaned.slice(-1);
    const updated = [...otp];
    updated[index] = char;
    setOtp(updated);

    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    } else {
      const fullOtp = updated.join("");
      if (fullOtp.length === 6) {
        verifyOtp(otpEmail, fullOtp);
      }
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const updated = [...otp];
    for (let i = 0; i < 6; i++) {
      updated[i] = pasted[i] || "";
    }
    setOtp(updated);

    const nextIndex = Math.min(pasted.length, 5);
    inputRefs.current[nextIndex]?.focus();

    if (pasted.length === 6) {
      verifyOtp(otpEmail, pasted);
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    const fullOtp = otp.join("");
    await verifyOtp(otpEmail, fullOtp);
  };

  const handleResend = async () => {
    if (countdown > 0 || resendLoading) return;
    const success = await resendOtp(otpEmail);
    if (success) {
      setCountdown(30);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    }
  };

  const handleBackToLogin = () => {
    resetOtpStep();
    setOtp(["", "", "", "", "", ""]);
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-background text-foreground transition-colors duration-300">
      {/* Ambient background glowing orbs & mesh */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-blue-500/15 dark:bg-blue-600/20 blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -right-32 h-96 w-96 rounded-full bg-indigo-500/15 dark:bg-indigo-600/20 blur-3xl" />
        <div className="absolute -bottom-32 left-1/4 h-96 w-96 rounded-full bg-violet-500/15 dark:bg-purple-600/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(100,116,139,0.1)_1px,transparent_1px)] dark:bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_center,black_70%,transparent_100%)]" />
      </div>

      {/* Floating Theme Selector (System / Light / Dark) */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
        <ThemeToggle />
      </div>

      {/* Glassmorphic Auth Card */}
      <div className="relative w-full max-w-[430px] z-10 transition-all duration-300">
        {/* Soft back-glow */}
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20 blur-xl opacity-70 dark:opacity-40" />

        <div className="relative rounded-3xl border border-border/70 dark:border-white/10 bg-card/85 dark:bg-card/70 backdrop-blur-2xl p-7 sm:p-9 shadow-2xl shadow-indigo-500/5 dark:shadow-black/60">
          {/* Top highlight gradient rim */}
          <div className="absolute inset-x-10 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

          {!otpStep ? (
            /* STEP 1: Email & Password Form */
            <>
              {/* Header Brand & Title */}
              <div className="flex flex-col items-center text-center mb-7">
                <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30 ring-4 ring-indigo-500/10 mb-3.5">
                  <MessageCircle className="w-6 h-6" />
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                </div>

                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 mb-2">
                  <Sparkles className="w-3 h-3 text-primary" />
                  <span>SendChat • Real-Time AI</span>
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Welcome back
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                  Log in with 2-step email verification security.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                {/* Email Field */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Email Address
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="pl-10 h-11 rounded-xl bg-background/60 dark:bg-background/40 border-border/80 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary transition-all text-sm"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Password
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-10 pr-10 h-11 rounded-xl bg-background/60 dark:bg-background/40 border-border/80 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary transition-all text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 p-1 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 h-11 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:via-indigo-500 hover:to-violet-500 text-white font-semibold text-sm shadow-md shadow-indigo-500/25 hover:shadow-indigo-500/35 active:scale-[0.99] transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Verifying credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue with Email OTP</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              {/* Footer Register Link */}
              <div className="mt-6 pt-5 border-t border-border/60 text-center text-xs sm:text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link
                  to="/signup"
                  className="font-semibold text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1 hover:underline underline-offset-4"
                >
                  Create account
                  <ArrowRight className="w-3.5 h-3.5 inline" />
                </Link>
              </div>

              {/* Security Subtext */}
              <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/75">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span>Protected by 2-step email authentication</span>
              </div>
            </>
          ) : (
            /* STEP 2: Email OTP Verification Form */
            <div className="animate-in fade-in zoom-in-95 duration-200">
              {/* Back to credentials button */}
              <button
                type="button"
                onClick={handleBackToLogin}
                className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
              >
                <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
                Back to email
              </button>

              {/* Header */}
              <div className="flex flex-col items-center text-center mb-6">
                <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-600 to-indigo-600 text-white shadow-lg shadow-emerald-500/20 ring-4 ring-emerald-500/10 mb-3.5">
                  <KeyRound className="w-6 h-6" />
                </div>

                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mb-2">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Two-Step Verification</span>
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Check your email
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-xs">
                  We sent a 6-digit verification code to
                  <span className="block font-semibold text-foreground mt-0.5 truncate max-w-full">
                    {otpEmail}
                  </span>
                </p>
              </div>

              {/* OTP Form */}
              <form onSubmit={handleVerifySubmit} className="space-y-5">
                {/* 6-Digit Inputs */}
                <div className="flex items-center justify-between gap-1.5 sm:gap-2" onPaste={handleOtpPaste}>
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (inputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      autoComplete="one-time-code"
                      className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-mono font-bold rounded-xl border border-border/80 bg-background/70 dark:bg-background/40 focus:border-primary focus:ring-2 focus:ring-primary/40 outline-none transition-all shadow-xs selection:bg-transparent"
                    />
                  ))}
                </div>

                {/* Submit Verify CTA */}
                <Button
                  type="submit"
                  disabled={otpLoading || otp.join("").length !== 6}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:via-teal-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-md shadow-emerald-500/25 hover:shadow-emerald-500/35 active:scale-[0.99] transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {otpLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Verifying code...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify & Sign in</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>

                {/* Resend Code Section */}
                <div className="flex items-center justify-between text-xs pt-1 px-1 text-muted-foreground">
                  <span>Didn't receive the code?</span>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={countdown > 0 || resendLoading}
                    className="font-semibold text-primary hover:text-primary/80 disabled:text-muted-foreground/60 transition-colors inline-flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {resendLoading ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : countdown > 0 ? (
                      <>
                        <RotateCcw className="w-3 h-3" />
                        <span>Resend in {countdown}s</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-3 h-3" />
                        <span>Resend code</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Security Hint */}
              <div className="mt-6 pt-4 border-t border-border/60 text-center text-[11px] text-muted-foreground/75 leading-relaxed">
                Code expires in 5 minutes. Never share this code with anyone.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;