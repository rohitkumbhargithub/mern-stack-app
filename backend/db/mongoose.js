const mongoose = require('mongoose');

const connectToDb = async () => {
    try{
        await mongoose.connect(process.env.MONGO);
        console.log('connected to MongoDB');
    }catch(err){
        console.error(err.message);
    }
}

module.exports = connectToDb;
