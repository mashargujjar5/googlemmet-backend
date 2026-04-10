const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URINEW;

const connectDB = async () => { 
  if (mongoose.connection.readyState >= 1) {
    console.log('MongoDB already connected');
    return mongoose.connection;
  }

  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, // 10 seconds timeout for server selection
      socketTimeoutMS: 45000, // 45 seconds for socket timeout
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    // In serverless, we might want to throw the error to be caught by a middleware
    throw error;
  }
};

module.exports = connectDB;
