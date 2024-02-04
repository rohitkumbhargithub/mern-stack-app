const express = require('express');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const PORT = process.env.PORT || 8000;
const authRoutes = require('./routes/authRoutes');
const messageRoutes = require('./routes/messageRoutes');
const userRoutes = require('./routes/userRoutes');
const connectToDb = require('./db/mongoose');
const { app, server } = require('./socket/socket');

dotenv.config();
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);

// app.get('/', (req, res)=> {
//     res.send("Hello World");
// })


server.listen(PORT, ()=> {
    connectToDb();
    console.log('server running at ', PORT);
})