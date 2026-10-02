const aiService = require("../services/aiService");
const { decrypt } = require("../utils/crypto");

/**
 * Resolves API key with priority:
 * 1. Request header 'x-gemini-api-key' (client override)
 * 2. User database encrypted setting (decrypted safely in server memory)
 * 3. Server process.env.GEMINI_API_KEY
 */
function resolveUserApiKey(req) {
    const headerKey = req.headers["x-gemini-api-key"];
    if (headerKey && headerKey.trim()) return headerKey.trim();

    if (req.user?.aiSettings?.geminiApiKey) {
        const decrypted = decrypt(req.user.aiSettings.geminiApiKey);
        if (decrypted) return decrypted;
    }

    return null;
}

exports.chatWithAI = async (req, res) => {
    try {
        const { message, conversationHistory = [] } = req.body;
        const userApiKey = resolveUserApiKey(req);

        if (!message || !message.trim()) {
            return res.status(400).json({ error: "Message content is required" });
        }

        const reply = await aiService.generateAIChatReply(conversationHistory, message, userApiKey);
        res.status(200).json({ reply });
    } catch (err) {
        console.error("[AI Controller] chatWithAI error:", err);
        res.status(500).json({ error: "Failed to generate AI reply" });
    }
};

exports.getSmartReplies = async (req, res) => {
    try {
        const { messages = [] } = req.body;
        const userApiKey = resolveUserApiKey(req);

        const suggestions = await aiService.generateSmartReplies(messages, userApiKey);
        res.status(200).json({ suggestions });
    } catch (err) {
        console.error("[AI Controller] getSmartReplies error:", err);
        res.status(500).json({ error: "Failed to generate smart replies" });
    }
};

exports.rewriteDraft = async (req, res) => {
    try {
        const { text, mode = "grammar", targetLanguage = "English" } = req.body;
        const userApiKey = resolveUserApiKey(req);

        if (!text || !text.trim()) {
            return res.status(400).json({ error: "Text to rewrite is required" });
        }

        const rewritten = await aiService.rewriteDraftText(text, mode, targetLanguage, userApiKey);
        res.status(200).json({ rewritten });
    } catch (err) {
        console.error("[AI Controller] rewriteDraft error:", err);
        res.status(500).json({ error: "Failed to rewrite message" });
    }
};

exports.summarizeThread = async (req, res) => {
    try {
        const { messages = [] } = req.body;
        const userApiKey = resolveUserApiKey(req);

        const summary = await aiService.summarizeConversationThread(messages, userApiKey);
        res.status(200).json({ summary });
    } catch (err) {
        console.error("[AI Controller] summarizeThread error:", err);
        res.status(500).json({ error: "Failed to summarize conversation" });
    }
};

exports.translateMessage = async (req, res) => {
    try {
        const { text, targetLanguage = "English" } = req.body;
        const userApiKey = resolveUserApiKey(req);

        if (!text || !text.trim()) {
            return res.status(400).json({ error: "Text to translate is required" });
        }

        const translation = await aiService.translateMessageText(text, targetLanguage, userApiKey);
        res.status(200).json({ translation });
    } catch (err) {
        console.error("[AI Controller] translateMessage error:", err);
        res.status(500).json({ error: "Failed to translate message" });
    }
};
