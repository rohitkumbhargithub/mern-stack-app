const mongoose = require('mongoose');

const LOCAL_MONGO_URI = 'mongodb://127.0.0.1:27017/chat-app-db';

const connectToDb = async () => {
    const targetUri = process.env.MONGO || LOCAL_MONGO_URI;

    // Mask credentials in logs for security if present
    const maskedUri = targetUri.replace(/\/\/.*@/, '//***@');

    try {
        await mongoose.connect(targetUri, {
            maxPoolSize: 20, // Maintain up to 20 socket connections for high concurrency
            minPoolSize: 5,  // Maintain minimum 5 warm connections
            serverSelectionTimeoutMS: 5000, // Timeout fast if DB is unreachable
            socketTimeoutMS: 45000,
        });
        console.log(`✅ Connected to MongoDB successfully (${maskedUri})`);
    } catch (err) {
        console.error("❌ MongoDB connection error:", err.message);

        // If a remote/Atlas URI failed, automatically attempt fallback to local MongoDB
        if (!targetUri.includes('127.0.0.1') && !targetUri.includes('localhost')) {
            console.log(`🔄 Attempting fallback to local MongoDB (${LOCAL_MONGO_URI})...`);
            try {
                await mongoose.connect(LOCAL_MONGO_URI, {
                    maxPoolSize: 20,
                    minPoolSize: 5,
                    serverSelectionTimeoutMS: 5000,
                    socketTimeoutMS: 45000,
                });
                console.log(`✅ Connected to local MongoDB fallback (${LOCAL_MONGO_URI})`);
            } catch (fallbackErr) {
                console.error("❌ Local MongoDB fallback also failed:", fallbackErr.message);
                console.error("👉 Please ensure MongoDB is running locally: sudo systemctl start mongod or mongod --dbpath /var/lib/mongodb");
            }
        } else {
            console.error("👉 Please ensure your local MongoDB service is running: sudo systemctl start mongod");
        }
    }
};

// Global Mongoose connection event listeners
mongoose.connection.on('connected', () => {
    console.log('📦 Mongoose connection state: CONNECTED');
});

mongoose.connection.on('error', (err) => {
    console.error('⚠️ Mongoose connection error event:', err.message);
});

mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ Mongoose connection state: DISCONNECTED');
});

module.exports = connectToDb;
