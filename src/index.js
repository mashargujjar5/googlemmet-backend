require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const app = require('./app');
const socketHandler = require('./socket/socket.handler');
const connectDB = require('./config/db');

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

socketHandler(io);

const PORT = process.env.PORT || 9000;

// Ensure upload directory exists locally
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('Created uploads directory');
}

// Start server
if (process.env.NODE_ENV !== 'production') {
  connectDB()
    .then(() => {
      server.listen(PORT, () => {
        console.log(`Server running local on port ${PORT}`);
      }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.error(`Error: Port ${PORT} is already in use.`);
        } else {
          console.error('Server error:', err);
        }
      });
    })
    .catch((err) => {
      console.error('Failed to connect to DB, server not started:', err.message);
    });
} else {
  // On Vercel, app.js handles requests and DB connection via middleware
  console.log('Production environment detected');
}

// Export for Vercel
module.exports = server;
