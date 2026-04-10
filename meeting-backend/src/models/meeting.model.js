const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  meetingId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  host: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['waiting', 'active', 'ended'], default: 'waiting' },
  participants: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    avatar: String,
    socketId: String,
    isMuted: { type: Boolean, default: false },
    isCameraOff: { type: Boolean, default: false }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Meeting', meetingSchema);
