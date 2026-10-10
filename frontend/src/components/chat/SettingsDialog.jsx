import { useState, useEffect, useRef } from "react";
import {
  Dialog, DialogContent,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  User, Camera, Loader2, Save, Sparkles, Key, Globe, ShieldCheck, Cpu,
  Bell, Volume2, VolumeX, Play, Upload, Trash2, Check, Music, Settings,
  CheckCircle2, Lock
} from "lucide-react";
import { useAuthContext } from "../../context/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserAvatar } from "../common/UserAvatar";
import { usePushNotifications } from "../../hooks/usePushNotifications";
import {
  BUILTIN_SOUNDS,
  isSoundEnabled,
  setSoundEnabled,
  getSelectedSound,
  setSelectedSound,
  getCustomSound,
  setCustomSound,
  removeCustomSound,
  isNotificationsEnabled,
  setNotificationsEnabled,
  playNotificationSound,
} from "../../utils/soundManager";

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
  const { requestNotificationPermission } = usePushNotifications();
  const [activeTab, setActiveTab] = useState("profile"); // 'profile' | 'ai' | 'notifications'
  const [name, setName] = useState("");
  const [profile, setProfile] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [preferredProvider, setPreferredProvider] = useState("gemini");
  const [preferredLang, setPreferredLang] = useState("English");
  const [loading, setLoading] = useState(false);

  // Notifications & Sound states
  const [soundEnabled, setLocalSoundEnabled] = useState(true);
  const [notificationsEnabled, setLocalNotificationsEnabled] = useState(true);
  const [selectedSound, setLocalSelectedSound] = useState("chime");
  const [customSoundData, setCustomSoundData] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setLocalSoundEnabled(isSoundEnabled());
      setLocalNotificationsEnabled(isNotificationsEnabled());
      setLocalSelectedSound(getSelectedSound());
      setCustomSoundData(getCustomSound());
    }
    if (authUser) {
      setName(authUser.name || "");
      setProfile(authUser.profile || authUser.profilePic || "");
      
      const dbAi = authUser.aiSettings || {};
      setGeminiKey(dbAi.geminiApiKeyMasked || localStorage.getItem("gemini_api_key") || "");
      setOpenaiKey(dbAi.openaiApiKeyMasked || "");
      setPreferredProvider(dbAi.preferredProvider || "gemini");
      setPreferredLang(dbAi.preferredLanguage || localStorage.getItem("preferred_translation_lang") || "English");
    }
  }, [authUser, open]);

  const handleToggleNotifications = async () => {
    const nextVal = !notificationsEnabled;
    setLocalNotificationsEnabled(nextVal);
    setNotificationsEnabled(nextVal);
    if (nextVal) {
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
        const res = await requestNotificationPermission();
        if (res === "granted") {
          toast.success("Desktop notifications enabled!");
        } else if (res === "denied") {
          toast.error("Notifications are blocked in your browser site settings.");
        }
      } else {
        toast.success("Desktop notifications enabled!");
      }
    } else {
      toast.info("Desktop notifications disabled");
    }
  };

  const handleToggleSound = () => {
    const nextVal = !soundEnabled;
    setLocalSoundEnabled(nextVal);
    setSoundEnabled(nextVal);
    if (nextVal) {
      toast.success("Notification sound enabled!");
      playNotificationSound(selectedSound, true);
    } else {
      toast.info("Notification sound muted");
    }
  };

  const handleSelectSound = (soundId) => {
    setLocalSelectedSound(soundId);
    setSelectedSound(soundId);
    playNotificationSound(soundId, true);
  };

  const handlePreviewSound = (e, soundId) => {
    e.stopPropagation();
    playNotificationSound(soundId, true);
  };

  const handleCustomSoundUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("audio/") && !file.name.match(/\.(mp3|wav|ogg|m4a|aac)$/i)) {
      toast.error("Please upload a valid audio file (.mp3, .wav, .ogg, .m4a)");
      return;
    }

    if (file.size > 2.5 * 1024 * 1024) {
      toast.error("Audio file is too large. Please upload an audio under 2.5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      setCustomSound(dataUrl, file.name);
      setCustomSoundData({ data: dataUrl, name: file.name });
      setLocalSelectedSound("custom");
      playNotificationSound("custom", true);
      toast.success(`Custom sound "${file.name}" saved!`);
    };
    reader.onerror = () => {
      toast.error("Failed to read audio file");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemoveCustomSound = (e) => {
    e.stopPropagation();
    removeCustomSound();
    setCustomSoundData(null);
    setLocalSelectedSound("chime");
    playNotificationSound("chime", true);
    toast.info("Custom sound removed, reset to Default Bell");
  };

  const handleTestAlert = async () => {
    playNotificationSound(selectedSound, true);

    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.info("Desktop notifications not supported in this browser.");
      return;
    }

    if (Notification.permission !== "granted") {
      const res = await requestNotificationPermission();
      if (res !== "granted") {
        toast.error("Notification permission not granted in browser settings.");
        return;
      }
    }

    try {
      new Notification("🔔 SendChat Alert Test", {
        body: "Notifications and sounds are working great!",
        icon: "/icons/icon-192.png",
        badge: "/icons/badge-72.png"
      });
      toast.success("Desktop test notification dispatched!");
    } catch (_) {
      if (navigator.serviceWorker && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification("🔔 SendChat Alert Test", {
            body: "Notifications and sounds are working great!",
            icon: "/icons/icon-192.png",
            badge: "/icons/badge-72.png"
          });
          toast.success("Desktop test notification dispatched!");
        }).catch(() => {});
      }
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (activeTab === "notifications") {
      setSoundEnabled(soundEnabled);
      setNotificationsEnabled(notificationsEnabled);
      setSelectedSound(selectedSound);
      toast.success("Sound & notification preferences saved!");
      onOpenChange(false);
      return;
    }
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
      <DialogContent className="sm:max-w-4xl md:max-w-4xl lg:max-w-5xl w-[95vw] h-[86vh] max-h-[86vh] p-0 gap-0 overflow-hidden flex flex-col md:flex-row rounded-2xl bg-background border border-border shadow-2xl">
        {/* Left Sidebar Navigation */}
        <aside className="w-full md:w-64 lg:w-72 shrink-0 bg-muted/30 md:bg-muted/40 border-b md:border-b-0 md:border-r border-border flex flex-col justify-between">
          <div className="flex flex-col">
            {/* Sidebar Branding & Title */}
            <div className="p-4 md:p-5 border-b border-border/50">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0 shadow-2xs">
                  <Settings className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground leading-tight">Settings</h2>
                  <p className="text-[11px] text-muted-foreground">Preferences & configurations</p>
                </div>
              </div>
            </div>

            {/* Vertical Navigation Tabs */}
            <nav className="p-2 md:p-3 flex md:flex-col gap-1.5 overflow-x-auto md:overflow-x-visible">
              <button
                type="button"
                onClick={() => setActiveTab("profile")}
                className={`flex-1 md:flex-initial flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                  activeTab === "profile"
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground font-medium"
                }`}
              >
                <div className={`h-8 w-8 rounded-lg grid place-items-center shrink-0 ${
                  activeTab === "profile" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                }`}>
                  <User className="h-4 w-4" />
                </div>
                <div className="hidden md:block min-w-0">
                  <div className="text-xs font-semibold leading-tight">My Profile</div>
                  <div className={`text-[10px] truncate ${activeTab === "profile" ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                    Name, avatar & theme
                  </div>
                </div>
                <span className="md:hidden text-xs font-semibold">Profile</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("ai")}
                className={`flex-1 md:flex-initial flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                  activeTab === "ai"
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground font-medium"
                }`}
              >
                <div className={`h-8 w-8 rounded-lg grid place-items-center shrink-0 ${
                  activeTab === "ai" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                }`}>
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="hidden md:block min-w-0">
                  <div className="text-xs font-semibold leading-tight">AI & API Keys</div>
                  <div className={`text-[10px] truncate ${activeTab === "ai" ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                    Gemini, OpenAI, language
                  </div>
                </div>
                <span className="md:hidden text-xs font-semibold">AI & Keys</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("notifications")}
                className={`flex-1 md:flex-initial flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                  activeTab === "notifications"
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground font-medium"
                }`}
              >
                <div className={`h-8 w-8 rounded-lg grid place-items-center shrink-0 ${
                  activeTab === "notifications" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                }`}>
                  <Bell className="h-4 w-4" />
                </div>
                <div className="hidden md:block min-w-0">
                  <div className="text-xs font-semibold leading-tight">Alerts & Sounds</div>
                  <div className={`text-[10px] truncate ${activeTab === "notifications" ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                    Chimes, custom sound, push
                  </div>
                </div>
                <span className="md:hidden text-xs font-semibold">Alerts</span>
              </button>
            </nav>
          </div>

          {/* User profile card at bottom of left sidebar (desktop only) */}
          <div className="hidden md:block p-3.5 m-3 rounded-xl bg-card border border-border/80 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <UserAvatar
                src={profile || authUser?.profilePic}
                name={name || authUser?.name || "User"}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-foreground truncate">{name || authUser?.name || "SendChat User"}</div>
                <div className="text-[10px] text-muted-foreground truncate">{authUser?.email || authUser?.username || ""}</div>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Connected
              </span>
              <span className="font-mono">v2.0</span>
            </div>
          </div>
        </aside>

        {/* Right Content Pane */}
        <section className="flex-1 min-h-0 flex flex-col overflow-hidden bg-background">
          {/* Header of Active Section */}
          <div className="p-3.5 md:p-5 pr-12 border-b border-border/60 shrink-0">
            <h3 className="text-sm md:text-base font-bold text-foreground flex items-center gap-2">
              {activeTab === "profile" && "Personal Profile"}
              {activeTab === "ai" && "AI Intelligence & Encryption"}
              {activeTab === "notifications" && "Alerts & Audio Chimes"}
            </h3>
            <p className="text-[11px] md:text-xs text-muted-foreground mt-0.5">
              {activeTab === "profile" && "Manage how other users see you in conversations and appearance preferences"}
              {activeTab === "ai" && "Configure Gemini or OpenAI credentials encrypted at rest with AES-256 GCM"}
              {activeTab === "notifications" && "Choose sound chimes and toggle desktop notifications for incoming messages"}
            </p>
          </div>

          {/* Scrollable Form Body */}
          <form onSubmit={handleSave} className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-5 scrollbar-thin">
              {activeTab === "profile" ? (
                <>
                  {/* Profile Header Card */}
                  <div className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-card/50">
                    <div className="relative group shrink-0">
                      <UserAvatar
                        src={profile}
                        name={name || authUser?.name || "User"}
                        size="xl"
                        className="border-3 border-primary/20 shadow-md"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <Camera className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <div className="text-sm font-bold text-foreground truncate">{name || authUser?.name || "SendChat User"}</div>
                      <div className="text-xs text-muted-foreground truncate">{authUser?.email || authUser?.username || ""}</div>
                      <p className="text-[11px] text-muted-foreground pt-1">
                        Enter a photo image URL below to customize your avatar.
                      </p>
                    </div>
                  </div>

                  {/* Form fields */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
                        Email / Username (Read Only)
                      </label>
                      <input
                        value={authUser?.username || authUser?.email || ""}
                        disabled
                        className="w-full rounded-xl border border-border bg-muted/50 px-3.5 py-2.5 text-xs text-muted-foreground cursor-not-allowed font-medium"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
                        Display Name
                      </label>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name..."
                        required
                        className="w-full rounded-xl border border-border bg-muted/20 px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
                        Avatar Image URL
                      </label>
                      <input
                        value={profile}
                        onChange={(e) => setProfile(e.target.value)}
                        placeholder="https://example.com/avatar.png"
                        className="w-full rounded-xl border border-border bg-muted/20 px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                      />
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
                        Theme & Appearance
                      </label>
                      <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                        <span className="text-xs text-foreground font-medium">Color Scheme (Light / Dark)</span>
                        <ThemeToggle showLabels={true} />
                      </div>
                    </div>
                  </div>
                </>
              ) : activeTab === "ai" ? (
                <div className="space-y-4">
                  {/* Security Shield Banner */}
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-foreground/90 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 text-[11px] uppercase tracking-wider">
                      <ShieldCheck className="h-4 w-4" /> AES-256 Encrypted Database Storage
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Your keys are cryptographically encrypted at rest before storing in MongoDB. They are never transmitted in plain text or shared with other chat participants.
                    </p>
                  </div>

                  {/* AI Provider Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1 flex items-center gap-1">
                      <Cpu className="h-3 w-3" /> Active AI Provider
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setPreferredProvider("gemini")}
                        className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                          preferredProvider === "gemini" ? "border-primary bg-primary/10 text-primary shadow-xs" : "border-border bg-card text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span>✨ Google Gemini (Recommended)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreferredProvider("openai")}
                        className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                          preferredProvider === "openai" ? "border-primary bg-primary/10 text-primary shadow-xs" : "border-border bg-card text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span>⚡ OpenAI / Custom LLM</span>
                      </button>
                    </div>
                  </div>

                  {/* Gemini API Key */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Key className="h-3 w-3" /> Gemini API Key
                      </label>
                      <span className="text-[10px] text-muted-foreground">Google AI Studio</span>
                    </div>
                    <input
                      type="password"
                      value={geminiKey}
                      onChange={(e) => setGeminiKey(e.target.value)}
                      placeholder="AIzaSy... (leave empty to use server default)"
                      className="w-full rounded-xl border border-border bg-muted/20 px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                    />
                  </div>

                  {/* OpenAI / Other AI Key */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Key className="h-3 w-3" /> OpenAI API Key
                      </label>
                      <span className="text-[10px] text-muted-foreground">Optional</span>
                    </div>
                    <input
                      type="password"
                      value={openaiKey}
                      onChange={(e) => setOpenaiKey(e.target.value)}
                      placeholder="sk-proj-... (or compatible API key)"
                      className="w-full rounded-xl border border-border bg-muted/20 px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                    />
                  </div>

                  {/* Default Translation Language */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1 flex items-center gap-1">
                      <Globe className="h-3 w-3" /> Default Translation Target Language
                    </label>
                    <select
                      value={preferredLang}
                      onChange={(e) => setPreferredLang(e.target.value)}
                      className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
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
              ) : (
                <div className="space-y-4">
                  {/* Desktop Notifications Toggle Box */}
                  <div className="p-4 rounded-2xl border border-border bg-card/60 shadow-2xs space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary grid place-items-center">
                            <Bell className="h-4 w-4" />
                          </div>
                          <span className="text-sm font-bold text-foreground">Desktop Notifications</span>
                        </div>
                        <p className="text-xs text-muted-foreground pl-9">
                          Instant desktop alerts when you're in other tabs or apps. Auto-enabled for incoming messages.
                        </p>
                      </div>
                      {/* Switch Toggle */}
                      <button
                        type="button"
                        onClick={handleToggleNotifications}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          notificationsEnabled ? "bg-primary" : "bg-muted-foreground/30"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            notificationsEnabled ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground font-medium">Browser Permission:</span>
                        {typeof window !== "undefined" && "Notification" in window ? (
                          Notification.permission === "granted" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">
                              <Check className="h-3 w-3" /> Allowed
                            </span>
                          ) : Notification.permission === "denied" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/15 text-destructive font-semibold text-[10px]">
                              Blocked in site settings
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold text-[10px]">
                              Ready (Prompts on action)
                            </span>
                          )
                        ) : (
                          <span className="text-muted-foreground">Unsupported</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleTestAlert}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg border border-border bg-background hover:bg-muted text-foreground text-xs font-semibold transition-all active:scale-95 shadow-2xs cursor-pointer"
                      >
                        <Play className="h-2.5 w-2.5 fill-current" /> Test Alert
                      </button>
                    </div>
                  </div>

                  {/* Sound Effects Toggle Box */}
                  <div className="p-4 rounded-2xl border border-border bg-card/60 shadow-2xs">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-lg bg-sky-500/10 text-sky-500 grid place-items-center">
                          {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                        </div>
                        <div>
                          <span className="text-sm font-bold text-foreground">Incoming Message Sound</span>
                          <p className="text-xs text-muted-foreground">Play chime when new messages arrive</p>
                        </div>
                      </div>
                      {/* Switch Toggle */}
                      <button
                        type="button"
                        onClick={handleToggleSound}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          soundEnabled ? "bg-primary" : "bg-muted-foreground/30"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            soundEnabled ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Sound Chimes Selector (5 Built-in + Custom) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Music className="h-3 w-3" /> Select Sound for Incoming Messages (5 Built-in + Custom)
                      </label>
                      <span className="text-[10px] text-muted-foreground italic">Click card to select</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {BUILTIN_SOUNDS.map((snd) => {
                        const isSelected = selectedSound === snd.id;
                        return (
                          <div
                            key={snd.id}
                            onClick={() => handleSelectSound(snd.id)}
                            className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                              isSelected
                                ? "border-primary bg-primary/10 shadow-xs text-foreground"
                                : "border-border bg-card/40 hover:bg-muted/40 text-foreground"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                                isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
                              }`}>
                                {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-semibold truncate">{snd.name}</div>
                                <div className="text-[10px] text-muted-foreground truncate">{snd.description}</div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => handlePreviewSound(e, snd.id)}
                              className="h-7 w-7 rounded-lg border border-border bg-background hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-all shrink-0 ml-2 shadow-2xs active:scale-90"
                              title={`Play ${snd.name} preview`}
                            >
                              <Play className="h-3 w-3 fill-current ml-0.5" />
                            </button>
                          </div>
                        );
                      })}

                      {/* 6. Custom Upload Option */}
                      <div
                        onClick={() => {
                          if (customSoundData) {
                            handleSelectSound("custom");
                          } else {
                            fileInputRef.current?.click();
                          }
                        }}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                          selectedSound === "custom"
                            ? "border-primary bg-primary/10 shadow-xs text-foreground"
                            : "border-border bg-card/40 hover:bg-muted/40 text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                            selectedSound === "custom" ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
                          }`}>
                            {selectedSound === "custom" && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold truncate flex items-center gap-1.5">
                              <span>Custom Sound</span>
                              {customSoundData && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-primary/20 text-primary font-medium">Uploaded</span>
                              )}
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate">
                              {customSoundData ? customSoundData.name : "Upload audio file (.mp3, .wav)"}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          {customSoundData ? (
                            <>
                              <button
                                type="button"
                                onClick={(e) => handlePreviewSound(e, "custom")}
                                className="h-7 w-7 rounded-lg border border-border bg-background hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-all shadow-2xs active:scale-90"
                                title="Play custom sound preview"
                              >
                                <Play className="h-3 w-3 fill-current ml-0.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  fileInputRef.current?.click();
                                }}
                                className="h-7 w-7 rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-all shadow-2xs"
                                title="Upload different audio"
                              >
                                <Upload className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={handleRemoveCustomSound}
                                className="h-7 w-7 rounded-lg border border-destructive/30 bg-destructive/10 hover:bg-destructive text-destructive hover:text-destructive-foreground flex items-center justify-center transition-all shadow-2xs"
                                title="Delete custom sound"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                fileInputRef.current?.click();
                              }}
                              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all flex items-center gap-1 shadow-2xs active:scale-95"
                            >
                              <Upload className="h-3 w-3" /> Choose
                            </button>
                          )}
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="audio/*,.mp3,.wav,.ogg,.m4a"
                            onChange={handleCustomSoundUpload}
                            className="hidden"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Modal Footer */}
            <div className="border-t border-border/70 p-3.5 px-6 bg-card/60 backdrop-blur-xs flex items-center justify-between shrink-0">
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span>Private & secured</span>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all shadow-md shadow-primary/20 active:scale-95 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : activeTab === "notifications" ? (
                  <>
                    <Check className="h-4 w-4" />
                    Apply Sound & Alert Settings
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Settings & Keys
                  </>
                )}
              </button>
            </div>
          </form>
        </section>
      </DialogContent>
    </Dialog>
  );
}

export default SettingsDialog;
