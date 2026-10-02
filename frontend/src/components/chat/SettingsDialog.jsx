import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { User, Camera, Loader2, Save, Sparkles, Key, Globe, ShieldCheck, Cpu } from "lucide-react";
import { useAuthContext } from "../../context/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserAvatar } from "../common/UserAvatar";

const INDIAN_LANGUAGES = [
  { value: "Hindi", label: "Hindi (हिंदी)" },
  { value: "Marathi", label: "Marathi (मराठी)" },
  { value: "Bengali", label: "Bengali (বাংলা)" },
  { value: "Gujarati", label: "Gujarati (ગુજરાતી)" },
  { value: "Tamil", label: "Tamil (தமிழ்)" },
  { value: "Telugu", label: "Telugu (తెలుగు)" },
  { value: "Kannada", label: "Kannada (ಕನ್ನಡ)" },
  { value: "Malayalam", label: "Malayalam (മലയാളം)" },
  { value: "Punjabi", label: "Punjabi (ਪੰਜਾਬੀ)" },
  { value: "Odia", label: "Odia (ଓଡ଼ିଆ)" },
  { value: "Urdu", label: "Urdu (اردو)" },
  { value: "Assamese", label: "Assamese (অসমীয়া)" },
  { value: "Sanskrit", label: "Sanskrit (संस्कृत)" },
];

const GLOBAL_LANGUAGES = [
  { value: "English", label: "English" },
  { value: "Spanish", label: "Spanish (Español)" },
  { value: "French", label: "French (Français)" },
  { value: "German", label: "German (Deutsch)" },
  { value: "Japanese", label: "Japanese (日本語)" },
  { value: "Chinese", label: "Chinese (中文)" },
  { value: "Arabic", label: "Arabic (العربية)" },
  { value: "Portuguese", label: "Portuguese (Português)" },
  { value: "Russian", label: "Russian (Русский)" },
  { value: "Korean", label: "Korean (한국어)" },
  { value: "Italian", label: "Italian (Italiano)" },
];

export function SettingsDialog({ open, onOpenChange }) {
  const { authUser, setAuthUser } = useAuthContext();
  const [activeTab, setActiveTab] = useState("profile"); // 'profile' | 'ai'
  const [name, setName] = useState("");
  const [profile, setProfile] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [preferredProvider, setPreferredProvider] = useState("gemini");
  const [preferredLang, setPreferredLang] = useState("English");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authUser) {
      setName(authUser.name || "");
      setProfile(authUser.profile || "");
      
      const dbAi = authUser.aiSettings || {};
      setGeminiKey(dbAi.geminiApiKeyMasked || localStorage.getItem("gemini_api_key") || "");
      setOpenaiKey(dbAi.openaiApiKeyMasked || "");
      setPreferredProvider(dbAi.preferredProvider || "gemini");
      setPreferredLang(dbAi.preferredLanguage || localStorage.getItem("preferred_translation_lang") || "English");
    }
  }, [authUser, open]);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Package profile and AI settings to save in MongoDB
      const payload = {
        name,
        profilePic: profile,
        aiSettings: {
          geminiApiKey: geminiKey,
          openaiApiKey: openaiKey,
          preferredProvider,
          preferredLanguage: preferredLang
        }
      };

      const res = await fetch("/api/users/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Update state and local storage with response (keys are securely masked)
      setAuthUser(data);
      localStorage.setItem("chat-user", JSON.stringify(data));

      if (geminiKey.trim() && !geminiKey.includes("••••")) {
        localStorage.setItem("gemini_api_key", geminiKey.trim());
      } else if (!geminiKey.trim()) {
        localStorage.removeItem("gemini_api_key");
      }
      localStorage.setItem("preferred_translation_lang", preferredLang);

      toast.success("Profile & encrypted AI keys saved in database!");
      onOpenChange(false);
    } catch (err) {
      toast.error(err.message || "Failed to update settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[94vw] max-h-[92dvh] overflow-y-auto bg-background border-border shadow-2xl p-5 sm:p-6">
        <DialogHeader className="pt-1">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            Settings
          </DialogTitle>
          <DialogDescription>
            Manage your personal profile and encrypted AI keys stored in database.
          </DialogDescription>
        </DialogHeader>

        {/* Tab switch */}
        <div className="flex rounded-xl bg-muted p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
              activeTab === "profile" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <User className="h-3.5 w-3.5" />
            Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ai")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
              activeTab === "ai" ? "bg-card text-primary shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            AI & API Keys
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 py-2">
          {activeTab === "profile" ? (
            <>
              <div className="flex flex-col items-center gap-3 pt-1">
                <div className="relative group">
                  <UserAvatar
                    src={profile}
                    name={name || authUser?.name || "User"}
                    size="xl"
                    className="border-4 border-primary/20 shadow-lg"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera className="h-5 w-5 text-white" />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Profile Photo</p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Email / Username</label>
                  <input
                    value={authUser?.username || authUser?.email || ""}
                    disabled
                    className="w-full rounded-xl border border-border bg-muted/50 px-3.5 py-2 text-sm text-muted-foreground cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Display Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name..."
                    required
                    className="w-full rounded-xl border border-border bg-muted/30 px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Avatar Image URL</label>
                  <input
                    value={profile}
                    onChange={(e) => setProfile(e.target.value)}
                    placeholder="https://example.com/avatar.png"
                    className="w-full rounded-xl border border-border bg-muted/30 px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Theme & Appearance</label>
                  <div className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-muted/20">
                    <span className="text-xs text-foreground font-medium">Color Scheme</span>
                    <ThemeToggle showLabels={true} />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-3.5 pt-1">
              {/* Security Shield Banner */}
              <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-xs text-foreground/90 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-green-600 dark:text-green-400 text-[11px] uppercase tracking-wider">
                  <ShieldCheck className="h-3.5 w-3.5" /> AES-256 Encrypted Database Storage
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Keys are cryptographically encrypted at rest before storing in MongoDB. They are never sent in plain text to other users or logged.
                </p>
              </div>

              {/* AI Provider Selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1 flex items-center gap-1">
                  <Cpu className="h-3 w-3" /> Active AI Provider
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPreferredProvider("gemini")}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      preferredProvider === "gemini" ? "border-primary bg-primary/10 text-primary shadow-xs" : "border-border bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>✨ Google Gemini</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreferredProvider("openai")}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      preferredProvider === "openai" ? "border-primary bg-primary/10 text-primary shadow-xs" : "border-border bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>⚡ OpenAI / Other</span>
                  </button>
                </div>
              </div>

              {/* Gemini API Key */}
              <div className="space-y-1">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Key className="h-3 w-3" /> Gemini API Key
                  </label>
                  <span className="text-[10px] text-muted-foreground italic">Google AI</span>
                </div>
                <input
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="AIzaSy... (leave empty to use server default)"
                  className="w-full rounded-xl border border-border bg-muted/30 px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono text-xs"
                />
              </div>

              {/* OpenAI / Other AI Key */}
              <div className="space-y-1">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Key className="h-3 w-3" /> OpenAI / Other AI Key
                  </label>
                  <span className="text-[10px] text-muted-foreground italic">Optional</span>
                </div>
                <input
                  type="password"
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="sk-proj-... (or compatible API key)"
                  className="w-full rounded-xl border border-border bg-muted/30 px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono text-xs"
                />
              </div>

              {/* Default Translation Language */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1 flex items-center gap-1">
                  <Globe className="h-3 w-3" /> Default Translation Target
                </label>
                <select
                  value={preferredLang}
                  onChange={(e) => setPreferredLang(e.target.value)}
                  className="w-full rounded-xl border border-border bg-card px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                >
                  <optgroup label="🇮🇳 Indian Languages">
                    {INDIAN_LANGUAGES.map((lang) => (
                      <option key={lang.value} value={lang.value}>{lang.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="🌐 Global Languages">
                    {GLOBAL_LANGUAGES.map((lang) => (
                      <option key={lang.value} value={lang.value}>{lang.label}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>
          )}

          <DialogFooter className="pt-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all shadow-md shadow-primary/20 active:scale-95"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving in Database...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Settings & Keys
                </>
              )}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default SettingsDialog;
