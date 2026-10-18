import { useState, useEffect, useMemo, memo } from "react";
import { 
  Video, PhoneCall, Copy, ExternalLink, Globe, Play, Calendar, Link as LinkIcon, Check, Sparkles 
} from "lucide-react";
import { toast } from "sonner";

// In-memory cache to prevent refetching during re-renders or scrolling
const previewClientCache = new Map();

/**
 * Extract all HTTP/HTTPS URLs from a text string
 */
export function extractUrls(text) {
  if (!text || typeof text !== "string") return [];
  const urlRegex = /(https?:\/\/[^\s<>"']+)/gi;
  const matches = text.match(urlRegex);
  if (!matches) return [];

  // Filter and sanitize punctuation trailing at the end of URLs (e.g. "https://site.com.")
  return Array.from(new Set(matches.map((u) => u.replace(/[.,!?;:)]+$/, ""))));
}

/**
 * Detect meeting context (e.g. "🏆 Dream Job", "July 3 - Dec 3, 2026", etc.)
 */
function extractMeetingContext(rawText, url) {
  if (!rawText) return { topic: null, schedule: null };

  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);
  let topic = null;
  let schedule = null;

  for (const line of lines) {
    if (line.includes(url)) continue;
    if (line.startsWith("@") && line.length > 3 && !topic) {
      // e.g. "@Rohit Kumbhar please join? 🏆 Dream Job"
      const cleaned = line.replace(/@[a-zA-Z0-9_\s]+(?:\b|\?)/g, "").trim();
      if (cleaned.length > 2) topic = cleaned;
    } else if (
      (line.includes("202") || line.includes("UTC") || line.includes("AM") || line.includes("PM") || line.includes("–") || line.includes("-")) &&
      !schedule
    ) {
      schedule = line;
    }
  }

  return { topic, schedule };
}

/**
 * Instant local parser for known services (Google Meet, Zoom, MS Teams, YouTube)
 */
function getInstantPreview(url, rawText) {
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const { topic, schedule } = extractMeetingContext(rawText, url);

    // 1. Google Meet
    if (domain === "meet.google.com") {
      const code = parsed.pathname.replace(/^\/+/, "").split(/[?#&]/)[0];
      return {
        url,
        domain: "meet.google.com",
        siteName: "Google Meet",
        title: topic || "Google Meet Video Call",
        schedule: schedule || null,
        description: code ? `Meeting code: ${code} • Real-time video meetings` : "Real-time video meeting by Google",
        image: "https://fonts.gstatic.com/s/i/productlogos/meet_2020q4/v6/web-96dp/logo_meet_2020q4_color_2x_web_96dp.png",
        favicon: "https://fonts.gstatic.com/s/i/productlogos/meet_2020q4/v6/web-96dp/logo_meet_2020q4_color_2x_web_96dp.png",
        isMeeting: true,
        meetingType: "google_meet",
        meetingCode: code || "",
      };
    }

    // 2. Zoom
    if (domain.includes("zoom.us")) {
      const match = parsed.pathname.match(/\/j\/(\d+)/);
      const code = match ? match[1] : "";
      return {
        url,
        domain: "zoom.us",
        siteName: "Zoom",
        title: topic || (code ? `Zoom Meeting (${code})` : "Zoom Video Meeting"),
        schedule: schedule || null,
        description: code ? `Meeting ID: ${code} • Connect in Zoom video call` : "Zoom video conference",
        image: "https://st1.zoom.us/zoom.ico",
        favicon: "https://st1.zoom.us/zoom.ico",
        isMeeting: true,
        meetingType: "zoom",
        meetingCode: code,
      };
    }

    // 3. Microsoft Teams
    if (domain.includes("teams.microsoft.com") || domain.includes("teams.live.com")) {
      return {
        url,
        domain: "teams.microsoft.com",
        siteName: "Microsoft Teams",
        title: topic || "Microsoft Teams Meeting",
        schedule: schedule || null,
        description: "Click to join Microsoft Teams video call",
        image: "https://statics.teams.cdn.office.net/evergreen-assets/icons/favicon.ico",
        favicon: "https://statics.teams.cdn.office.net/evergreen-assets/icons/favicon.ico",
        isMeeting: true,
        meetingType: "teams",
      };
    }

    // 4. YouTube
    if (domain.includes("youtube.com") || domain.includes("youtu.be")) {
      let ytId = null;
      if (domain.includes("youtu.be")) {
        ytId = parsed.pathname.slice(1).split(/[?#&]/)[0];
      } else {
        ytId = parsed.searchParams.get("v");
      }
      return {
        url,
        domain: "youtube.com",
        siteName: "YouTube",
        title: "YouTube Video",
        description: `Watch on YouTube (${ytId || "Video"})`,
        image: ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null,
        favicon: "https://www.youtube.com/s/desktop/favicon.ico",
        isVideo: true,
        youtubeId: ytId,
      };
    }

    return null;
  } catch {
    return null;
  }
}

export const LinkPreviewCard = memo(function LinkPreviewCard({ url, rawText, mine }) {
  const [preview, setPreview] = useState(() => {
    if (previewClientCache.has(url)) {
      return previewClientCache.get(url);
    }
    return getInstantPreview(url, rawText);
  });
  const [loading, setLoading] = useState(!preview);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (previewClientCache.has(url)) {
      setPreview(previewClientCache.get(url));
      setLoading(false);
      return;
    }

    const instant = getInstantPreview(url, rawText);
    if (instant) {
      setPreview(instant);
      previewClientCache.set(url, instant);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const fetchPreview = async () => {
      try {
        const res = await fetch(`/api/messages/link-preview/info?url=${encodeURIComponent(url)}`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            previewClientCache.set(url, data);
            setPreview(data);
          }
        } else {
          // Fallback to domain card
          try {
            const parsed = new URL(url);
            const domain = parsed.hostname.replace(/^www\./, "");
            const fallback = {
              url,
              domain,
              siteName: domain,
              title: domain,
              description: `Visit ${domain}`,
              favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
            };
            if (isMounted) {
              previewClientCache.set(url, fallback);
              setPreview(fallback);
            }
          } catch {}
        }
      } catch (err) {
        // Fallback gracefully
        try {
          const parsed = new URL(url);
          const domain = parsed.hostname.replace(/^www\./, "");
          const fallback = {
            url,
            domain,
            siteName: domain,
            title: domain,
            description: `Visit ${domain}`,
            favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
          };
          if (isMounted) {
            previewClientCache.set(url, fallback);
            setPreview(fallback);
          }
        } catch {}
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPreview();

    return () => {
      isMounted = false;
    };
  }, [url, rawText]);

  const handleCopyLink = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Meeting link copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) {
    return (
      <div className="mt-2.5 rounded-xl border border-border/40 bg-card/60 p-3 max-w-[340px] animate-pulse">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-4 w-4 rounded-full bg-muted"></div>
          <div className="h-3 w-28 bg-muted rounded"></div>
        </div>
        <div className="h-3 w-full bg-muted rounded mb-1.5"></div>
        <div className="h-2.5 w-3/4 bg-muted/60 rounded"></div>
      </div>
    );
  }

  if (!preview) return null;

  // 1. Specialized Meeting Card (Google Meet, Zoom, Teams)
  if (preview.isMeeting) {
    const isGoogleMeet = preview.meetingType === "google_meet";
    const isZoom = preview.meetingType === "zoom";

    return (
      <div 
        onClick={(e) => e.stopPropagation()}
        className={
          "mt-2.5 rounded-xl border overflow-hidden shadow-xs select-none max-w-[360px] sm:max-w-[400px] transition-all " +
          (isGoogleMeet
            ? "border-emerald-500/35 bg-gradient-to-br from-emerald-950/25 via-card to-teal-950/20 dark:from-emerald-950/50 dark:via-card/90 dark:to-teal-950/40 hover:border-emerald-500/55"
            : isZoom
            ? "border-sky-500/35 bg-gradient-to-br from-sky-950/25 via-card to-blue-950/20 dark:from-sky-950/50 dark:via-card/90 dark:to-blue-950/40 hover:border-sky-500/55"
            : "border-purple-500/35 bg-gradient-to-br from-purple-950/25 via-card to-indigo-950/20 dark:from-purple-950/50 dark:via-card/90 dark:to-indigo-950/40 hover:border-purple-500/55")
        }
      >
        {/* Header bar */}
        <div className={
          "flex items-center justify-between px-3 py-2 border-b " +
          (isGoogleMeet
            ? "border-emerald-500/20 bg-emerald-500/10"
            : isZoom
            ? "border-sky-500/20 bg-sky-500/10"
            : "border-purple-500/20 bg-purple-500/10")
        }>
          <div className="flex items-center gap-1.5">
            <div className={
              "h-5 w-5 rounded-md flex items-center justify-center shrink-0 " +
              (isGoogleMeet ? "bg-emerald-500/20 text-emerald-400" : isZoom ? "bg-sky-500/20 text-sky-400" : "bg-purple-500/20 text-purple-400")
            }>
              <Video className="h-3 w-3" />
            </div>
            <span className={
              "text-xs font-bold tracking-tight " +
              (isGoogleMeet ? "text-emerald-500 dark:text-emerald-400" : isZoom ? "text-sky-500 dark:text-sky-400" : "text-purple-500 dark:text-purple-400")
            }>
              {preview.siteName || "Video Meeting"}
            </span>
            <span className={
              "text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full " +
              (isGoogleMeet ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300" : isZoom ? "bg-sky-500/20 text-sky-600 dark:text-sky-300" : "bg-purple-500/20 text-purple-600 dark:text-purple-300")
            }>
              Video Call
            </span>
          </div>

          {preview.meetingCode && (
            <span className="text-[10px] font-mono text-muted-foreground bg-muted/70 px-1.5 py-0.5 rounded border border-border/40 shrink-0">
              {preview.meetingCode}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-3">
          <div className="font-semibold text-xs sm:text-sm text-foreground mb-1 leading-snug line-clamp-1">
            {preview.title || "Join Video Call"}
          </div>

          {preview.schedule && (
            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mb-1.5 font-medium line-clamp-1">
              <Calendar className="h-3 w-3 text-emerald-400 shrink-0" />
              <span>{preview.schedule}</span>
            </div>
          )}

          <div className="text-[10px] text-muted-foreground line-clamp-1 font-mono opacity-80 mb-3 truncate">
            {url}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-1">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={
                "flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-white font-semibold text-xs transition-all shadow-xs active:scale-98 cursor-pointer " +
                (isGoogleMeet
                  ? "bg-emerald-600 hover:bg-emerald-500"
                  : isZoom
                  ? "bg-sky-600 hover:bg-sky-500"
                  : "bg-purple-600 hover:bg-purple-500")
              }
            >
              <Video className="h-3.5 w-3.5" />
              <span>Join Video Call</span>
            </a>

            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg border border-border/70 hover:bg-muted text-foreground text-xs font-medium transition-colors cursor-pointer"
              title="Copy meeting link"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. YouTube Video Card
  if (preview.isVideo) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="mt-2.5 block rounded-xl border border-red-500/20 bg-card/90 hover:bg-muted/40 hover:border-red-500/40 transition-all overflow-hidden text-left shadow-2xs group select-none max-w-[340px] cursor-pointer"
      >
        {preview.image && (
          <div className="w-full h-36 bg-black relative overflow-hidden flex items-center justify-center">
            <img
              src={preview.image}
              alt={preview.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90"
            />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <div className="h-10 w-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <Play className="h-5 w-5 fill-current ml-0.5" />
              </div>
            </div>
          </div>
        )}
        <div className="p-3">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium mb-1">
            <img src={preview.favicon} alt="" className="h-3 w-3 rounded-xs shrink-0" onError={(e) => { e.currentTarget.style.display = "none"; }} />
            <span className="text-red-500 font-semibold">YouTube</span>
          </div>
          <div className="font-semibold text-xs sm:text-sm text-foreground line-clamp-1 mb-1 group-hover:text-red-500 transition-colors">
            {preview.title || "YouTube Video"}
          </div>
          {preview.description && (
            <p className="text-[11px] text-muted-foreground line-clamp-1">
              {preview.description}
            </p>
          )}
        </div>
      </a>
    );
  }

  // 3. Generic Rich Link Preview Card
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="mt-2.5 block rounded-xl border border-border/60 bg-card/90 hover:bg-muted/30 hover:border-primary/40 transition-all overflow-hidden text-left shadow-2xs group select-none max-w-[340px] cursor-pointer"
    >
      {preview.image && (
        <div className="w-full h-32 sm:h-36 bg-muted/40 overflow-hidden relative border-b border-border/40">
          <img
            src={preview.image}
            alt={preview.title || "Preview"}
            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
            onError={(e) => {
              e.currentTarget.parentElement.style.display = "none";
            }}
          />
        </div>
      )}
      <div className="p-3">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium mb-1">
          {preview.favicon && (
            <img
              src={preview.favicon}
              alt=""
              className="h-3.5 w-3.5 rounded-xs shrink-0"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          )}
          <span className="truncate">{preview.domain || preview.siteName}</span>
          <ExternalLink className="h-2.5 w-2.5 opacity-60 ml-auto shrink-0" />
        </div>
        <div className="font-semibold text-xs text-foreground line-clamp-1 mb-1 group-hover:text-primary transition-colors">
          {preview.title || url}
        </div>
        {preview.description && (
          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
            {preview.description}
          </p>
        )}
      </div>
    </a>
  );
});
