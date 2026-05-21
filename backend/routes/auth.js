const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
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

    let user = db.findUserByUsername(username);
    if (user) {
      user = db.updateUser(user.id, {
        password,
        displayName: displayName || username,
        isAdmin: isOwner || user.isAdmin
      });
    } else {
      user = db.createUser({
        username,
        email,
        password,
        displayName: displayName || username,
        isAdmin: isOwner
      });
    }

    const token = generateToken(user.id);

    res.status(201).json({
      token,
      user
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    let { username, password } = req.body;
    username = username.replace(/^@/, '').trim().toLowerCase();

    const user = db.findUserByUsernameOrEmail(username);

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.isBanned) {
      return res.status(403).json({ message: 'Your account has been banned' });
    }

    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user.id);
    const { password: _, ...userData } = user;

    res.json({
      token,
      user: userData
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
    db.updateUser(req.user.id, { lastSeen: new Date().toISOString() });
    res.json({ message: 'Logged out' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
