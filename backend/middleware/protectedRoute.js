const jwt = require('jsonwebtoken');
const User = require('../models/users');

/**
 * Authentication middleware to verify JWT session cookie
 */
const protectRoute = async (req, res, next) => {
    try {
        const token = req.cookies.jwt;
        if (!token) {
            return res.status(401).json({ error: "Unauthorized - No token provided" });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (jwtErr) {
            return res.status(401).json({ error: "Unauthorized - Invalid or expired token" });
        }

        if (!decoded || !decoded.userId) {
            return res.status(401).json({ error: "Unauthorized - Invalid token payload" });
        }

        const user = await User.findById(decoded.userId).select("-password");
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        req.user = user;
        next();

    } catch (err) {
        console.error("protectRoute error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = protectRoute;