import { useState, useRef, useEffect, memo } from "react";
import { 
  FileText, Download, Play, Pause, ExternalLink, Image as ImageIcon, 
  Volume2, Music, X, ZoomIn 
} from "lucide-react";

/**
 * Format bytes to readable string (e.g., 2.4 MB)
 */
const formatFileSize = (bytes) => {
  if (!bytes || isNaN(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Format seconds to M:SS (e.g., 1:04)
 */
const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

/**
 * Modern Audio Player for Voice Notes
 */
export const AudioAttachmentPlayer = memo(({ attachment, mine }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(attachment.duration || 0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch((err) => {
        console.warn("Audio play failed:", err);
      });
    }
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio) return;
    const seekTime = parseFloat(e.target.value);
    audio.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`flex items-center gap-2.5 p-2 rounded-xl my-1 w-full max-w-xs sm:max-w-sm ${
      mine 
        ? "bg-black/10 dark:bg-white/10 text-bubble-mine-foreground" 
        : "bg-black/5 dark:bg-white/5 text-bubble-theirs-foreground"
    }`}>
      <audio ref={audioRef} src={attachment.url} preload="metadata" />

      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm hover:scale-105 active:scale-95 transition-transform"
        title={isPlaying ? "Pause voice note" : "Play voice note"}
      >
        {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
      </button>

      {/* Waveform / Progress Slider */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
        <div className="relative flex items-center">
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-black/20 dark:bg-white/20 rounded-lg appearance-none cursor-pointer accent-primary"
          />
        </div>
        <div className="flex justify-between items-center text-[10px] opacity-75 font-mono">
          <span>{formatDuration(currentTime)}</span>
          <span className="flex items-center gap-1">
            <Volume2 className="h-2.5 w-2.5 opacity-60" />
            {formatDuration(duration || attachment.duration)}
          </span>
        </div>
      </div>
    </div>
  );
});

AudioAttachmentPlayer.displayName = "AudioAttachmentPlayer";

/**
 * Document / PDF Card
 */
export const DocumentAttachmentCard = memo(({ attachment, mine }) => {
  const isPdf = attachment.type === "pdf" || (attachment.name && attachment.name.toLowerCase().endsWith(".pdf"));

  return (
    <div className={`flex items-center gap-3 p-2.5 rounded-xl my-1 border w-full max-w-sm transition-all hover:bg-black/5 dark:hover:bg-white/5 ${
      mine 
        ? "border-bubble-mine-foreground/20 bg-black/10 dark:bg-white/10 text-bubble-mine-foreground" 
        : "border-border bg-card/60 text-card-foreground"
    }`}>
      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${
        isPdf ? "bg-red-500/15 text-red-500" : "bg-blue-500/15 text-blue-500"
      }`}>
        <FileText className="h-5 w-5" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold truncate" title={attachment.name || "Document"}>
          {attachment.name || "Document"}
        </div>
        <div className="text-[10px] opacity-70 flex items-center gap-1 mt-0.5">
          <span>{isPdf ? "PDF Document" : "Attachment"}</span>
          {attachment.size && (
            <>
              <span>•</span>
              <span>{formatFileSize(attachment.size)}</span>
            </>
          )}
        </div>
      </div>

      <a
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        download={attachment.name || "document"}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-md hover:bg-black/10 dark:hover:bg-white/10 text-foreground transition-colors"
        title="Download / View document"
      >
        <Download className="h-4 w-4" />
      </a>
    </div>
  );
});

DocumentAttachmentCard.displayName = "DocumentAttachmentCard";

/**
 * Full-screen Image Lightbox Modal
 */
export const ImageLightboxModal = ({ image, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!image) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Action Bar */}
        <div className="w-full flex items-center justify-between pb-2 text-white/90 text-sm">
          <span className="truncate max-w-[70vw] font-medium">{image.name || "Photo"}</span>
          <div className="flex items-center gap-2">
            <a
              href={image.url}
              target="_blank"
              rel="noopener noreferrer"
              download={image.name || "image"}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Download original"
            >
              <Download className="h-4 w-4" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Full Image */}
        <img
          src={image.url}
          alt={image.name || "Attachment"}
          className="max-h-[82vh] max-w-full rounded-lg object-contain shadow-2xl"
        />
      </div>
    </div>
  );
};

/**
 * Message Attachments Renderer
 */
export const MessageAttachments = memo(({ attachments = [], mine = false }) => {
  const [selectedLightboxImage, setSelectedLightboxImage] = useState(null);

  if (!Array.isArray(attachments) || attachments.length === 0) {
    return null;
  }

  const images = attachments.filter((a) => a.type === "image");
  const audios = attachments.filter((a) => a.type === "audio");
  const documents = attachments.filter((a) => a.type === "pdf" || a.type === "document" || a.type === "video");

  return (
    <>
      <div className="flex flex-col gap-1.5 mb-1.5">
        {/* Images Grid */}
        {images.length > 0 && (
          <div className={`grid gap-1.5 ${images.length === 1 ? "grid-cols-1" : "grid-cols-2"} max-w-sm sm:max-w-md`}>
            {images.map((img, idx) => (
              <div 
                key={img.publicId || img.url || idx}
                onClick={() => setSelectedLightboxImage(img)}
                className="group relative cursor-pointer overflow-hidden rounded-xl bg-black/5 dark:bg-white/5 border border-border/40 hover:opacity-95 transition-opacity"
              >
                <img
                  src={img.url}
                  alt={img.name || "Image attachment"}
                  loading="lazy"
                  className="w-full max-h-64 object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="p-1.5 rounded-full bg-black/50 text-white shadow-md">
                    <ZoomIn className="h-4 w-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Audio Voice Notes */}
        {audios.map((audio, idx) => (
          <AudioAttachmentPlayer
            key={audio.publicId || audio.url || idx}
            attachment={audio}
            mine={mine}
          />
        ))}

        {/* Documents & PDFs */}
        {documents.map((doc, idx) => (
          <DocumentAttachmentCard
            key={doc.publicId || doc.url || idx}
            attachment={doc}
            mine={mine}
          />
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedLightboxImage && (
        <ImageLightboxModal
          image={selectedLightboxImage}
          onClose={() => setSelectedLightboxImage(null)}
        />
      )}
    </>
  );
});

MessageAttachments.displayName = "MessageAttachments";
