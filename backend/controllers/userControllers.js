const User = require("../models/users");
const Converastion = require("../models/converastions");

exports.getUsersSildeBar = async (req, res, next) => {
    try {
        const loggedInUserId = req.user._id;
        
        // Only show 1-on-1 conversations that have messages
        const conversations = await Converastion.find({
            participated: { $in: [loggedInUserId] },
            isGroupChat: { $ne: true },
            messages: { $not: { $size: 0 } }
        })
        .populate("participated", "-password")
        .populate({
            path: "messages",
            options: { sort: { createdAt: -1 }, limit: 1 }
        })
        .sort({ updatedAt: -1 });

        const sidebarData = conversations.map(conv => {
            const lastMsg = conv.messages[0]; // Since we sorted -1 and limited to 1
            if (conv.isGroupChat) {
                return {
                    _id: conv._id,
                    name: conv.chatName,
                    isGroupChat: true,
                    profile: conv.groupAvatar,
                    type: "group",
                    participants: conv.participated,
                    lastMessage: lastMsg?.message || lastMsg?.body || "",
                    lastMessageTime: lastMsg?.createdAt || ""
                };
            } else {
                const otherUser = conv.participated.find(u => u._id.toString() !== loggedInUserId.toString());
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
            }
        }).filter(item => item !== null);

        res.status(200).json(sidebarData);

    } catch (err) {
        console.log("get users ", err)
        res.status(500).json({ err: "Internal server error" });
    }
}

exports.searchUsers = async (req, res, next) => {
    try {
        const loggedInUserId = req.user._id;
        const { q } = req.query;

        const query = {
            _id: { $ne: loggedInUserId }
        };

        if (q) {
            query.$or = [
                { name: { $regex: q, $options: 'i' } },
                { username: { $regex: q, $options: 'i' } }
            ];
        }

        const users = await User.find(query).select('-password').limit(20);
        res.status(200).json(users);

    } catch (err) {
        console.log("search users ", err)
        res.status(500).json({ err: "Internal server error" });
    }
}