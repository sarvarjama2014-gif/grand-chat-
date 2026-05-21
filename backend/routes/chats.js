const express = require('express');
const db = require('../config/database');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const chats = db.getChatsForUser(req.user.id);
    res.json(chats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const { participantId } = req.body;

    const existingChat = db.findExistingChat(req.user.id, participantId);
    if (existingChat) {
      const populated = db.getChatWithDetails(existingChat.id);
      return res.json(populated);
    }

    const chat = db.createChat({
      participants: [req.user.id, participantId]
    });

    const populatedChat = db.getChatWithDetails(chat.id);

    res.status(201).json(populatedChat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/group', protect, async (req, res) => {
  try {
    const { groupName, participants } = req.body;

    const allParticipants = [...new Set([...participants, req.user.id])];

    const chat = db.createChat({
      participants: allParticipants,
      isGroup: true,
      groupName,
      groupAdmin: req.user.id
    });

    const populatedChat = db.getChatWithDetails(chat.id);

    res.status(201).json(populatedChat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/group/:id', protect, async (req, res) => {
  try {
    const chat = db.findChatById(req.params.id);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    if (!chat.isGroup) return res.status(400).json({ message: 'Not a group' });

    const updates = {};
    if (req.body.groupName) updates.groupName = req.body.groupName;
    if (req.body.participants) updates.participants = req.body.participants;

    db.updateChat(chat.id, updates);

    const populatedChat = db.getChatWithDetails(chat.id);

    res.json(populatedChat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    const chat = db.findChatById(req.params.id);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    if (!chat.participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Not a participant' });
    }

    db.deleteMessagesByChat(chat.id);
    db.deleteChat(chat.id);

    res.json({ message: 'Chat deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
