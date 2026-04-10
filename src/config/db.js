require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = async () => {
  // Evaluate URI inside the function to ensure process.env is loaded
  const MONGODB_URI = process.env.MONGODB_URI ||
    process.env.MONGODB_URINEW ||
    process.env.DATABASE_URL ||
    (process.env.NODE_ENV !== 'production' ? "mongodb://localhost:27017/google-meet" : "mongodb+srv://admin:pass@cluster.mongodb.net/test"); // Fallback for safety

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
