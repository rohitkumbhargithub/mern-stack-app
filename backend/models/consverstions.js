const mongoose = require('mongoose');

const converstionSchema = new mongoose.Schema({
    participate: [{
        type: mongoose.Schema.ObjectId,
        ref: "User"
    }],
    message: [{
        type: mongoose.Schema.ObjectId,
        ref: "Messages",
        default: []
    }],
},{
    timestamps: true
})


const Converstion = mongoose.model('Converstions', converstionSchema);

module.exports = Converstion;