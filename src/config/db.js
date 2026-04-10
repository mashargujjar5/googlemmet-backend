const mongoose = require('mongoose');

// Try to get the URI from multiple possible environment variables
const MONGODB_URI = process.env.MONGODB_URI ||
  process.env.MONGODB_URINEW ||
  process.env.DATABASE_URL ||
  (process.env.NODE_ENV !== 'production' ? "mongodb://localhost:27017/google-meet" : undefined);

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  if (!MONGODB_URI) {
    const errorMsg = "CRITICAL ERROR: No MongoDB connection string found in environment variables (tried MONGODB_URI, MONGODB_URINEW, DATABASE_URL). Please set one in Vercel settings.";
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 15000, // 15 seconds
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
