const User = require("../models/users");
const Message = require("../models/messages");
const Converastion = require("../models/converastions");
const aiService = require("../services/aiService");
const { io } = require("../socket/socket");

let cachedAIBotUser = null;

const AI_BOT_EMAIL = "ai@sendchat.com";
const AI_BOT_AVATAR = "https://api.dicebear.com/7.x/bottts/svg?seed=SendChatAI&backgroundColor=b6e3f4";

/**
 * Ensures the system AI Bot User exists in the database.
 */
async function getOrCreateAIBotUser() {
    if (cachedAIBotUser) return cachedAIBotUser;

    try {
        let aiUser = await User.findOne({ email: AI_BOT_EMAIL });
        if (!aiUser) {
            aiUser = await User.create({
                name: "SendChat AI ✨",
                email: AI_BOT_EMAIL,
                password: "system_internal_ai_bot_protected",
                gender: "male",
                profile: AI_BOT_AVATAR
            });
            console.log("[AI Bot] Initialized system AI user:", aiUser._id);
        }
        cachedAIBotUser = aiUser;
        return aiUser;
    } catch (err) {
        console.error("[AI Bot] Error ensuring AI user:", err);
        return null;
    }
}

/**
 * Checks if a given ID belongs to the AI Bot
 */
async function isAIBotId(id) {
    if (!id) return false;
    const bot = await getOrCreateAIBotUser();
    return bot && bot._id.toString() === id.toString();
}

/**
 * Process AI response asynchronously for direct chat with AI or @ai mentions
 */
async function handleAIBotResponse({ conversation, senderUser, userMessage, userApiKey = null }) {
    try {
        const bot = await getOrCreateAIBotUser();
        if (!bot) return;

        const roomId = conversation._id.toString();

        // 1. Emit typing indicator to conversation room
        io.to(roomId).emit("typing", { roomId, userId: bot._id.toString() });

        // 2. Fetch conversation history for context
        const populatedConv = await Converastion.findById(conversation._id).populate({
            path: "messages",
            options: { sort: { createdAt: -1 }, limit: 10 }
        });

        const history = (populatedConv?.messages || []).reverse().map(m => ({
            isAI: m.senderId.toString() === bot._id.toString(),
            message: m.message
        }));

        // 3. Clean @ai prefix if present
        const cleanedPrompt = userMessage.replace(/^@ai\s*/i, "").trim();

        // 4. Generate AI response
        const aiReplyText = await aiService.generateAIChatReply(history, cleanedPrompt, userApiKey);

        // 5. Create and save AI message
        const aiMessage = new Message({
            senderId: bot._id,
            conversationId: conversation._id,
            message: aiReplyText
        });

        conversation.messages.push(aiMessage._id);
        await Promise.all([conversation.save(), aiMessage.save()]);

        // 6. Stop typing and emit new message
        io.to(roomId).emit("stopTyping", { roomId, userId: bot._id.toString() });
        io.to(roomId).emit("newMessage", aiMessage);

    } catch (err) {
        console.error("[AI Bot] Failed to generate/send AI response:", err);
        if (conversation?._id) {
            io.to(conversation._id.toString()).emit("stopTyping", {
                roomId: conversation._id.toString(),
                userId: "ai_bot"
            });
        }
    }
}

module.exports = {
    getOrCreateAIBotUser,
    isAIBotId,
    handleAIBotResponse,
    AI_BOT_EMAIL,
    AI_BOT_AVATAR
};
