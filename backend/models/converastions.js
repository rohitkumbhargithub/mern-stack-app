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
},{
    timestamps: true
})


const Converastion = mongoose.model('Converastions', converastionSchema);

module.exports = Converastion;