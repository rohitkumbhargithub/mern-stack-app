const Converastion = require("../models/converastions");
const Message = require("../models/messages");
const { getReceiverSocketId, io } = require("../socket/socket");


exports.sendMessage = async (req, res) => {
    try {
        const { message, replyTo, editId } = req.body;
        const { id: targetId } = req.params;
        const senderId = req.user._id;

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
        if (conversation.isGroupChat) {
            io.to(conversation._id.toString()).emit("newMessage", newMessage);
        } else {
            conversation.participated.forEach(pId => {
                const socketId = getReceiverSocketId(pId);
                if (socketId) {
                    io.to(socketId).emit("newMessage", newMessage);
                }
            });
        }

        res.status(200).json(newMessage);

    } catch (err) {
        console.log('send Message ', err);
        res.status(500).json({ err: "Internal server error" });
    }
}



exports.getMessage = async (req, res, next) => {
    try {
        const { id: targetId } = req.params;
        const senderId = req.user._id;

        console.log(targetId, "from resrsre")

        // Try finding by conversation ID first (works for groups and existing 1-on-1s)
        let conversation = await Converastion.findById(targetId).populate({
            path: "messages",
            populate: { path: "replyTo" }
        });

        if (!conversation) {
            // Fallback: Try finding 1-on-1 by other user's ID
            conversation = await Converastion.findOne({
                participated: { $all: [senderId, targetId] },
                isGroupChat: false
            }).populate({
                path: "messages",
                populate: { path: "replyTo" }
            });
        }

        if (!conversation) return res.status(200).json([]);

        res.status(200).json(conversation.messages);

    } catch (err) {
        console.log("get message ", err)
        res.status(500).json({ err: "Internal server error" });
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
                    const socketId = getReceiverSocketId(pId);
                    if (socketId) {
                        io.to(socketId).emit("messageDeleted", { messageId, conversationId: conversation._id });
                    }
                });
            }
        }

        res.status(200).json({ message: "Message deleted successfully", messageId });
    } catch (err) {
        console.log("delete message ", err);
        res.status(500).json({ error: "Internal server error" });
    }
};