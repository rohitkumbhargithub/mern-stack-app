const mongoose = require('mongoose');

const LOCAL_MONGO_URI = 'mongodb://127.0.0.1:27017/chat-app-db';
const ATLAS_MONGO_URI = process.env.REMOTE_MONGO || 'mongodb+srv://robitkumbhar956:Rohit123@cluster0.bmugviz.mongodb.net/chat-app-db?retryWrites=true&w=majority';

const connectToDb = async () => {
    const primaryUri = process.env.MONGO || LOCAL_MONGO_URI;
    const isPrimaryLocal = primaryUri.includes('127.0.0.1') || primaryUri.includes('localhost');
    const fallbackUri = isPrimaryLocal ? ATLAS_MONGO_URI : LOCAL_MONGO_URI;

    const mask = (uri) => uri ? uri.replace(/\/\/.*@/, '//***@') : "";

    const connectOpts = {
        maxPoolSize: 20,
        minPoolSize: 5,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
    };

    try {
        await mongoose.connect(primaryUri, connectOpts);
        console.log(`✅ Connected to MongoDB successfully (${mask(primaryUri)})`);
        return true;
    } catch (err) {
        console.error(`❌ MongoDB connection error on primary URI (${mask(primaryUri)}):`, err.message);

        // Attempt fallback URI (Atlas if local failed, or local if Atlas failed)
        if (fallbackUri && fallbackUri !== primaryUri) {
            console.log(`🔄 Attempting fallback MongoDB connection (${mask(fallbackUri)})...`);
            try {
                await mongoose.connect(fallbackUri, connectOpts);
                console.log(`✅ Connected to fallback MongoDB successfully (${mask(fallbackUri)})`);
                return true;
            } catch (fallbackErr) {
                console.error(`❌ Fallback MongoDB connection also failed (${mask(fallbackUri)}):`, fallbackErr.message);
            }
        }

        console.error("\n==================================================================");
        console.error("🚨 MONGODB CONNECTION SETUP GUIDE");
        console.error("1. To start your local MongoDB service on Linux/WSL:");
        console.error("   sudo service mongodb start   (or sudo service mongod start)");
        console.error("   (or if systemd is active: sudo systemctl start mongod)");
        console.error("2. OR use cloud MongoDB Atlas by setting MONGO in your .env file:");
        console.error(`   MONGO=${ATLAS_MONGO_URI}`);
        console.error("==================================================================\n");

        return false;
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
