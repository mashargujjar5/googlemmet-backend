const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const userRoutes = require('./routes/user.routes');
const meetingRoutes = require('./routes/meeting.routes');

// Database Connection for Serverless
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/google-meet";
const connectDB = async () => {
  if (mongoose.connection.readyState === 0) {
    try {
      await mongoose.connect(MONGODB_URI);
      console.log('Connected to MongoDB');
    } catch (err) {
      console.error('MongoDB connection error:', err);
    }
  }
};

// Initial connection for serverless warming
connectDB();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
