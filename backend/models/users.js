const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    gender: {
        type: String,
        required: true,
        enum: ['male', 'female']
    },
    profile: {
        type: String,
        default: ""
    },
    aiSettings: {
        geminiApiKey: {
            type: String,
            default: ""
        },
        openaiApiKey: {
            type: String,
            default: ""
        },
        preferredProvider: {
            type: String,
            enum: ['gemini', 'openai'],
            default: 'gemini'
        },
        preferredLanguage: {
            type: String,
            default: 'English'
        }
    }
}, {
    timestamps: true
});

const User = mongoose.model('User', userSchema);

module.exports = User;