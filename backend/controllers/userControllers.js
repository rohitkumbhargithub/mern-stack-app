const User = require("../models/users");
const Converastion = require("../models/converastions");
const { getOrCreateAIBotUser } = require("../utils/aiBot");
const { encrypt, decrypt, maskApiKey } = require("../utils/crypto");

exports.getUsersSildeBar = async (req, res, next) => {
    try {
        const loggedInUserId = req.user._id;
        const aiBot = await getOrCreateAIBotUser();

        // Ensure a 1-on-1 conversation with AI Bot exists so user can chat instantly
        let aiConversation = null;
        if (aiBot && aiBot._id.toString() !== loggedInUserId.toString()) {
            aiConversation = await Converastion.findOne({
                participated: { $all: [loggedInUserId, aiBot._id] },
                isGroupChat: false
            }).populate({
                path: "messages",
                options: { sort: { createdAt: -1 }, limit: 1 }
            });

            if (!aiConversation) {
                aiConversation = await Converastion.create({
                    participated: [loggedInUserId, aiBot._id],
                    isGroupChat: false,
                    messages: []
                });
            }
        }

        // Find all other conversations (including groups and direct DMs)
        const conversations = await Converastion.find({
            participated: { $in: [loggedInUserId] },
            ...(aiConversation ? { _id: { $ne: aiConversation._id } } : {}),
            $or: [
                { messages: { $not: { $size: 0 } } },
                { isGroupChat: true }
            ]
        })
        .populate("participated", "-password -aiSettings")
        .populate({
            path: "messages",
            options: { sort: { createdAt: -1 }, limit: 1 }
        })
        .sort({ updatedAt: -1 });

        const sidebarData = conversations.map(conv => {
            const lastMsg = conv.messages[0];

            if (conv.isGroupChat) {
                return {
                    _id: conv._id,
                    name: conv.chatName || "Group Chat",
                    profile: conv.groupAvatar || "",
                    groupAvatar: conv.groupAvatar || "",
                    isGroupChat: true,
                    type: "group",
                    participated: conv.participated,
                    membersCount: conv.participated ? conv.participated.length : 0,
                    lastMessage: lastMsg?.message || lastMsg?.body || "Group created",
                    lastMessageTime: lastMsg?.createdAt || conv.createdAt
                };
            }

            const otherUser = conv.participated.find(u => u && u._id.toString() !== loggedInUserId.toString());
            if (!otherUser) return null;
            return {
                ...otherUser.toObject(),
                _id: conv._id,
                userId: otherUser._id,
                isGroupChat: false,
                type: "user",
                lastMessage: lastMsg?.message || lastMsg?.body || "",
                lastMessageTime: lastMsg?.createdAt || ""
            };
        }).filter(item => item !== null);

        // Prepend AI Bot as the first conversation
        if (aiConversation && aiBot) {
            const aiLastMsg = aiConversation.messages?.[0];
            const aiItem = {
                _id: aiConversation._id,
                userId: aiBot._id,
                name: "SendChat AI ✨",
                username: "ai_assistant",
                email: aiBot.email,
                profile: aiBot.profile,
                isAI: true,
                isGroupChat: false,
                type: "ai",
                lastMessage: aiLastMsg?.message || "Hi! I'm your AI assistant. Ask me anything!",
                lastMessageTime: aiLastMsg?.createdAt || new Date().toISOString()
            };
            sidebarData.unshift(aiItem);
        }

        res.status(200).json(sidebarData);

    } catch (err) {
        console.log("get users ", err)
        res.status(500).json({ error: "Internal server error" });
    }
}

exports.updateProfile = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { name, profilePic, aiSettings } = req.body;

        const updateFields = {};
        if (name) updateFields.name = name;
        if (profilePic !== undefined) updateFields.profile = profilePic;

        if (aiSettings) {
            const existingUser = await User.findById(userId);
            const currentAISettings = existingUser?.aiSettings || {};

            const newAISettings = {
                preferredProvider: aiSettings.preferredProvider || currentAISettings.preferredProvider || 'gemini',
                preferredLanguage: aiSettings.preferredLanguage || currentAISettings.preferredLanguage || 'English'
            };

            // Encrypt Gemini API key if a new one is provided (ignore if unchanged or masked)
            if (aiSettings.geminiApiKey && !aiSettings.geminiApiKey.includes('••••')) {
                newAISettings.geminiApiKey = encrypt(aiSettings.geminiApiKey);
            } else {
                newAISettings.geminiApiKey = currentAISettings.geminiApiKey || '';
            }

            // Encrypt OpenAI / other AI key if provided
            if (aiSettings.openaiApiKey && !aiSettings.openaiApiKey.includes('••••')) {
                newAISettings.openaiApiKey = encrypt(aiSettings.openaiApiKey);
            } else {
                newAISettings.openaiApiKey = currentAISettings.openaiApiKey || '';
            }

            updateFields.aiSettings = newAISettings;
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updateFields },
            { new: true }
        ).select("-password");

        // Prepare safe response (mask raw secret keys before sending to frontend)
        const userObj = updatedUser.toObject();
        if (userObj.aiSettings) {
            userObj.aiSettings.geminiApiKeyMasked = maskApiKey(userObj.aiSettings.geminiApiKey);
            userObj.aiSettings.openaiApiKeyMasked = maskApiKey(userObj.aiSettings.openaiApiKey);
            userObj.aiSettings.hasGeminiKey = !!userObj.aiSettings.geminiApiKey;
            userObj.aiSettings.hasOpenaiKey = !!userObj.aiSettings.openaiApiKey;
            delete userObj.aiSettings.geminiApiKey;
            delete userObj.aiSettings.openaiApiKey;
        }

        res.status(200).json(userObj);
    } catch (err) {
        console.log("update profile ", err);
        res.status(500).json({ error: "Internal server error" });
    }
}

exports.searchUsers = async (req, res, next) => {
    try {
        const loggedInUserId = req.user._id;
        const { q } = req.query;
        const aiBot = await getOrCreateAIBotUser();

        const excludedIds = [loggedInUserId];
        if (aiBot) excludedIds.push(aiBot._id);

        const query = {
            _id: { $nin: excludedIds }
        };

        if (q && q.trim()) {
            const regex = new RegExp(q.trim(), 'i');
            query.$or = [
                { name: regex },
                { email: regex }
            ];
        }

        // Return up to 50 users sorted by newest members first
        const users = await User.find(query)
            .select('-password -aiSettings')
            .sort({ createdAt: -1 })
            .limit(50);

        res.status(200).json(users);

    } catch (err) {
        console.log("search users ", err);
        res.status(500).json({ error: "Internal server error" });
    }
};

exports.createGroupConversation = async (req, res) => {
    try {
        const loggedInUserId = req.user._id;
        const { name, members, groupAvatar } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: "Group name is required" });
        }

        if (!Array.isArray(members) || members.length === 0) {
            return res.status(400).json({ error: "Please pick at least one member" });
        }

        const memberIds = members
            .map(m => (typeof m === 'object' ? (m._id || m.id) : m))
            .filter(Boolean);

        const uniqueParticipants = Array.from(new Set([loggedInUserId.toString(), ...memberIds.map(String)]));

        const newGroup = await Converastion.create({
            participated: uniqueParticipants,
            isGroupChat: true,
            chatName: name.trim(),
            groupAvatar: groupAvatar || "",
            messages: []
        });

        const populatedGroup = await Converastion.findById(newGroup._id)
            .populate("participated", "-password -aiSettings");

        const groupPayload = {
            _id: populatedGroup._id,
            name: populatedGroup.chatName,
            profile: populatedGroup.groupAvatar || "",
            groupAvatar: populatedGroup.groupAvatar || "",
            isGroupChat: true,
            type: "group",
            participated: populatedGroup.participated,
            membersCount: populatedGroup.participated.length,
            lastMessage: "Group created",
            lastMessageTime: populatedGroup.createdAt
        };

        // Notify all online participants in real-time
        try {
            const { getReceiverSocketIds, io } = require("../socket/socket");
            uniqueParticipants.forEach(pId => {
                const socketIds = getReceiverSocketIds(pId);
                socketIds.forEach(sId => {
                    io.to(sId).emit("newConversation", groupPayload);
                });
            });
        } catch (socketErr) {
            console.error("Socket notification error on group creation:", socketErr.message);
        }

        res.status(201).json(groupPayload);
    } catch (err) {
        console.error("create group error:", err);
        res.status(500).json({ error: "Failed to create group conversation" });
    }
};

exports.deleteConversation = async (req, res) => {
    try {
        const { id: convId } = req.params;
        const loggedInUserId = req.user._id;

        const conversation = await Converastion.findById(convId);
        if (!conversation) {
            return res.status(404).json({ error: "Conversation not found" });
        }

        // Check if user is a participant
        const isParticipant = conversation.participated.some(
            p => p.toString() === loggedInUserId.toString()
        );
        if (!isParticipant) {
            return res.status(403).json({ error: "You are not a participant in this conversation" });
        }

        const Message = require("../models/messages");
        const { getReceiverSocketIds, io } = require("../socket/socket");
        const { getOrCreateAIBotUser } = require("../utils/aiBot");
        const aiBot = await getOrCreateAIBotUser();
        const isAI = aiBot && conversation.participated.some(p => p.toString() === aiBot._id.toString()) && !conversation.isGroupChat;

        if (isAI) {
            // For AI conversation, clear message history instead of deleting bot conversation shell
            await Message.deleteMany({ conversationId: conversation._id });
            conversation.messages = [];
            await conversation.save();

            const socketIds = getReceiverSocketIds(loggedInUserId);
            socketIds.forEach(sId => {
                io.to(sId).emit("conversationCleared", { conversationId: conversation._id });
            });

            return res.status(200).json({ 
                message: "AI conversation history cleared", 
                conversationId: conversation._id, 
                isAI: true 
            });
        }

        const participants = [...conversation.participated];

        // Delete all associated messages
        await Message.deleteMany({ conversationId: conversation._id });

        // Delete conversation document
        await Converastion.findByIdAndDelete(convId);

        // Notify all online participants in real-time via socket
        try {
            participants.forEach(pId => {
                const socketIds = getReceiverSocketIds(pId);
                socketIds.forEach(sId => {
                    io.to(sId).emit("conversationDeleted", { conversationId: convId });
                });
            });
        } catch (socketErr) {
            console.error("Socket emit error on conversation delete:", socketErr.message);
        }

        return res.status(200).json({ message: "Conversation deleted successfully", conversationId: convId });
    } catch (err) {
        console.error("deleteConversation error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
};

exports.exitGroup = async (req, res) => {
    try {
        const { id: groupId } = req.params;
        const loggedInUserId = req.user._id;

        const group = await Converastion.findById(groupId);
        if (!group) {
            return res.status(404).json({ error: "Group not found" });
        }

        if (!group.isGroupChat) {
            return res.status(400).json({ error: "This conversation is not a group chat" });
        }

        const isParticipant = group.participated.some(
            p => p.toString() === loggedInUserId.toString()
        );
        if (!isParticipant) {
            return res.status(400).json({ error: "You are not a member of this group" });
        }

        const Message = require("../models/messages");
        const { getReceiverSocketIds, io } = require("../socket/socket");

        // Remove user from participated list
        group.participated = group.participated.filter(
            p => p.toString() !== loggedInUserId.toString()
        );

        // If no members left in group, delete the group and its messages
        if (group.participated.length === 0) {
            await Message.deleteMany({ conversationId: group._id });
            await Converastion.findByIdAndDelete(groupId);

            const socketIds = getReceiverSocketIds(loggedInUserId);
            socketIds.forEach(sId => {
                io.to(sId).emit("conversationDeleted", { conversationId: groupId });
            });

            return res.status(200).json({ 
                message: "Exited and cleaned up empty group", 
                conversationId: groupId, 
                deleted: true 
            });
        }

        // Post a system announcement message that user left the group
        const systemMessage = new Message({
            senderId: loggedInUserId,
            conversationId: group._id,
            message: `${req.user.name || "A member"} left the group.`
        });
        await systemMessage.save();
        group.messages.push(systemMessage._id);
        await group.save();

        // Notify the leaving user (delete conversation from their view)
        const exitingUserSocketIds = getReceiverSocketIds(loggedInUserId);
        exitingUserSocketIds.forEach(sId => {
            io.to(sId).emit("conversationDeleted", { conversationId: groupId });
        });

        // Notify remaining group members
        group.participated.forEach(pId => {
            const socketIds = getReceiverSocketIds(pId);
            socketIds.forEach(sId => {
                io.to(sId).emit("userLeftGroup", {
                    conversationId: groupId,
                    userId: loggedInUserId,
                    userName: req.user.name || "A member",
                    membersCount: group.participated.length
                });
                io.to(sId).emit("newMessage", systemMessage);
            });
        });

        return res.status(200).json({ 
            message: "Successfully exited group", 
            conversationId: groupId 
        });
    } catch (err) {
        console.error("exitGroup error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
};