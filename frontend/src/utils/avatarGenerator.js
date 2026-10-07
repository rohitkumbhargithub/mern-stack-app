import { getInitials } from '../components/common/UserAvatar';

const GRADIENT_PALETTES = [
  ['#2563eb', '#4f46e5'], // blue-600 to indigo-600
  ['#9333ea', '#db2777'], // purple-600 to pink-600
  ['#059669', '#0d9488'], // emerald-600 to teal-600
  ['#d97706', '#ea580c'], // amber-500 to orange-600
  ['#e11d48', '#dc2626'], // rose-500 to red-600
  ['#0891b2', '#2563eb'], // cyan-600 to blue-600
  ['#7c3aed', '#9333ea'], // violet-600 to purple-600
  ['#14b8a6', '#047857'], // teal-500 to emerald-700
];

const getColorPairForName = (name = "") => {
  let hash = 0;
  const str = String(name || "User");
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % GRADIENT_PALETTES.length;
  return GRADIENT_PALETTES[index];
};

/**
 * Creates a PNG Data URL of a circular avatar with initials or text,
 * exactly matching the sidebar UserAvatar component.
 *
 * @param {string} name - Name of the user or chat
 * @param {object} options - { isAI, isGroup, groupAvatar }
 * @returns {string} data:image/png;base64,...
 */
export const generateAvatarDataUrl = (name = "User", options = {}) => {
  if (typeof document === 'undefined') return '/icons/icon-192.png';

  try {
    const size = 192;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '/icons/icon-192.png';

    const radius = size / 2;
    const [color1, color2] = getColorPairForName(name);

    // 1. Draw circular clipping path
    ctx.beginPath();
    ctx.arc(radius, radius, radius - 4, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // 2. Fill gradient background
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    if (options.isAI) {
      gradient.addColorStop(0, '#2563eb');
      gradient.addColorStop(0.5, '#9333ea');
      gradient.addColorStop(1, '#4f46e5');
    } else {
      gradient.addColorStop(0, color1);
      gradient.addColorStop(1, color2);
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    // 3. Draw text content
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (options.isAI) {
      // Draw sparkle / star
      ctx.font = 'bold 84px system-ui, sans-serif';
      ctx.fillText('✨', radius, radius);
    } else if (options.isGroup && options.groupAvatar && typeof options.groupAvatar === 'string' && !options.groupAvatar.startsWith('http') && !options.groupAvatar.startsWith('/')) {
      // Group text or emoji avatar (e.g. emoji or short tag)
      const text = options.groupAvatar.trim();
      const fontSize = text.length > 2 ? 46 : (text.length === 2 ? 68 : 80);
      ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
      ctx.fillText(text, radius, radius);
    } else {
      // Regular user initials (e.g. "TU" or "RK")
      const initials = getInitials(name);
      ctx.font = 'bold 76px system-ui, -apple-system, sans-serif';
      ctx.fillText(initials, radius, radius);
    }

    return canvas.toDataURL('image/png');
  } catch (err) {
    console.warn('[AvatarGenerator] Failed to generate avatar data URL:', err);
    return '/icons/icon-192.png';
  }
};
