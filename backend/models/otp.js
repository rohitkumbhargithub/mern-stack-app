const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    otp: {
        type: String,
        required: true,
    },
    attempts: {
        type: Number,
        default: 0,
        max: 5,
    },
    lastSentAt: {
        type: Date,
        default: Date.now,
    },
    expiresAt: {
        type: Date,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 600, // MongoDB TTL index: automatically deletes document 10 minutes after creation
    },
});

// Index for fast query by email and expiration date
otpSchema.index({ email: 1, expiresAt: 1 });

const Otp = mongoose.model('Otp', otpSchema);

module.exports = Otp;
