const { Server } = require('socket.io');
const http = require('http');
const express = require('express');
const app = express();
const cors = require('cors');

app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:3000"],
        methods: ["GET", "POST"],
    },
});


const getReceiverSocketId = (receiverId) => {
    return userSocketMap[receiverId];
}

const userSocketMap = {};


io.on("connection", (socket) => {
    // console.log("a user connected ", socket.id);

    const userId = socket.handshake.query.userId;

    if(userId != "undefined") userSocketMap[userId] = socket.id;

    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    // Handle joining conversation rooms
    socket.on("joinRoom", (roomId) => {
        socket.join(roomId);
    });

    // Handle typing indicators
    socket.on("typing", ({ roomId, userId }) => {
        socket.to(roomId).emit("typing", { roomId, userId });
    });

    socket.on("stopTyping", ({ roomId, userId }) => {
        socket.to(roomId).emit("stopTyping", { roomId, userId });
    });

    socket.on("disconnect", () => {
        delete userSocketMap[userId];
        io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });
});



module.exports = {
    app,
    io,
    server,
    getReceiverSocketId
}