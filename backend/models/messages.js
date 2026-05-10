const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    senderId : {
        type: mongoose.Schema.ObjectId,
        ref: "User",
        required: true
    },
    recieverId : {
        type: mongoose.Schema.ObjectId,
        ref: "User",
    },
    conversationId: {
        type: mongoose.Schema.ObjectId,
        ref: "Converastion",
        required: true
    },
    message : {
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
    }
},{
    timestamps: true
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;