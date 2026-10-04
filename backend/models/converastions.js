const mongoose = require('mongoose');

const converastionSchema = new mongoose.Schema({
    participated: [{
        type: mongoose.Schema.ObjectId,
        ref: "User"
    }],
    messages: [{
        type: mongoose.Schema.ObjectId,
        ref: "Message",
        default: []
    }],
    isGroupChat: {
        type: Boolean,
        default: false
    },
    chatName: String,
    groupAvatar: String,
    groupAdmin: {
        type: mongoose.Schema.ObjectId,
        ref: "User"
    },
}, {
    timestamps: true
});

converastionSchema.index({ participated: 1 });
converastionSchema.index({ isGroupChat: 1, participated: 1 });
converastionSchema.index({ updatedAt: -1 });

const Converastion = mongoose.model('Converastions', converastionSchema);

module.exports = Converastion;