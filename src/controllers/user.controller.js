const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ _id: userId }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' });
  const refreshToken = jwt.sign({ _id: userId }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

exports.register = async (req, res) => {
  try {
    const { username, email, fullname, password } = req.body;
    
    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) return res.status(400).json({ success: false, message: "User already exists" });

    const avatarPath = req.files?.avatar ? req.files.avatar[0].path : "";
    const coverPath = req.files?.coverimage ? req.files.coverimage[0].path : "";

    const user = await User.create({
      username, email, fullname, password,
      avatar: avatarPath, coverImage: coverPath
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    res.status(201).json({ success: true, data: createdUser });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const isMatch = await user.isPasswordCorrect(password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const { accessToken, refreshToken } = generateTokens(user._id);
    user.refreshToken = refreshToken;
    await user.save();

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    res.status(200).json({
      success: true,
      data: { user: loggedInUser, accessToken, refreshToken }
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Internal Server Error during login",
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    });
  }
};

exports.logout = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1 } });
    res.status(200).json({ success: true, message: "Logged out" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProfile = async (req, res) => {
  res.status(200).json({ success: true, data: req.user });
};

exports.updateAccountDetails = async (req, res) => {
  try {
    const { fullname } = req.body;
    const updateData = {};
    if (fullname) updateData.fullname = fullname;
    
    if (req.files?.avatar) {
      updateData.avatar = req.files.avatar[0].path;
    }
    
    if (req.files?.coverImage) {
      updateData.coverImage = req.files.coverImage[0].path;
    }

    const user = await User.findByIdAndUpdate(
      req.user?._id,
      { $set: updateData },
      { new: true }
    ).select("-password -refreshToken");

    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.changeCurrentPassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user?._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
      return res.status(400).json({ success: false, message: "Invalid old password" });
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
