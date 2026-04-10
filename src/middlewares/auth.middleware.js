const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

exports.verifyJWT = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ success: false, message: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decoded?._id).select("-password -refreshToken");

    if (!user) return res.status(401).json({ success: false, message: "Invalid access token" });

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: error.message || "Invalid token" });
  }
};
