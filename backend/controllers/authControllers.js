const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require("../models/users");
const Otp = require("../models/otp");
const jwt = require('../utils/jwtToken');
const { sendSignupOtpEmail } = require('../services/emailService');

exports.signup = exports.requestSignupOtp = async (req, res) => {
    const { name, email, password, confirmPassword, gender } = req.body;
    try {
        if (!name || !email || !password || !confirmPassword || !gender) {
            return res.status(400).json({ error: "Please fill in all fields" });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ error: "Passwords do not match" });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: "Password must be at least 6 characters" });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const existingUser = await User.findOne({ email: normalizedEmail });

        if (existingUser) {
            return res.status(400).json({ error: "User already exists!" });
        }

        const existingPending = await Otp.findOne({ email: normalizedEmail });
        if (existingPending && existingPending.lastSentAt) {
            const timeDiffSeconds = Math.floor((Date.now() - existingPending.lastSentAt.getTime()) / 1000);
            if (timeDiffSeconds < 30) {
                return res.status(429).json({
                    error: `Please wait ${30 - timeDiffSeconds}s before requesting another code.`,
                    retryAfter: 30 - timeDiffSeconds,
                });
            }
        }

        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password, salt);

        const otpCode = crypto.randomInt(100000, 1000000).toString();
        const otpSalt = await bcrypt.genSalt(10);
        const hashedOtp = await bcrypt.hash(otpCode, otpSalt);

        await Otp.findOneAndUpdate(
            { email: normalizedEmail },
            {
                otp: hashedOtp,
                purpose: 'signup',
                payload: {
                    name,
                    password: hashPassword,
                    gender
                },
                attempts: 0,
                lastSentAt: new Date(),
                expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
                createdAt: new Date(),
            },
            { upsert: true, new: true }
        );

        const emailResult = await sendSignupOtpEmail({
            email: normalizedEmail,
            name: name,
            otp: otpCode,
        }).catch(err => {
            console.error("Async signup OTP email error:", err);
            return { success: false, deliveryError: err.message };
        });

        const isDeliveryFallback = emailResult?.devMode || !emailResult?.success;

        return res.status(200).json({
            requiresVerification: true,
            email: normalizedEmail,
            message: isDeliveryFallback && process.env.NODE_ENV !== 'production'
                ? `Verification code generated (Dev fallback OTP: ${otpCode})`
                : "Verification code sent to your email.",
            expiresIn: 300,
            ...(isDeliveryFallback && process.env.NODE_ENV !== 'production' ? { devOtp: otpCode } : {})
        });
    } catch (err) {
        console.error('signup request error:', err);
        return res.status(500).json({ error: err.message || "Internal server error" });
    }
};

exports.verifySignupOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ error: "Email and OTP are required" });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const pending = await Otp.findOne({ email: normalizedEmail });

        if (!pending) {
            return res.status(400).json({ error: "No pending registration found. Please start signing up again." });
        }

        if (!pending.expiresAt || new Date() > pending.expiresAt) {
            await Otp.deleteOne({ email: normalizedEmail });
            return res.status(400).json({ error: "Verification code expired. Please request a new one." });
        }

        if (pending.attempts >= 5) {
            await Otp.deleteOne({ email: normalizedEmail });
            return res.status(400).json({ error: "Too many failed attempts. Please request a new verification code." });
        }

        if (!pending.payload || pending.purpose !== 'signup') {
            await Otp.deleteOne({ email: normalizedEmail });
            return res.status(400).json({ error: "Invalid registration session. Please start signing up again." });
        }

        const isOtpCorrect = await bcrypt.compare(otp.trim(), pending.otp);
        if (!isOtpCorrect) {
            pending.attempts += 1;
            await pending.save();
            const remaining = Math.max(0, 5 - pending.attempts);
            return res.status(400).json({
                error: remaining === 0
                    ? "Too many failed attempts. Please request a new verification code."
                    : `Invalid verification code. ${remaining} attempt(s) remaining.`
            });
        }

        const { name, password, gender } = pending.payload;
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            await Otp.deleteOne({ email: normalizedEmail });
            return res.status(400).json({ error: "Account already exists — please log in." });
        }

        let newUser;
        try {
            newUser = await User.create({
                name,
                email: normalizedEmail,
                password,
                gender,
                profile: "",
                aiSettings: {
                    geminiApiKey: "",
                    openaiApiKey: "",
                    preferredProvider: "gemini",
                    preferredLanguage: "English",
                }
            });
        } catch (createErr) {
            if (createErr.code === 11000) {
                await Otp.deleteOne({ email: normalizedEmail });
                return res.status(409).json({ error: "Account already exists — please log in." });
            }
            throw createErr;
        }

        await Otp.deleteOne({ email: normalizedEmail });

        jwt(newUser._id, res);

        return res.status(200).json({
            _id: newUser._id,
            name: newUser.name,
            email: newUser.email,
            profile: newUser.profile,
            aiSettings: {
                preferredProvider: newUser.aiSettings?.preferredProvider || 'gemini',
                preferredLanguage: newUser.aiSettings?.preferredLanguage || 'English',
                geminiApiKeyMasked: newUser.aiSettings?.geminiApiKey ? '********' : '',
                openaiApiKeyMasked: newUser.aiSettings?.openaiApiKey ? '********' : '',
            }
        });
    } catch (err) {
        console.error('signup verify error:', err);
        return res.status(500).json({ error: err.message || "Internal server error" });
    }
};

exports.resendSignupOtp = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: "Email is required" });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const pending = await Otp.findOne({ email: normalizedEmail });

        if (!pending || pending.purpose !== 'signup' || !pending.payload) {
            return res.status(404).json({ error: "No pending registration found for this email." });
        }

        if (pending.lastSentAt) {
            const timeDiffSeconds = Math.floor((Date.now() - pending.lastSentAt.getTime()) / 1000);
            if (timeDiffSeconds < 30) {
                return res.status(429).json({
                    error: `Please wait ${30 - timeDiffSeconds}s before requesting another code.`,
                    retryAfter: 30 - timeDiffSeconds,
                });
            }
        }

        const otpCode = crypto.randomInt(100000, 1000000).toString();
        const salt = await bcrypt.genSalt(10);
        const hashedOtp = await bcrypt.hash(otpCode, salt);

        pending.otp = hashedOtp;
        pending.attempts = 0;
        pending.lastSentAt = new Date();
        pending.expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        pending.createdAt = new Date();
        await pending.save();

        const emailResult = await sendSignupOtpEmail({
            email: normalizedEmail,
            name: pending.payload.name,
            otp: otpCode,
        }).catch(err => {
            console.error("Async signup OTP resend error:", err);
            return { success: false, deliveryError: err.message };
        });

        const isDeliveryFallback = emailResult?.devMode || !emailResult?.success;

        return res.status(200).json({
            message: isDeliveryFallback && process.env.NODE_ENV !== 'production'
                ? `A new verification code was generated (Dev fallback OTP: ${otpCode})`
                : "A new verification code has been sent to your email.",
            expiresIn: 300,
            ...(isDeliveryFallback && process.env.NODE_ENV !== 'production' ? { devOtp: otpCode } : {})
        });
    } catch (err) {
        console.error('signup resend error:', err);
        return res.status(500).json({ error: err.message || "Internal server error" });
    }
};

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

        jwt(user._id, res);

        return res.status(200).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            profile: user.profile,
            aiSettings: {
                preferredProvider: user.aiSettings?.preferredProvider || 'gemini',
                preferredLanguage: user.aiSettings?.preferredLanguage || 'English',
                geminiApiKeyMasked: user.aiSettings?.geminiApiKey ? '********' : '',
                openaiApiKeyMasked: user.aiSettings?.openaiApiKey ? '********' : '',
            }
        });
    } catch (err) {
        console.error('login error:', err);
        return res.status(500).json({ error: err.message || "Internal server error" });
    }
};

exports.logout = async (req, res) => {
    try {
        res.cookie('jwt', '', { maxAge: 0 });
        return res.status(200).json({ success: true });
    } catch (err) {
        console.error('logout error:', err);
        return res.status(500).json({ error: err.message || "Internal server error" });
    }
};

// Keep old handler names for compatibility if any code references them
exports.singup = exports.requestSignupOtp;
exports.verifyOtp = exports.verifySignupOtp;
exports.resendOtp = exports.resendSignupOtp;
