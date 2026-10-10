import classicSoundUrl from '../assets/sounds/notification.mp3';

let audioContextInstance = null;

const getAudioContext = () => {
  if (typeof window === "undefined") return null;
  if (!audioContextInstance) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      audioContextInstance = new AudioCtx();
    }
  }
  if (audioContextInstance && audioContextInstance.state === "suspended") {
    audioContextInstance.resume().catch(() => {});
  }
  return audioContextInstance;
};

// Global audio unlocker: automatically wakes AudioContext on first user interaction so incoming message chimes play reliably
if (typeof window !== "undefined") {
  const unlockAudio = () => {
    try {
      const ctx = getAudioContext();
      if (ctx && ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
    } catch (_) {}
  };

  ["click", "keydown", "touchstart"].forEach((evt) => {
    window.addEventListener(evt, unlockAudio, { passive: true });
  });
}

// 1. Synthetic Sound 1: Bubble Pop
const playBubblePop = (ctx) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const now = ctx.currentTime;

  osc.type = "sine";
  osc.frequency.setValueAtTime(350, now);
  osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.38, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.12);
};

// 2. Synthetic Sound 2: Crystal Ding
const playCrystalDing = (ctx) => {
  const now = ctx.currentTime;
  
  // Fundamental tone
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(1046.5, now); // C6
  gain1.gain.setValueAtTime(0.001, now);
  gain1.gain.linearRampToValueAtTime(0.35, now + 0.01);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

  // Shimmer harmonic
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = "triangle";
  osc2.frequency.setValueAtTime(2093, now); // C7
  gain2.gain.setValueAtTime(0.001, now);
  gain2.gain.linearRampToValueAtTime(0.12, now + 0.01);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 0.5);
  osc2.stop(now + 0.5);
};

// 3. Synthetic Sound 3: Modern Swoosh Chime
const playModernChime = (ctx) => {
  const now = ctx.currentTime;

  const notes = [659.25, 830.61]; // E5, G#5
  notes.forEach((freq, idx) => {
    const startTime = now + idx * 0.09;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(0.3, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + 0.38);
  });
};

// 4. Synthetic Sound 4: Marimba Melody
const playMarimbaMelody = (ctx) => {
  const now = ctx.currentTime;

  const triad = [523.25, 659.25, 783.99]; // C5, E5, G5
  triad.forEach((freq, idx) => {
    const startTime = now + idx * 0.08;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(0.35, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + 0.3);
  });
};

export const BUILTIN_SOUNDS = [
  { id: "chime", name: "Chime (Default Bell)", description: "Classic crisp chat chime" },
  { id: "bubble", name: "Bubble Pop", description: "Soft playful water bubble pop" },
  { id: "ding", name: "Crystal Ding", description: "High metallic crystal ping" },
  { id: "swoosh", name: "Modern Chime", description: "Smooth two-tone harmonic chime" },
  { id: "marimba", name: "Marimba Melody", description: "Warm 3-note upbeat melody" },
];

export const isSoundEnabled = () => {
  if (typeof window === "undefined") return true;
  return localStorage.getItem("sendchat_sound_enabled") !== "false";
};

export const setSoundEnabled = (enabled) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("sendchat_sound_enabled", enabled ? "true" : "false");
};

export const getSelectedSound = () => {
  if (typeof window === "undefined") return "chime";
  return localStorage.getItem("sendchat_selected_sound") || "chime";
};

export const setSelectedSound = (soundId) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("sendchat_selected_sound", soundId);
};

export const getCustomSound = () => {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem("sendchat_custom_sound");
  const name = localStorage.getItem("sendchat_custom_sound_name") || "Custom Audio";
  if (!data) return null;
  return { data, name };
};

export const setCustomSound = (dataUrl, fileName) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("sendchat_custom_sound", dataUrl);
    localStorage.setItem("sendchat_custom_sound_name", fileName);
    localStorage.setItem("sendchat_selected_sound", "custom");
  } catch (err) {
    console.error("Failed to store custom sound:", err);
  }
};

export const removeCustomSound = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem("sendchat_custom_sound");
  localStorage.removeItem("sendchat_custom_sound_name");
  if (getSelectedSound() === "custom") {
    setSelectedSound("chime");
  }
};

export const isNotificationsEnabled = () => {
  if (typeof window === "undefined") return true;
  return localStorage.getItem("sendchat_notifications_disabled") !== "true";
};

export const setNotificationsEnabled = (enabled) => {
  if (typeof window === "undefined") return;
  if (enabled) {
    localStorage.removeItem("sendchat_notifications_disabled");
  } else {
    localStorage.setItem("sendchat_notifications_disabled", "true");
  }
};

/**
 * Play a notification sound
 * @param {string} [soundId] Specific sound to play (for previews); defaults to user selected sound
 * @param {boolean} [forcePlay=false] If true, bypasses the isSoundEnabled mute check (useful for preview buttons)
 */
export const playNotificationSound = async (soundId = null, forcePlay = false) => {
  if (typeof window === "undefined") return;
  if (!forcePlay && !isSoundEnabled()) return;

  const targetSound = soundId || getSelectedSound();

  // 1. Custom uploaded sound
  if (targetSound === "custom") {
    const custom = getCustomSound();
    if (custom && custom.data) {
      try {
        const audio = new Audio(custom.data);
        audio.volume = 0.85;
        await audio.play();
        return;
      } catch (_) {}
    }
  }

  // 2. Chime (classic sound file)
  if (targetSound === "chime") {
    try {
      const audio = new Audio(classicSoundUrl);
      audio.volume = 0.8;
      await audio.play();
      return;
    } catch (_) {
      // Fallback to crystal ding synthetic if audio file blocked
    }
  }

  // 3. Synthetic Tone (Web Audio API)
  const ctx = getAudioContext();
  if (ctx) {
    try {
      if (ctx.state === "suspended") {
        await ctx.resume();
      }
    } catch (_) {}

    switch (targetSound) {
      case "bubble":
        playBubblePop(ctx);
        break;

      case "ding":
        playCrystalDing(ctx);
        break;

      case "swoosh":
        playModernChime(ctx);
        break;

      case "marimba":
        playMarimbaMelody(ctx);
        break;

      case "chime":
      default:
        playCrystalDing(ctx);
        break;
    }
  }
};
