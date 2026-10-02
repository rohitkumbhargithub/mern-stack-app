import React, { useState } from 'react';
import { Sparkles, Users } from 'lucide-react';

const GRADIENTS = [
  'from-blue-600 to-indigo-600',
  'from-purple-600 to-pink-600',
  'from-emerald-600 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-red-600',
  'from-cyan-600 to-blue-600',
  'from-violet-600 to-purple-600',
  'from-teal-500 to-emerald-700',
];

/**
 * Generate 1 or 2 letter uppercase initials from a user's name or email
 * e.g. "Test User" -> "TU", "Rohit Kumbhar" -> "RK", "Alice" -> "AL", "user@test.com" -> "U"
 */
export const getInitials = (name = "") => {
  if (!name || typeof name !== 'string') return "?";
  const clean = name.trim();
  if (!clean) return "?";

  // If it's an email, extract before @
  const text = clean.includes('@') ? clean.split('@')[0] : clean;
  const parts = text.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  // Single word: take first 2 chars or 1 char
  return text.slice(0, Math.min(text.length, 2)).toUpperCase();
};

/**
 * Deterministically pick an aesthetic gradient based on the name string
 */
export const getGradientForName = (name = "") => {
  let hash = 0;
  const str = String(name || "User");
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % GRADIENTS.length;
  return GRADIENTS[index];
};

/**
 * Enterprise Resilient UserAvatar Component
 * - If image fails to load or is un-updated, automatically falls back to vibrant initials
 * - Eliminates broken image icons across the entire application
 * - Full support for AI Companion, Group Chats, and Online Status Indicators
 */
export function UserAvatar({
  src,
  name = "User",
  size = "md", // xs (24px), sm (28px), md (36px), lg (44px), xl (64px), 2xl (96px)
  className = "",
  isAI = false,
  isGroup = false,
  groupAvatar = "",
  online = false,
  showOnlineDot = false,
}) {
  const [imgError, setImgError] = useState(false);

  const sizeMap = {
    xs: "h-6 w-6 text-[10px]",
    sm: "h-7 w-7 text-xs",
    md: "h-9 w-9 text-sm",
    lg: "h-11 w-11 text-base",
    xl: "h-16 w-16 text-xl font-bold",
    "2xl": "h-24 w-24 text-3xl font-extrabold",
  };
  const sizeClasses = sizeMap[size] || "h-9 w-9 text-sm";
  const initials = getInitials(name);
  const gradient = getGradientForName(name);

  // 1. AI Assistant Persona
  if (isAI) {
    return (
      <div className="relative shrink-0 inline-block">
        <div
          className={`${sizeClasses} rounded-full bg-gradient-to-tr from-primary via-purple-500 to-indigo-500 text-white grid place-items-center shadow-xs font-bold border border-primary/30 ${className}`}
          title="SendChat AI"
        >
          <Sparkles className="h-1/2 w-1/2 animate-pulse" />
        </div>
        {showOnlineDot && (
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-primary grid place-items-center">
            <span className="h-1 w-1 rounded-full bg-white"></span>
          </span>
        )}
      </div>
    );
  }

  // 2. Group Chat Persona
  if (isGroup) {
    const isUrl = groupAvatar && (groupAvatar.startsWith("http") || groupAvatar.startsWith("/"));
    return (
      <div className="relative shrink-0 inline-block">
        {isUrl && !imgError ? (
          <img
            src={groupAvatar}
            alt={name}
            onError={() => setImgError(true)}
            className={`${sizeClasses} rounded-full object-cover border border-border/50 shadow-2xs ${className}`}
          />
        ) : groupAvatar && !isUrl ? (
          <div
            className={`${sizeClasses} rounded-full bg-gradient-to-tr from-primary to-indigo-600 text-white grid place-items-center shadow-xs font-bold leading-none border border-white/20 select-none ${className}`}
          >
            {groupAvatar}
          </div>
        ) : (
          <div
            className={`${sizeClasses} rounded-full bg-primary/10 text-primary grid place-items-center font-bold border border-primary/20 ${className}`}
          >
            <Users className="h-1/2 w-1/2" />
          </div>
        )}
      </div>
    );
  }

  // 3. Direct User Avatar
  // Check if image URL is valid, isn't the broken external service, and hasn't failed to load
  const isBrokenService = typeof src === 'string' && src.includes('avatar.iran.liara.run');
  const hasValidSrc = src && typeof src === 'string' && src.trim().length > 0 && !imgError && !isBrokenService;

  return (
    <div className="relative shrink-0 inline-block">
      {hasValidSrc ? (
        <img
          src={src}
          alt={name}
          onError={() => setImgError(true)}
          className={`${sizeClasses} rounded-full object-cover border border-border/50 shadow-2xs ${className}`}
        />
      ) : (
        <div
          className={`${sizeClasses} rounded-full bg-gradient-to-tr ${gradient} text-white font-bold flex items-center justify-center shadow-2xs tracking-wider select-none border border-white/10 ${className}`}
          title={name}
        >
          {initials}
        </div>
      )}

      {showOnlineDot && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card ${
            online ? "bg-emerald-500" : "bg-zinc-400"
          }`}
        />
      )}
    </div>
  );
}

export default UserAvatar;
