const jwt = require('jsonwebtoken');
const User = require('../models/users');

const protectRoute = async (req, res, next) => {
    try{

        const token = req.cookies.jwt;
        if(!token){
            res.status(401).json({err: "UnAuthorized - No token"});
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if(!decoded){
            res.status(401).json({err: "UnAuthorized - Invaild Token"});
        }

        const user = await User.findById(decoded.userId).select("-password");

        if(!user){
            res.status(500).json({err: "User not found!"});
        }

        req.user = user;

        next();

    }catch(err){
        console.log("portected Route ", err);
        res.status(500).json({err: "Internal server error"});
    }
}


module.exports = protectRoute;