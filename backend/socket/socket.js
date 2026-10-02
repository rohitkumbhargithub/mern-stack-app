const { Server } = require('socket.io');
const http = require('http');
const express = require('express');
const app = express();
const cors = require('cors');

const allowedOrigins = process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(',')
    : ["http://localhost:3000", "http://localhost:5173", "http://localhost:8000"];

app.use(cors({ origin: allowedOrigins, credentials: true }));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true,
    },
    pingTimeout: 30000,
    pingInterval: 25000,
});

// Map of userId -> Set of socket IDs (supports multiple tabs / devices per user)
const userSocketMap = new Map();

const getReceiverSocketIds = (receiverId) => {
    if (!receiverId) return [];
    const sockets = userSocketMap.get(receiverId.toString());
    return sockets ? Array.from(sockets) : [];
};

// Backward-compatible single-socket getter
const getReceiverSocketId = (receiverId) => {
    const list = getReceiverSocketIds(receiverId);
    return list.length > 0 ? list[0] : undefined;
};

io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;

    if (userId && userId !== "undefined") {
        if (!userSocketMap.has(userId)) {
            userSocketMap.set(userId, new Set());
        }
        userSocketMap.get(userId).add(socket.id);
    }

    // Broadcast list of unique online user IDs
    io.emit("getOnlineUsers", Array.from(userSocketMap.keys()));

    // Handle joining conversation rooms
    socket.on("joinRoom", (roomId) => {
        if (roomId) socket.join(roomId.toString());
    });

    socket.on("leaveRoom", (roomId) => {
        if (roomId) socket.leave(roomId.toString());
    });

    // Handle typing indicators
    socket.on("typing", ({ roomId, userId }) => {
        if (roomId) socket.to(roomId.toString()).emit("typing", { roomId, userId });
    });

    socket.on("stopTyping", ({ roomId, userId }) => {
        if (roomId) socket.to(roomId.toString()).emit("stopTyping", { roomId, userId });
    });

    socket.on("disconnect", () => {
        if (userId && userSocketMap.has(userId)) {
            const sockets = userSocketMap.get(userId);
            sockets.delete(socket.id);
            if (sockets.size === 0) {
                userSocketMap.delete(userId);
            }
        }
        io.emit("getOnlineUsers", Array.from(userSocketMap.keys()));
    });
});

module.exports = {
    app,
    io,
    server,
    getReceiverSocketId,
    getReceiverSocketIds
};