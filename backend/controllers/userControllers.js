const User = require("../models/users");



exports.getUsersSildeBar = async (req, res, next) => {
    try{

        const loggedInUserId = req.user._id;
        const filterUsers = await User.find({_id: { $ne: loggedInUserId}}).select('-password');  // if remove {_id: { $ne: loggedInUserId}}
                                                                                // they take login user

        res.status(200).json(filterUsers);


    }catch(err){
        console.log("get users ", err)
        res.status(500).json({err: "Internal server error"});
    }
}