const User = require("../models/users");
const Converastion = require("../models/converastions");

exports.getUsersSildeBar = async (req, res, next) => {
    try {
        const loggedInUserId = req.user._id;
        
        // Find all conversations where the logged-in user is a participant AND there is at least one message
        const conversations = await Converastion.find({
            participated: { $in: [loggedInUserId] },
            messages: { $not: { $size: 0 } }
        });

        // Extract the IDs of the other participants
        const participantIds = conversations.reduce((acc, conv) => {
            const others = conv.participated.filter(id => id.toString() !== loggedInUserId.toString());
            return [...acc, ...others];
        }, []);

        // Get the user details for those participants
        const filterUsers = await User.find({ 
            _id: { $in: participantIds } 
        }).select('-password');

        res.status(200).json(filterUsers);

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