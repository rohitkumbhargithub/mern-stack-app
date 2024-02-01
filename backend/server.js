const express = require('express');
const app = express();
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const PORT = process.env.PORT || 8000;
const authRoutes = require('./routes/authRoutes');
const messageRoutes = require('./routes/messageRoutes');
const userRoutes = require('./routes/userRoutes');
const connectToDb = require('./db/mongoose');

dotenv.config();
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/message', messageRoutes);
app.use('/api/users', userRoutes);

// app.get('/', (req, res)=> {
//     res.send("Hello World");
// })


app.listen(PORT, ()=> {
    connectToDb();
    console.log('server running at ', PORT);
})