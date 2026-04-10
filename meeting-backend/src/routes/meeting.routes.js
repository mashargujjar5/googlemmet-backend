const express = require('express');
const router = express.Router();
const { createMeeting, getMyMeetings, getMeetingInfo, joinMeeting } = require('../controllers/meeting.controller');
const { verifyJWT } = require('../middlewares/auth.middleware');

router.post('/create', verifyJWT, createMeeting);
router.get('/my-meetings', verifyJWT, getMyMeetings);
router.get('/:meetingCode/info', getMeetingInfo);
router.post('/:meetingCode/join', joinMeeting);

module.exports = router;
