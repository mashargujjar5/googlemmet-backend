const Meeting = require('../models/meeting.model');
const crypto = require('crypto');

exports.createMeeting = async (req, res) => {
  try {
    const { title } = req.body;
    const meetingId = crypto.randomBytes(4).toString('hex').match(/.{1,3}/g).join('-'); // e.g. abc-def-gh

    const meeting = await Meeting.create({
      meetingId,
      title,
      host: req.user._id
    });

    res.status(201).json({ success: true, data: meeting });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMyMeetings = async (req, res) => {
  try {
    const meetings = await Meeting.find({ host: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: { results: meetings } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMeetingInfo = async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ meetingId: req.params.meetingCode });
    if (!meeting) return res.status(404).json({ success: false, message: "Meeting not found" });
    res.status(200).json({ success: true, data: meeting });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.joinMeeting = async (req, res) => {
  try {
    const { name } = req.body;
    let meeting = await Meeting.findOne({ meetingId: req.params.meetingCode });
    
    if (!meeting) {
      return res.status(404).json({ success: false, message: "Meeting not found. Please check your code or create a new meeting." });
    }

    if (meeting.status === 'ended') return res.status(400).json({ success: false, message: "Meeting has ended" });

    // Validation logic for joining (e.g. check if user is blocked, etc.)
    res.status(200).json({ success: true, data: meeting });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
