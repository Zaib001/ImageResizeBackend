const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
    if (isConnected) {
        console.log('📊 Using existing MongoDB connection');
        return;
    }

    try {
        const options = {
            maxPoolSize: 10,
            minPoolSize: 2,
            socketTimeoutMS: 45000,
            serverSelectionTimeoutMS: 5000,
        };

        const conn = await mongoose.connect(process.env.MONGODB_URI, options);

        isConnected = true;
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️  MongoDB disconnected');
            isConnected = false;
        });

    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;
