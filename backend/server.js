const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const PORT = process.env.PORT || 8000;
const authRoutes = require('./routes/authRoutes');
const messageRoutes = require('./routes/messageRoutes');
const userRoutes = require('./routes/userRoutes');
const connectToDb = require('./db/mongoose');
const { app, server } = require('./socket/socket');

const __variableOfChoice = path.resolve()

dotenv.config();
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);

app.use(express.static(path.join(__variableOfChoice,"/frontend/dist")));

app.get("*", (req, res) => {
    res.sendFile(path.join(__variableOfChoice, "frontend", "dist", "index.html"));
})


server.listen(PORT, ()=> {
    connectToDb();
    console.log('server running at ', PORT);
})