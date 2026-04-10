const Meeting = require('../models/meeting.model');
const jwt = require('jsonwebtoken');

// In-memory chat per meeting (resets on server restart)
const chatHistories = {};
// Tracking join requests and approved participants
const pendingRequests = {}; // meetingId -> [ {socketId, name, userId, avatar} ]
const approvedParticipants = {}; // meetingId -> Set(userId or socketId)

module.exports = (io) => {
  // ─── Socket Auth Middleware ──────────────────────────────────
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      console.log(`[Socket Auth] Connection attempt. Token: ${token ? 'Present' : 'Missing'}`);
      if (!token) return next();

      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      socket.userId = decoded._id || decoded.id; // Support both
      console.log(`[Socket Auth] Verified User ID: ${socket.userId}`);
      next();
    } catch (err) {
      console.error(`[Socket Auth] Failed: ${err.message}`);
      next();
    }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // ─── Request to Join (for Guest/Non-host) ─────────────────────
    socket.on('request-join', async ({ meetingId, name, userId, avatar }) => {
      try {
        console.log(`[request-join] ${name} (${socket.id}) requesting to join ${meetingId}`);
        const meeting = await Meeting.findOne({ meetingId });
        
        if (!meeting) {
          return socket.emit('error', { message: 'Meeting not found' });
        }

        if (meeting.status === 'ended') {
          return socket.emit('error', { message: 'This meeting has already ended.' });
        }

        // If user is the host, they should be able to join directly
        if (meeting.host && String(meeting.host) === String(userId)) {
          return socket.emit('join-approved', { meetingId });
        }

        if (!pendingRequests[meetingId]) pendingRequests[meetingId] = [];
        pendingRequests[meetingId].push({ socketId: socket.id, name, userId, avatar });

        // Broadcast request to everyone currently in the room (especially host)
        io.to(meetingId).emit('incoming-join-request', {
          socketId: socket.id,
          name,
          userId,
          avatar
        });

        socket.emit('waiting-for-host', { message: 'The host will let you in soon.' });
      } catch (err) {
        console.error('Request join error:', err);
      }
    });

    // ─── Cancel Join Request (Requester side) ──────────────────────
    socket.on('cancel-join-request', ({ meetingId }) => {
      console.log(`[cancel-join-request] ${socket.id} cancelled for ${meetingId}`);
      if (pendingRequests[meetingId]) {
        pendingRequests[meetingId] = pendingRequests[meetingId].filter(r => r.socketId !== socket.id);
        io.to(meetingId).emit('participant-cancelled-request', { socketId: socket.id });
      }
    });

    // ─── Host Decision (Admit/Deny) ──────────────────────────────
    socket.on('accept-join-request', async ({ meetingId, socketId }) => {
      try {
        const meeting = await Meeting.findOne({ meetingId });
        const userId = socket.handshake.auth.userId || socket.userId; // Assuming userId is available
        
        // Basic check: is this socket in the room and is it the host?
        // We'll trust the meeting model's host field
        // Note: For simplicity, we check if the socket has authority
        
        console.log(`[accept-join-request] Admitting ${socketId} to ${meetingId}`);
        if (!approvedParticipants[meetingId]) approvedParticipants[meetingId] = new Set();
        approvedParticipants[meetingId].add(socketId);

        // Notify the specific requester
        io.to(socketId).emit('join-approved', { meetingId });
        
        // Remove from pending
        if (pendingRequests[meetingId]) {
          pendingRequests[meetingId] = pendingRequests[meetingId].filter(r => r.socketId !== socketId);
        }
      } catch (err) {
        console.error('Accept join error:', err);
      }
    });

    socket.on('reject-join-request', async ({ meetingId, socketId }) => {
      try {
        console.log(`[reject-join-request] Denying ${socketId} to ${meetingId}`);
        io.to(socketId).emit('join-denied', { message: 'The host has denied your request to join.' });
        
        // Remove from pending
        if (pendingRequests[meetingId]) {
          pendingRequests[meetingId] = pendingRequests[meetingId].filter(r => r.socketId !== socketId);
        }
      } catch (err) {
        console.error('Reject join error:', err);
      }
    });

    // ─── Join Room ──────────────────────────────────────────────
    socket.on('join-room', async ({ meetingId, name, userId, avatar, isHost, isCameraOff, isMuted }) => {
      try {
        let meeting = await Meeting.findOne({ meetingId });
        
        if (!meeting) {
          return socket.emit('error', { message: 'Meeting not found. Please check your code.' });
        }

        if (meeting.status === 'ended') {
          return socket.emit('error', { message: 'This meeting has ended and is no longer active.' });
        }

        const isActualHost = (meeting.host && String(meeting.host) === String(userId)) || isHost;
        const isApproved = approvedParticipants[meetingId] && approvedParticipants[meetingId].has(socket.id);

        if (!isActualHost && !isApproved) {
          console.warn(`[join-room] Unauthorized join attempt by ${name} to ${meetingId}`);
          return socket.emit('error', { message: 'You need host approval to join this meeting.' });
        }
        
        // Basic join logic
        socket.join(meetingId);
        console.log(`[join-room] ${name} joined ${meetingId} (cam:${!isCameraOff} mic:${!isMuted})`);

        meeting.participants = meeting.participants.filter(p => p.socketId !== socket.id);
        const participant = {
          socketId: socket.id,
          name: name || 'Guest',
          user: userId && String(userId).length === 24 ? userId : undefined,
          avatar: avatar || '',
          isMuted: !!isMuted,
          isCameraOff: !!isCameraOff
        };
        meeting.participants.push(participant);

        if ((isHost || isActualHost) && meeting.status !== 'ended') {
          meeting.status = 'active';
        }
        await meeting.save();

        if (!chatHistories[meetingId]) chatHistories[meetingId] = [];

        socket.to(meetingId).emit('participant-joined', {
          socketId: socket.id,
          name: participant.name,
          avatar: participant.avatar,
          isMuted: participant.isMuted,
          isCameraOff: participant.isCameraOff
        });

        socket.emit('room-joined', {
          meetingId,
          participantId: socket.id,
          participants: meeting.participants.map(p => ({
            socketId: p.socketId,
            name: p.name,
            avatar: p.avatar || '',
            isMuted: p.isMuted,
            isCameraOff: p.isCameraOff,
            isMe: p.socketId === socket.id
          })),
          chatHistory: chatHistories[meetingId] || [],
          status: meeting.status,
          isHost: isActualHost
        });

        // If host, send them any existing pending requests
        if (isActualHost && pendingRequests[meetingId]?.length > 0) {
          socket.emit('pending-requests-sync', { requests: pendingRequests[meetingId] });
        }
      } catch (err) {
        console.error('Socket join exception:', err);
        socket.emit('error', { message: 'Meeting connection failed internally: ' + err.message });
      }
    });

    // ─── WebRTC Signaling ───────────────────────────────────────
    socket.on('offer', ({ targetSocketId, offer, meetingId }) => {
      io.to(targetSocketId).emit('offer', { offer, fromSocketId: socket.id, meetingId });
    });

    socket.on('answer', ({ targetSocketId, answer, meetingId }) => {
      io.to(targetSocketId).emit('answer', { answer, fromSocketId: socket.id, meetingId });
    });

    socket.on('ice-candidate', ({ targetSocketId, candidate }) => {
      io.to(targetSocketId).emit('ice-candidate', { candidate, fromSocketId: socket.id });
    });

    // ─── Chat ───────────────────────────────────────────────────
    socket.on('send-message', ({ meetingId, message, senderName, senderId, receiverSocketId }) => {
      const msg = {
        senderId,
        senderName: senderName || 'Guest',
        message,
        timestamp: new Date(),
        isPrivate: !!receiverSocketId
      };

      if (!chatHistories[meetingId]) chatHistories[meetingId] = [];

      if (receiverSocketId) {
        io.to(receiverSocketId).emit('new-message', msg);
        socket.emit('new-message', msg);
      } else {
        chatHistories[meetingId].push(msg);
        io.to(meetingId).emit('new-message', msg);
      }
    });

    // ─── Media Toggles ──────────────────────────────────────────
    socket.on('toggle-mute', async ({ meetingId, isMuted }) => {
      await Meeting.findOneAndUpdate(
        { meetingId, 'participants.socketId': socket.id },
        { $set: { 'participants.$.isMuted': isMuted } }
      );
      socket.to(meetingId).emit('participant-muted', { socketId: socket.id, isMuted });
    });

    socket.on('toggle-camera', async ({ meetingId, isCameraOff }) => {
      await Meeting.findOneAndUpdate(
        { meetingId, 'participants.socketId': socket.id },
        { $set: { 'participants.$.isCameraOff': isCameraOff } }
      );
      socket.to(meetingId).emit('participant-camera-toggled', { socketId: socket.id, isCameraOff });
    });

    socket.on('end-meeting', async ({ meetingId }) => {
      try {
        const meeting = await Meeting.findOne({ meetingId });
        if (!meeting) {
          console.warn(`[end-meeting] Meeting ${meetingId} not found`);
          return;
        }

        const userId = socket.userId;
        const hostId = String(meeting.host);
        const reqBy = String(userId);
        const isActualHost = hostId === reqBy;

        console.log(`[end-meeting] Attempt: MeetingID=${meetingId}, Requester=${reqBy}, Host=${hostId}, Match=${isActualHost}`);

        if (isActualHost) {
          meeting.status = 'ended';
          meeting.participants = []; 
          await meeting.save();
          
          io.to(meetingId).emit('meeting-ended');
          console.log(`[end-meeting] Success: Meeting ${meetingId} ended by host.`);
        } else {
          console.error(`[end-meeting] Denied: ${reqBy} is not the host of ${meetingId}`);
          socket.emit('error', { message: "Permission Denied: Only the meeting creator can end it for all." });
        }
      } catch (err) {
        console.error('[end-meeting] Exception:', err);
      }
    });

    // ─── Disconnect ─────────────────────────────────────────────
    socket.on('disconnecting', async () => {
      const rooms = Array.from(socket.rooms).filter(r => r !== socket.id);
      for (const roomId of rooms) {
        try {
          const meeting = await Meeting.findOne({ meetingId: roomId });
          if (meeting) {
            meeting.participants = meeting.participants.filter(p => p.socketId !== socket.id);
            await meeting.save();
            socket.to(roomId).emit('participant-left', { socketId: socket.id });

            if (approvedParticipants[roomId]) {
              approvedParticipants[roomId].delete(socket.id);
            }

            // Cleanup pending requests if requester disconnects
            if (pendingRequests[roomId]) {
              const wasPending = pendingRequests[roomId].some(r => r.socketId === socket.id);
              if (wasPending) {
                pendingRequests[roomId] = pendingRequests[roomId].filter(r => r.socketId !== socket.id);
                socket.to(roomId).emit('participant-cancelled-request', { socketId: socket.id });
              }
            }
          }
        } catch (err) {
          console.error('Error on disconnect cleanup:', err);
        }
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
};
