const Converastion = require("../models/converastions");
const Message = require("../models/messages");
const { getReceiverSocketId, io } = require("../socket/socket");


exports.sendMessage = async (req, res) => {
    try{

        const { message } = req.body;
        const { id: recieverId } = req.params;
        const senderId = req.user._id;

        let consverastions = await Converastion.findOne({
            participated: {
                $all : [senderId, recieverId]
            },
        });

        if(!consverastions){
            consverastions = await Converastion.create({
                participated: [senderId, recieverId],
            });
        }

        const newMessage = new Message({
            senderId,
            recieverId,
            message,
        })

        if(newMessage){
            consverastions.messages.push(newMessage._id);
        }

        // await consverstions.save();
        // await newMessage.save();

        await Promise.all([consverastions.save(), newMessage.save()]);

        // socket fuctionality will go here
        const receiverSocketId = getReceiverSocketId(recieverId);
        if(receiverSocketId){
            
            io.to(receiverSocketId).emit("newMessage", newMessage);
        }


        res.status(200).json(newMessage);

    }catch(err){
        // console.log('send Message ', err);
        res.status(500).json({err: "Internal server error"});
    }
}



exports.getMessage = async (req, res, next) => {
    try{

        const { id: userToChatId } = req.params;
        const senderId = req.user._id;

        const consverastions = await Converastion.findOne({
            participated: { $all: [senderId, userToChatId] },
        }).populate("messages");


        if(!consverastions) return  res.status(200).json([]);

        const message = consverastions.messages
        res.status(200).json(message);

    }catch(err){
        console.log("get message ", err)
        res.status(500).json({err: "Internal server error"});
    }
}