const mongoose = require('mongoose');

const pushSubscriptionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true,
    },
    endpoint: {
        type: String,
        required: true,
        unique: true,
    },
    keys: {
        p256dh: { type: String, required: true },
        auth:   { type: String, required: true },
    },
}, { timestamps: true });

pushSubscriptionSchema.index({ userId: 1 });

const PushSubscription = mongoose.model('PushSubscription', pushSubscriptionSchema);
module.exports = PushSubscription;
