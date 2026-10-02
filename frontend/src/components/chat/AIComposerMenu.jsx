import React, { useState } from "react";
import { Sparkles, Wand2, CheckCheck, Briefcase, Smile, Zap, Globe, Loader2, ChevronRight } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";

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

export const AIComposerMenu = React.memo(function AIComposerMenu({
  text,
  onApplyRewrite,
  onRewrite,
  isLoading = false
}) {
  const [open, setOpen] = useState(false);
  const [showTranslate, setShowTranslate] = useState(false);

  const handleAction = async (mode, targetLanguage = "English") => {
    if (!text || !text.trim()) {
      toast.info("Type a draft message first to use AI writing tools!");
      return;
    }

    setOpen(false);
    setShowTranslate(false);
    if (onRewrite) {
      await onRewrite(mode, targetLanguage);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={isLoading}
          className="grid h-9 w-9 place-items-center rounded-md text-primary hover:bg-primary/10 transition-colors relative"
          title="AI Writing Assistant (Grammar, Tone, Translate)"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <>
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
            </>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-56 p-1.5 shadow-lg border-border bg-card" side="top" align="start">
        <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-primary border-b border-border/50 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Wand2 className="h-3 w-3" /> AI Writing Tools
          </span>
          <span className="text-[9px] text-muted-foreground font-normal">Gemini</span>
        </div>

        {!showTranslate ? (
          <div className="py-1 space-y-0.5">
            <button
              type="button"
              onClick={() => handleAction("grammar")}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs hover:bg-accent text-foreground text-left transition-colors"
            >
              <CheckCheck className="h-3.5 w-3.5 text-green-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="font-medium">Fix Grammar & Polish</div>
                <div className="text-[10px] text-muted-foreground">Fix typos and punctuation</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleAction("professional")}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs hover:bg-accent text-foreground text-left transition-colors"
            >
              <Briefcase className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="font-medium">Make Professional</div>
                <div className="text-[10px] text-muted-foreground">Workplace polite & formal</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleAction("casual")}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs hover:bg-accent text-foreground text-left transition-colors"
            >
              <Smile className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="font-medium">Make Friendly</div>
                <div className="text-[10px] text-muted-foreground">Casual & warm tone</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleAction("concise")}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs hover:bg-accent text-foreground text-left transition-colors"
            >
              <Zap className="h-3.5 w-3.5 text-purple-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="font-medium">Make Concise</div>
                <div className="text-[10px] text-muted-foreground">Short & straight to the point</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setShowTranslate(true)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs hover:bg-accent text-foreground text-left transition-colors border-t border-border/40 mt-1 pt-1.5"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Globe className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                <span className="font-medium">Translate Draft…</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        ) : (
          <div className="py-1">
            <button
              type="button"
              onClick={() => setShowTranslate(false)}
              className="w-full px-2 py-1 text-[11px] text-primary hover:underline text-left mb-1 flex items-center gap-1"
            >
              ← Back to tools
            </button>
            <div className="max-h-60 overflow-y-auto space-y-0.5 pr-1">
              <div className="px-2 py-1 text-[10px] font-bold text-primary uppercase tracking-wider">
                🇮🇳 Indian Languages
              </div>
              {INDIAN_LANGUAGES.map((lang) => (
                <button
                  key={lang.value}
                  type="button"
                  onClick={() => handleAction("translate", lang.value)}
                  className="w-full px-2.5 py-1.5 rounded-md text-xs hover:bg-accent text-foreground text-left transition-colors flex items-center justify-between"
                >
                  <span>{lang.label}</span>
                </button>
              ))}

              <div className="px-2 pt-2 pb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-t border-border/50 mt-1">
                🌐 Global Languages
              </div>
              {GLOBAL_LANGUAGES.map((lang) => (
                <button
                  key={lang.value}
                  type="button"
                  onClick={() => handleAction("translate", lang.value)}
                  className="w-full px-2.5 py-1.5 rounded-md text-xs hover:bg-accent text-foreground text-left transition-colors"
                >
                  <span>{lang.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
});

export default AIComposerMenu;
