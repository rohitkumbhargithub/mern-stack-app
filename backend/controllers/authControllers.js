const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require("../models/users");
const Otp = require("../models/otp");
const jwt = require('../utils/jwtToken');
const { sendLoginOtpEmail } = require('../services/emailService');

exports.singup = async (req, res) => {
    const { name, email, password, confirmPassword, gender } = req.body;
    try {
        if (!name || !email || !password || !confirmPassword || !gender) {
            return res.status(400).json({ error: "Please fill in all fields" });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ error: "Passwords do not match" });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const existingUser = await User.findOne({ email: normalizedEmail });

        if (existingUser) {
            return res.status(400).json({ error: "User already exists!" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password, salt);

        const boysProfile = `https://avatar.iran.liara.run/public/boy?username=${encodeURIComponent(name)}`;
        const girlsProfile = `https://avatar.iran.liara.run/public/girl?username=${encodeURIComponent(name)}`;

        const newUser = new User({
            name,
            email: normalizedEmail,
            password: hashPassword,
            gender,
            profile: "",
        });

        if (newUser) {
            await newUser.save();
            jwt(newUser._id, res);

            return res.status(200).json({
                _id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                profile: newUser.profile,
            });
        } else {
            return res.status(401).json({ error: "Failed to create user" });
        }
    } catch (err) {
        console.error('signup error:', err);
        return res.status(500).json({ error: err.message || "Internal server error" });
    }
};

/**
 * Step 1: Verify credentials and issue email OTP
 */
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });
        const isPasswordCorrect = await bcrypt.compare(password, user?.password || '');

        if (!user || !isPasswordCorrect) {
            return res.status(400).json({ error: "Invalid email or password" });
        }

        // Rate limiting cooldown check (minimum 30s before generating another code)
        const existingOtp = await Otp.findOne({ email: normalizedEmail });
        if (existingOtp && existingOtp.lastSentAt) {
            const timeDiffSeconds = Math.floor((Date.now() - existingOtp.lastSentAt.getTime()) / 1000);
            if (timeDiffSeconds < 30) {
                return res.status(200).json({
                    requireOtp: true,
                    email: user.email,
                    message: `A verification code was already sent recently. Check your email or wait ${30 - timeDiffSeconds}s to resend.`,
                    expiresIn: Math.max(0, Math.floor((existingOtp.expiresAt.getTime() - Date.now()) / 1000)),
                });
            }
        }

        // Generate cryptographically secure 6-digit OTP
        const otpCode = crypto.randomInt(100000, 1000000).toString();

        // Hash OTP before storing in database
        const salt = await bcrypt.genSalt(10);
        const hashedOtp = await bcrypt.hash(otpCode, salt);

        // Store / update OTP document (valid for 5 minutes)
        await Otp.findOneAndUpdate(
            { email: normalizedEmail },
            {
                otp: hashedOtp,
                attempts: 0,
                lastSentAt: new Date(),
                expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
            },
            { upsert: true, new: true }
        );

        // Dispatch OTP email asynchronously so HTTP response is instant (< 50ms)
        sendLoginOtpEmail({
            email: user.email,
            name: user.name,
            otp: otpCode,
        }).catch(err => console.error("Async login OTP email error:", err));

        // Return challenge response immediately (session cookie NOT issued yet)
        return res.status(200).json({
            requireOtp: true,
            email: user.email,
            message: "A 6-digit verification code has been sent to your email address.",
            expiresIn: 300,
        });

    } catch (err) {
        console.error('login error:', err);
        return res.status(500).json({ error: "Internal server error" });
    }
};

/**
 * Step 2: Verify 6-digit OTP and complete authentication
 */
exports.verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ error: "Email and OTP verification code are required" });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const otpRecord = await Otp.findOne({ email: normalizedEmail });

        if (!otpRecord) {
            return res.status(400).json({ error: "Verification code has expired or was not requested. Please log in again." });
        }

        // Check if OTP has expired
        if (new Date() > otpRecord.expiresAt) {
            await Otp.deleteOne({ email: normalizedEmail });
            return res.status(400).json({ error: "Verification code has expired. Please request a new one." });
        }

        // Check attempt count
        if (otpRecord.attempts >= 5) {
            await Otp.deleteOne({ email: normalizedEmail });
            return res.status(400).json({ error: "Too many failed attempts. For your security, this code was invalidated. Please request a new one." });
        }

        // Verify OTP match
        const isMatch = await bcrypt.compare(otp.trim(), otpRecord.otp);
        if (!isMatch) {
            otpRecord.attempts += 1;
            await otpRecord.save();
            const attemptsLeft = 5 - otpRecord.attempts;
            return res.status(400).json({
                error: `Invalid verification code. ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} remaining.`,
            });
        }

        // Successful verification! Delete the single-use OTP
        await Otp.deleteOne({ email: normalizedEmail });

        // Retrieve user and issue secure JWT session cookie
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(404).json({ error: "User account not found." });
        }

        jwt(user._id, res);

        return res.status(200).json({
            _id: user._id,
            email: user.email,
            name: user.name,
            profile: user.profile,
            aiSettings: {
                preferredProvider: user.aiSettings?.preferredProvider || "gemini",
                preferredLanguage: user.aiSettings?.preferredLanguage || "English",
                geminiApiKeyMasked: user.aiSettings?.geminiApiKey ? "••••••••••••••••" : "",
                openaiApiKeyMasked: user.aiSettings?.openaiApiKey ? "••••••••••••••••" : "",
            },
        });

    } catch (err) {
        console.error('verifyOtp error:', err);
        return res.status(500).json({ error: "Internal server error during verification" });
    }
};

/**
 * Resend a new OTP code with rate limit cooldown
 */
exports.resendOtp = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: "Email is required" });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const existingOtp = await Otp.findOne({ email: normalizedEmail });
        if (existingOtp && existingOtp.lastSentAt) {
            const timeDiffSeconds = Math.floor((Date.now() - existingOtp.lastSentAt.getTime()) / 1000);
            if (timeDiffSeconds < 30) {
                return res.status(429).json({
                    error: `Please wait ${30 - timeDiffSeconds}s before requesting a new verification code.`,
                });
            }
        }

        // Generate new OTP
        const otpCode = crypto.randomInt(100000, 1000000).toString();
        const salt = await bcrypt.genSalt(10);
        const hashedOtp = await bcrypt.hash(otpCode, salt);

        await Otp.findOneAndUpdate(
            { email: normalizedEmail },
            {
                otp: hashedOtp,
                attempts: 0,
                lastSentAt: new Date(),
                expiresAt: new Date(Date.now() + 5 * 60 * 1000),
            },
            { upsert: true, new: true }
        );

        // Dispatch email asynchronously so HTTP response is instant (< 50ms)
        sendLoginOtpEmail({
            email: user.email,
            name: user.name,
            otp: otpCode,
        }).catch(err => console.error("Async resend OTP email error:", err));

        return res.status(200).json({
            message: "A fresh verification code has been dispatched to your email.",
            expiresIn: 300,
        });

    } catch (err) {
        console.error('resendOtp error:', err);
        return res.status(500).json({ error: "Internal server error" });
    }
};

exports.logout = (req, res) => {
    try {
        res.clearCookie('jwt', {
            httpOnly: true,
            sameSite: "strict",
            secure: process.env.NODE_ENV === 'production',
            path: "/",
        });
        return res.status(200).json({ success: true, message: "Logged out successfully!" });
    } catch (err) {
        console.error("logout error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
};