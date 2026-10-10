const mongoose = require('mongoose');

const pollOptionSchema = new mongoose.Schema({
    id: { type: String, required: true },
    text: { type: String, required: true },
    votes: [{ type: mongoose.Schema.ObjectId, ref: "User" }]
}, { _id: false });

const reactionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
        required: true
    },
    userName: {
        type: String,
        default: "User"
    },
    emoji: {
        type: String,
        required: true
    }
}, { _id: false });

const messageSchema = new mongoose.Schema({
    senderId: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
        required: true
    },
    recieverId: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
    },
    conversationId: {
        type: mongoose.Schema.ObjectId,
        ref: "Converastion",
        required: true
    },
    message: {
        type: String,
        required: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    replyTo: {
        type: mongoose.Schema.ObjectId,
        ref: "Message"
    },
    isForwarded: {
        type: Boolean,
        default: false
    },
    isEdited: {
        type: Boolean,
        default: false
    },
    mentions: [{
        type: mongoose.Schema.ObjectId,
        ref: "User"
    }],
    reactions: [reactionSchema],
    poll: {
        type: new mongoose.Schema({
            question: { type: String, required: true },
            options: [pollOptionSchema],
            allowMultiple: { type: Boolean, default: false }
        }, { _id: false }),
        default: undefined
    }
}, {
    timestamps: true
});

// Indexes for high performance querying & sorting
messageSchema.index({ conversationId: 1, createdAt: 1 });
messageSchema.index({ senderId: 1 });
messageSchema.index({ createdAt: -1 });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;