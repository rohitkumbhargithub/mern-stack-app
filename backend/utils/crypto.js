const crypto = require('crypto');

// Master key derived using scrypt for AES-256-GCM
const MASTER_SECRET = process.env.ENCRYPTION_SECRET || process.env.JWT_SECRET || 'sendchat_master_key_default_fallback_2026';
const SALT = 'sendchat_salt_encryption_v1';
const KEY = crypto.scryptSync(MASTER_SECRET, SALT, 32);

/**
 * Encrypt sensitive plain text using AES-256-GCM
 * Output format: iv:authTag:encryptedData (hex encoded)
 */
function encrypt(text) {
    if (!text || typeof text !== 'string' || !text.trim()) return '';
    try {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
        let encrypted = cipher.update(text.trim(), 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');
        return `${iv.toString('hex')}:${authTag}:${encrypted}`;
    } catch (err) {
        console.error('[Crypto] Encryption error:', err.message);
        return text;
    }
}

/**
 * Decrypt AES-256-GCM cipher string back to plain text
 */
function decrypt(ciphertext) {
    if (!ciphertext || typeof ciphertext !== 'string') return '';
    try {
        const parts = ciphertext.split(':');
        // If not in iv:authTag:encrypted format, return as-is (backward compatible)
        if (parts.length !== 3) return ciphertext;

        const [ivHex, authTagHex, encryptedData] = parts;
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');

        const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (err) {
        console.error('[Crypto] Decryption error:', err.message);
        return '';
    }
}

/**
 * Returns safe masked preview of an API key for UI display (e.g. "AIzaSy••••••••4F1a")
 */
function maskApiKey(key) {
    if (!key || typeof key !== 'string') return '';
    const cleanKey = key.includes(':') ? decrypt(key) : key;
    if (!cleanKey || cleanKey.length < 8) return '••••••••';
    const start = cleanKey.slice(0, 6);
    const end = cleanKey.slice(-4);
    return `${start}••••••••${end}`;
}

module.exports = {
    encrypt,
    decrypt,
    maskApiKey
};
