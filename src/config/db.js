require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = async () => {
  const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL;

  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  if (!MONGODB_URI || MONGODB_URI === "undefined") {
    const errorMsg = "CRITICAL ERROR: No MongoDB connection string found in environment variables (tried MONGODB_URI, MONGODB_URINEW, DATABASE_URL).";
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  try {
    console.log('Attempting to connect to MongoDB...');
    const conn = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 20000, // 20 seconds
      socketTimeoutMS: 45000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    throw error;
  }
};

module.exports = connectDB;
