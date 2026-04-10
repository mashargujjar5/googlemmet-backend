require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const app = require('./app');
const socketHandler = require('./socket/socket.handler');

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

socketHandler(io);

const PORT = process.env.PORT || 9000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/google-meet";

// Ensure upload directory exists locally
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('Created uploads directory');
}

// Database Connection
const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
      console.log('Connected to MongoDB');
    }
  } catch (err) {
    console.error('MongoDB connection error:', err);
  }
};

// Start server for local development
if (process.env.NODE_ENV !== 'production') {
  connectDB().then(() => {
    server.listen(PORT, () => {
      console.log(`Server running local on port ${PORT}`);
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Error: Port ${PORT} is already in use. Please check if another instance of the server is running.`);
      } else {
        console.error('Server error:', err);
      }
    });
  });
} else {
  // On Vercel, we just need to ensure DB is connected
  connectDB();
}

// Export for Vercel
module.exports = server;
