require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const userRoutes = require('./routes/user.routes');
const meetingRoutes = require('./routes/meeting.routes');

const connectDB = require('./config/db');

// Database connection middleware for Serverless/Vercel
// This ensures that for every request, the database connection is established
const checkDBConnection = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState === 0) {
      await connectDB();
    }
    next();
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Database connection failed", 
      error: error.message 
    });
  }
};

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply database connection check to all API routes
app.use('/api', checkDBConnection);
const uploadDir = process.env.VERCEL ? '/tmp/uploads' : path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadDir));

// Routes
app.use('/api/user', userRoutes);
app.use('/api/meetings', meetingRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

module.exports = app;
