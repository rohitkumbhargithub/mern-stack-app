const Converstion = require("../models/consverstions");
const Message = require("../models/messages");


exports.sendMessage = async (req, res) => {
    try{

        const { message } = req.body;
        const { id: recieverId } = req.params;
        const senderId = req.user._id;

        let consverstions = await Converstion.findOne({
            participate: {
                $all : [senderId, recieverId]
            },
        });

        if(!consverstions){
            consverstions = await Converstion.create({
                participate: [senderId, recieverId],
            });
        }

        const newMessage = new Message({
            senderId,
            recieverId,
            message,
        })

        if(newMessage){
            consverstions.message.push(newMessage._id);
        }

        // socket fuctionality will go here

        // await consverstions.save();
        // await newMessage.save();

        await Promise.all([consverstions.save(), newMessage.save()]);

        res.status(200).json(newMessage);

    }catch(err){
        console.log('send Message ', err);
        res.status(500).json({err: "Internal server error"});
    }
}



exports.getMessage = async (req, res, next) => {
    try{

        const { id: userToChatId } = req.params;
        const senderId = req.user._id;

        const consverstions = await Converstion.findOne({
            participate: { $all: [senderId, userToChatId] },
        }).populate("message");


        if(!consverstions) return  res.status(200).json([]);

        const message = consverstions.message
        res.status(200).json(message);

    }catch(err){
        console.log("get message ", err)
        res.status(500).json({err: "Internal server error"});
    }
}