const express = require('express');
const cors = require('cors');
const path = require('path');
const userRoutes = require('./routes/user.routes');
const meetingRoutes = require('./routes/meeting.routes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/user', userRoutes);
app.use('/api/meetings', meetingRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

module.exports = app;
