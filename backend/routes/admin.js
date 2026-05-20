const express = require('express');
const User = require('../models/User');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const { protect, ownerOnly } = require('../middleware/auth');

const router = express.Router();

router.use(protect, ownerOnly);

router.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const users = await User.find({})
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments({});

    res.json({ users, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/ban/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.username === process.env.OWNER_USERNAME) {
      return res.status(400).json({ message: 'Cannot ban the owner' });
    }

    user.isBanned = !user.isBanned;
    await user.save();

    res.json({ message: `User ${user.isBanned ? 'banned' : 'unbanned'} successfully`, user: user.toJSON() });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/user/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.username === process.env.OWNER_USERNAME) {
      return res.status(400).json({ message: 'Cannot delete the owner' });
    }

    await Chat.deleteMany({ participants: user._id });
    await Message.deleteMany({ sender: user._id });
    await User.findByIdAndDelete(user._id);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({});
    const bannedUsers = await User.countDocuments({ isBanned: true });
    const totalChats = await Chat.countDocuments({});
    const totalMessages = await Message.countDocuments({});
    const onlineUsers = await User.countDocuments({ isOnline: true });
    const groups = await Chat.countDocuments({ isGroup: true });

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
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const messageCount = await Message.countDocuments({ sender: user._id });
    const chatCount = await Chat.countDocuments({ participants: user._id });

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
