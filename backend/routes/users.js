const express = require('express');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_PATH || 'uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.get('/search', protect, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);

    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } },
        {
          $or: [
            { username: { $regex: q, $options: 'i' } },
            { displayName: { $regex: q, $options: 'i' } }
          ]
        }
      ]
    }).select('-password').limit(20);

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/profile/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/profile', protect, async (req, res) => {
  try {
    const { displayName, bio } = req.body;
    const user = await User.findById(req.user._id);

    if (displayName) user.displayName = displayName;
    if (bio !== undefined) user.bio = bio;

    await user.save();
    res.json(user.toJSON());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/avatar', protect, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const user = await User.findById(req.user._id);
    user.avatar = `/uploads/${req.file.filename}`;
    await user.save();
    res.json({ avatar: user.avatar });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
