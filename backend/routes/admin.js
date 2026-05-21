const express = require('express');
const db = require('../config/database');
const { protect, ownerOnly } = require('../middleware/auth');

const router = express.Router();

router.use(protect, ownerOnly);

router.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;

    const users = db.getAllUsers(page, limit);
    const total = db.countAllUsers();

    res.json({ users, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/ban/:id', async (req, res) => {
  try {
    const user = db.findUser(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.username === process.env.OWNER_USERNAME) {
      return res.status(400).json({ message: 'Cannot ban the owner' });
    }

    const updated = db.updateUser(user.id, { isBanned: !user.isBanned });

    res.json({ message: `User ${updated.isBanned ? 'banned' : 'unbanned'} successfully`, user: updated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/user/:id', async (req, res) => {
  try {
    const user = db.findUser(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.username === process.env.OWNER_USERNAME) {
      return res.status(400).json({ message: 'Cannot delete the owner' });
    }

    db.deleteUserAndData(user.id);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const totalUsers = db.countAllUsers();
    const bannedUsers = db.countBannedUsers();
    const totalChats = db.countAllChats();
    const totalMessages = db.countAllMessages();
    const onlineUsers = db.countOnlineUsers();
    const groups = db.countGroups();

    res.json({
      totalUsers,
      bannedUsers,
      totalChats,
      totalMessages,
      onlineUsers,
      groups
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/user-activity/:id', async (req, res) => {
  try {
    const user = db.findUser(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const messageCount = db.countUserMessages(user.id);
    const chatCount = db.findChatsByUser(user.id).length;

    res.json({
      user,
      stats: {
        totalMessages: messageCount,
        totalChats: chatCount,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
