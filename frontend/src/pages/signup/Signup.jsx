import { useState } from "react";
import GenderCheck from "./GenderCheck";
import { Link } from "react-router-dom";
import userSignup from "../../hooks/userSignup";
import {
  MessageCircle,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

const Signup = () => {
  const [inputs, setInputs] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    gender: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { loading, signup } = userSignup();

  const handleCheckBoxChange = (gender) => {
    setInputs({ ...inputs, gender });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await signup(inputs);
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-background text-foreground transition-colors duration-300">
      {/* Ambient background glowing orbs & mesh */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-blue-500/15 dark:bg-blue-600/20 blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -left-32 h-96 w-96 rounded-full bg-indigo-500/15 dark:bg-indigo-600/20 blur-3xl" />
        <div className="absolute -bottom-32 right-1/4 h-96 w-96 rounded-full bg-violet-500/15 dark:bg-purple-600/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(100,116,139,0.1)_1px,transparent_1px)] dark:bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_center,black_70%,transparent_100%)]" />
      </div>

      {/* Floating Theme Selector (System / Light / Dark) */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
        <ThemeToggle />
      </div>

      {/* Glassmorphic Auth Card */}
      <div className="relative w-full max-w-[460px] z-10 py-4">
        {/* Soft back-glow */}
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20 blur-xl opacity-70 dark:opacity-40" />

        <div className="relative rounded-3xl border border-border/70 dark:border-white/10 bg-card/85 dark:bg-card/70 backdrop-blur-2xl p-7 sm:p-9 shadow-2xl shadow-indigo-500/5 dark:shadow-black/60">
          {/* Top highlight gradient rim */}
          <div className="absolute inset-x-10 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

          {/* Header Brand & Title */}
          <div className="flex flex-col items-center text-center mb-6">
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
              Create an account
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Join to experience real-time encrypted AI messaging.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Display Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Display Name
              </label>
              <div className="relative flex items-center">
                <User className="absolute left-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  required
                  value={inputs.name}
                  onChange={(e) => setInputs({ ...inputs, name: e.target.value })}
                  placeholder="Alex Morgan"
                  className="pl-10 h-10.5 rounded-xl bg-background/60 dark:bg-background/40 border-border/80 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary transition-all text-sm"
                />
              </div>
            </div>

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
                  value={inputs.email}
                  onChange={(e) => setInputs({ ...inputs, email: e.target.value })}
                  placeholder="alex@example.com"
                  className="pl-10 h-10.5 rounded-xl bg-background/60 dark:bg-background/40 border-border/80 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary transition-all text-sm"
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
                  minLength={6}
                  value={inputs.password}
                  onChange={(e) => setInputs({ ...inputs, password: e.target.value })}
                  placeholder="•••••••• (min 6 characters)"
                  className="pl-10 pr-10 h-10.5 rounded-xl bg-background/60 dark:bg-background/40 border-border/80 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary transition-all text-sm"
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

            {/* Confirm Password Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Confirm Password
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={inputs.confirmPassword}
                  onChange={(e) => setInputs({ ...inputs, confirmPassword: e.target.value })}
                  placeholder="Repeat your password"
                  className="pl-10 pr-10 h-10.5 rounded-xl bg-background/60 dark:bg-background/40 border-border/80 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 p-1 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Gender Selection */}
            <div className="pt-1">
              <GenderCheck onCheckboxChange={handleCheckBoxChange} selectedGender={inputs.gender} />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full mt-3 h-11 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:via-indigo-500 hover:to-violet-500 text-white font-semibold text-sm shadow-md shadow-indigo-500/25 hover:shadow-indigo-500/35 active:scale-[0.99] transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <span>Create account</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Footer Login Link */}
          <div className="mt-5 pt-4 border-t border-border/60 text-center text-xs sm:text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1 hover:underline underline-offset-4"
            >
              Sign in
              <ArrowRight className="w-3.5 h-3.5 inline" />
            </Link>
          </div>

          {/* Security Subtext */}
          <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/75">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>End-to-end encrypted sessions</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;