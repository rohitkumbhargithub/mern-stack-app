const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const PORT = process.env.PORT || 8000;
const authRoutes = require('./routes/authRoutes');
const messageRoutes = require('./routes/messageRoutes');
const userRoutes = require('./routes/userRoutes');
const aiRoutes = require('./routes/aiRoutes');
const pushRoutes = require('./routes/pushRoutes');
const connectToDb = require('./db/mongoose');
const { app, server } = require('./socket/socket');

const __variableOfChoice = path.resolve();
app.use(express.json());
app.use(cookieParser());

// Database connection readiness guard: prevents 10s query buffering timeouts when DB is unreachable
app.use('/api', (req, res, next) => {
    if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({
            error: "Database is not connected. Please ensure MongoDB is running (sudo service mongodb start) or configure MongoDB Atlas in your .env file."
        });
    }
    next();
});

app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/push', pushRoutes);

app.use(express.static(path.join(__variableOfChoice, "/frontend/dist")));

app.get("*", (req, res) => {
    res.sendFile(path.join(__variableOfChoice, "frontend", "dist", "index.html"));
});

const startServer = async () => {
    await connectToDb();
    server.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
};

startServer();