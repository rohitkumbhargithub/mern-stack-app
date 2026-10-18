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

const attachmentSchema = new mongoose.Schema({
    url: { type: String, required: true },
    publicId: { type: String },
    type: {
        type: String,
        enum: ['image', 'pdf', 'document', 'audio', 'video'],
        default: 'image'
    },
    name: { type: String },
    size: { type: Number },
    duration: { type: Number }, // audio voice note duration in seconds
    width: { type: Number },
    height: { type: Number },
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
        default: ""
    },
    attachments: [attachmentSchema],
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

// Ensure a message has at least text, attachments, or a poll
messageSchema.pre('validate', function(next) {
    const hasText = typeof this.message === 'string' && this.message.trim().length > 0;
    const hasAttachments = Array.isArray(this.attachments) && this.attachments.length > 0;
    const hasPoll = Boolean(this.poll && this.poll.question);
    if (!hasText && !hasAttachments && !hasPoll) {
        this.message = " ";
    }
    next();
});

// Indexes for high performance querying & sorting
messageSchema.index({ conversationId: 1, createdAt: 1 });
messageSchema.index({ senderId: 1 });
messageSchema.index({ createdAt: -1 });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;