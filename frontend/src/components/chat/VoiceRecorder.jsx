import { useState, useRef, useEffect, memo } from "react";
import { Mic, Square, Trash2, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "../../lib/api";

/**
 * Format recording seconds into M:SS
 */
const formatSeconds = (sec) => {
  const mins = Math.floor(sec / 60);
  const secs = sec % 60;
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

export const VoiceRecorder = memo(({ onSendVoice, disabled = false }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    if (disabled || isUploading) return;

    if (!navigator?.mediaDevices?.getUserMedia) {
      toast.error("Audio recording is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Determine supported mimeType
      let mimeType = "audio/webm";
      if (!MediaRecorder.isTypeSupported("audio/webm")) {
        if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
          mimeType = "audio/ogg;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        }
      }

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(200); // 200ms slice
      setIsRecording(true);
      setRecordingTime(0);
      startTimeRef.current = Date.now();

      timerRef.current = setInterval(() => {
        setRecordingTime((t) => {
          // Auto stop at 5 minutes
          if (t >= 300) {
            stopAndSend();
            return t;
          }
          return t + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Mic access error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        toast.error("Microphone access denied. Please allow microphone permissions in your browser.");
      } else {
        toast.error("Could not start audio recording. Check your microphone.");
      }
    }
  };

  const cancelRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingTime(0);
  };

  const stopAndSend = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") return;

    if (timerRef.current) clearInterval(timerRef.current);

    const recorder = mediaRecorderRef.current;
    const finalDuration = recordingTime > 0 ? recordingTime : Math.max(1, Math.round((Date.now() - (startTimeRef.current || Date.now())) / 1000));

    recorder.onstop = async () => {
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        const mime = recorder.mimeType || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: mime });

        if (audioBlob.size === 0) {
          toast.error("Recording was empty.");
          setIsRecording(false);
          return;
        }

        setIsUploading(true);
        const formData = new FormData();
        const extension = mime.includes("ogg") ? "ogg" : mime.includes("mp4") ? "mp4" : "webm";
        formData.append("audio", audioBlob, `voice_note_${Date.now()}.${extension}`);
        formData.append("duration", String(finalDuration));

        const data = await api.post("/api/messages/upload-voice", formData);
        if (!data || data.error) {
          throw new Error(data?.error || "Voice upload failed");
        }

        if (data.attachment && onSendVoice) {
          await onSendVoice(data.attachment);
        }
      } catch (err) {
        console.error("Voice upload error:", err);
        const msg = err.message?.includes("<!DOCTYPE")
          ? "Voice upload route not found (404). Please restart the backend server (npm run server)."
          : (err.message || "Failed to upload voice note");
        toast.error(msg);
      } finally {
        setIsUploading(false);
        setIsRecording(false);
        setRecordingTime(0);
        audioChunksRef.current = [];
      }
    };

    recorder.stop();
  };

  if (isRecording) {
    return (
      <div className="flex items-center gap-2 bg-red-500/10 dark:bg-red-500/20 border border-red-500/30 px-3 py-1.5 rounded-xl animate-in fade-in duration-150">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs font-mono font-semibold text-red-500">
            {formatSeconds(recordingTime)}
          </span>
        </div>

        <div className="flex items-center gap-1.5 ml-2">
          <button
            type="button"
            onClick={cancelRecording}
            disabled={isUploading}
            className="grid h-7 w-7 place-items-center rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-500 transition-colors"
            title="Cancel recording"
          >
            <Trash2 className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={stopAndSend}
            disabled={isUploading}
            className="grid h-7 w-7 place-items-center rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors shadow-xs"
            title="Send voice note"
          >
            {isUploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={startRecording}
      disabled={disabled || isUploading}
      className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors shrink-0 disabled:opacity-50"
      title="Record voice note"
    >
      {isUploading ? (
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </button>
  );
});

VoiceRecorder.displayName = "VoiceRecorder";
