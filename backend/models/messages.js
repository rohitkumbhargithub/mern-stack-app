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
        required: true
    },
    message : {
        type: String,
        required: true
    }
},{
    timestamps: true
});

const Message = mongoose.model('Messages', messageSchema);

module.exports = Message;