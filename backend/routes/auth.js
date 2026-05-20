const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

router.post('/register', async (req, res) => {
  try {
    let { username, email, password, displayName } = req.body;
    username = username.replace(/^@/, '').trim().toLowerCase();
    email = email.toLowerCase().trim();

    const isOwner = username === process.env.OWNER_USERNAME;

    let user = await User.findOne({ username });
    if (user) {
      user.password = password;
      user.displayName = displayName || username;
      user.isAdmin = isOwner || user.isAdmin;
      await user.save();
    } else {
      user = await User.create({
        username,
        email,
        password,
        displayName: displayName || username,
        isAdmin: isOwner
      });
    }

    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: user.toJSON()
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    let { username, password } = req.body;
    username = username.replace(/^@/, '').trim().toLowerCase();

    const user = await User.findOne({
      $or: [{ username }, { email: username }]
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.isBanned) {
      return res.status(403).json({ message: 'Your account has been banned' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id);

    res.json({
      token,
      user: user.toJSON()
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/me', protect, async (req, res) => {
  res.json(req.user);
});

router.post('/logout', protect, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { lastSeen: new Date() });
    res.json({ message: 'Logged out' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
