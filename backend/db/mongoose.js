const mongoose = require('mongoose');

const connectToDb = async () => {
    // 1. Check all standard environment variable names (Render, Heroku, Docker, .env)
    const configuredUri = process.env.MONGO 
        || process.env.MONGO_URI 
        || process.env.MONGODB_URI 
        || process.env.DATABASE_URL 
        || process.env.REMOTE_MONGO;

    const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.RENDER);

    // In production / Render, always default to Atlas cloud DB rather than localhost
    const primaryUri = configuredUri || (isProduction ? process.env.REMOTE_MONGO : process.env.LOCAL_MONGO);
    const isPrimaryLocal = primaryUri.includes('127.0.0.1') || primaryUri.includes('localhost');
    const fallbackUri = isPrimaryLocal ? process.env.REMOTE_MONGO : (isProduction ? null : process.env.LOCAL_MONGO);

    const mask = (uri) => uri ? uri.replace(/\/\/.*@/, '//***@') : "";

    const connectOpts = {
        maxPoolSize: 20,
        minPoolSize: 5,
        serverSelectionTimeoutMS: 8000,
        socketTimeoutMS: 45000,
        family: 4, // Force IPv4 resolution to prevent TLS handshake failures on Atlas
    };

    try {
        console.log(`🔌 Connecting to MongoDB (${mask(primaryUri)})...`);
        await mongoose.connect(primaryUri, connectOpts);
        console.log(`✅ Connected to MongoDB successfully (${mask(primaryUri)})`);
        return true;
    } catch (err) {
        console.error(`❌ MongoDB connection error on primary URI (${mask(primaryUri)}):`, err.message);

        const isSslAlert80 = err.message.includes('SSL alert number 80') || err.message.includes('tlsv1 alert internal error');
        if (isSslAlert80) {
            console.error("\n🔒 [MongoDB Atlas TLS/SSL Firewall Alert]");
            console.error("MongoDB Atlas actively rejected the SSL handshake because this machine's IP is not in your Atlas Network Access list.");
            console.error("👉 Fix in 10 seconds: Open MongoDB Atlas -> Security -> Network Access -> Add IP -> Click 'Allow Access from Anywhere' (0.0.0.0/0) -> Confirm.\n");
        }

        // Attempt fallback if available
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
        console.error("🚨 MONGODB CONNECTION HELP FOR RENDER & PRODUCTION");
        console.error("1. On Render Dashboard: Web Service -> Environment -> Add Variable:");
        console.error("   Key:   MONGO");
        console.error(`   Value: ${process.env.REMOTE_MONGO || 'mongodb+srv://<username>:<password>@cluster0.mongodb.net/<dbname>?retryWrites=true&w=majority'}`);
        console.error("2. On MongoDB Atlas Dashboard: Network Access -> IP Access List:");
        console.error("   Ensure 0.0.0.0/0 (Allow access from anywhere) is added so Render can connect.");
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
