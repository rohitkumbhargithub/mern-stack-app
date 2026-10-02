const Converastion = require("../models/converastions");
const Message = require("../models/messages");
const { getReceiverSocketIds, io } = require("../socket/socket");
const { isAIBotId, handleAIBotResponse, getOrCreateAIBotUser } = require("../utils/aiBot");
const { decrypt } = require("../utils/crypto");


exports.sendMessage = async (req, res) => {
    try {
        const { message, replyTo, editId } = req.body;
        const { id: targetId } = req.params;
        const senderId = req.user._id;
        const userApiKey = req.headers["x-gemini-api-key"] || (req.user?.aiSettings?.geminiApiKey ? decrypt(req.user.aiSettings.geminiApiKey) : null);

        // If editing an existing message
        if (editId) {
            const existingMessage = await Message.findById(editId);
            if (!existingMessage) return res.status(404).json({ error: "Message not found" });
            if (existingMessage.senderId.toString() !== senderId.toString()) {
                return res.status(401).json({ error: "Unauthorized" });
            }
            existingMessage.message = message;
            existingMessage.isEdited = true;
            await existingMessage.save();

            // Notify via socket
            const conversation = await Converastion.findById(existingMessage.conversationId);
            if (conversation) {
                io.to(conversation._id.toString()).emit("messageUpdated", existingMessage);
            }
            return res.status(200).json(existingMessage);
        }

        // Normal send logic
        let conversation = await Converastion.findById(targetId);

        if (!conversation) {
            conversation = await Converastion.findOne({
                participated: { $all: [senderId, targetId] },
                isGroupChat: false
            });
        }

        if (!conversation) {
            conversation = await Converastion.create({
                participated: [senderId, targetId],
            });
        }

        const newMessage = new Message({
            senderId,
            conversationId: conversation._id,
            message,
            replyTo: replyTo || undefined
        });

        if (newMessage) {
            conversation.messages.push(newMessage._id);
        }

        await Promise.all([conversation.save(), newMessage.save()]);

        // Populate replyTo for the socket emission
        if (replyTo) {
            await newMessage.populate("replyTo");
        }

        // Socket functionality
        const convRoom = conversation._id.toString();
        io.to(convRoom).emit("newMessage", newMessage);

        // Also emit directly to individual sockets for background notification
        conversation.participated.forEach(pId => {
            const socketIds = getReceiverSocketIds(pId);
            socketIds.forEach(socketId => {
                io.to(socketId).emit("newMessage", newMessage);
            });
        });

        // Check if message is directed to AI Bot or contains @ai
        const aiBot = await getOrCreateAIBotUser();
        const isDirectWithAI = aiBot && conversation.participated.some(p => p.toString() === aiBot._id.toString());
        const isAIMention = message.trim().toLowerCase().startsWith("@ai");

        if (isDirectWithAI || isAIMention) {
            // Asynchronously generate AI response so HTTP response isn't blocked
            setTimeout(() => {
                handleAIBotResponse({
                    conversation,
                    senderUser: req.user,
                    userMessage: message,
                    userApiKey
                });
            }, 500);
        }

        res.status(200).json(newMessage);

    } catch (err) {
        console.log('send Message ', err);
        res.status(500).json({ error: "Internal server error" });
    }
}



exports.getMessage = async (req, res, next) => {
    try {
        const { id: targetId } = req.params;
        const senderId = req.user._id;

        // Try finding conversation by ID or by participants
        let convId = targetId;
        const conversation = await Converastion.findById(targetId).select("_id").lean();

        if (!conversation) {
            const fallbackConv = await Converastion.findOne({
                participated: { $all: [senderId, targetId] },
                isGroupChat: false
            }).select("_id").lean();

            if (!fallbackConv) return res.status(200).json([]);
            convId = fallbackConv._id;
        }

        // Optimized query: utilizes compound index { conversationId: 1, createdAt: 1 } with .lean()
        const messages = await Message.find({ conversationId: convId })
            .sort({ createdAt: 1 })
            .populate({
                path: "replyTo",
                select: "message senderId createdAt"
            })
            .lean();

        res.status(200).json(messages);

    } catch (err) {
        console.log("get message ", err);
        res.status(500).json({ error: "Internal server error" });
    }
}

exports.deleteMessage = async (req, res) => {
    try {
        const { id: messageId } = req.params;
        const userId = req.user._id;

        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({ error: "Message not found" });
        }

        if (message.senderId.toString() !== userId.toString()) {
            return res.status(401).json({ error: "Unauthorized to delete this message" });
        }

        message.isDeleted = true;
        await message.save();

        // Socket notification
        const conversation = await Converastion.findById(message.conversationId);
        if (conversation) {
            if (conversation.isGroupChat) {
                io.to(conversation._id.toString()).emit("messageDeleted", { messageId, conversationId: conversation._id });
            } else {
                conversation.participated.forEach(pId => {
                    const socketIds = getReceiverSocketIds(pId);
                    socketIds.forEach(socketId => {
                        io.to(socketId).emit("messageDeleted", { messageId, conversationId: conversation._id });
                    });
                });
            }
        }

        res.status(200).json({ message: "Message deleted successfully", messageId });
    } catch (err) {
        console.log("delete message ", err);
        res.status(500).json({ error: "Internal server error" });
    }
};