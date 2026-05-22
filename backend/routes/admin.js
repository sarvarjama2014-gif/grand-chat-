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

router.get('/chats', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const chats = db.getAllChats(page, limit);
    const total = db.countAllChats();
    const chatsWithUsers = chats.map(chat => {
      const participants = db.populateUsers(chat.participants);
      let lastMessageData = null;
      if (chat.lastMessage) {
        lastMessageData = db.findMessageById(chat.lastMessage);
      }
      return { ...chat, participants, lastMessage: lastMessageData };
    });
    res.json({ chats: chatsWithUsers, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/chat-messages/:chatId', async (req, res) => {
  try {
    const chat = db.findChatById(req.params.chatId);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    const messages = db.getMessagesWithSender(req.params.chatId, 1, 100);
    const participants = db.populateUsers(chat.participants);
    res.json({ chat: { ...chat, participants }, messages: messages.reverse() });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/badges/:id', async (req, res) => {
  try {
    const { badges } = req.body;
    const user = db.findUser(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const updated = db.updateUser(user.id, { badges: badges || [] });
    res.json({ message: 'Badges updated', user: updated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/reset-badges', async (req, res) => {
  try {
    const users = db.getAllUsers(1, 10000);
    let cleared = 0;
    for (const u of users) {
      if (u.badges && u.badges.length > 0) {
        db.updateUser(u.id, { badges: [] });
        cleared++;
      }
    }
    res.json({ message: `Cleared badges from ${cleared} users` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
