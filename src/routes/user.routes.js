const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { register, login, logout, getProfile } = require('../controllers/user.controller');
const { verifyJWT } = require('../middlewares/auth.middleware');

// Ensure upload directory exists (with try-catch for Vercel read-only FS)
const uploadDir = process.env.VERCEL ? '/tmp/uploads' : 'uploads/';
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (error) {
  console.warn('Could not create upload directory:', error.message);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
});

const upload = multer({ storage });

router.post('/register', upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'coverimage', maxCount: 1 }
]), register);

router.post('/login', login);
router.post('/logout', verifyJWT, logout);
router.get('/profile', verifyJWT, getProfile);

// Update routes
router.put('/profile', verifyJWT, upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 }
]), require('../controllers/user.controller').updateAccountDetails);

router.put('/change-password', verifyJWT, require('../controllers/user.controller').changeCurrentPassword);

module.exports = router;
