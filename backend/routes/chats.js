const express = require('express');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: req.user._id
    })
      .populate('participants', '-password')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

    res.json(chats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const { participantId } = req.body;

    const existingChat = await Chat.findOne({
      isGroup: false,
      participants: { $all: [req.user._id, participantId], $size: 2 }
    }).populate('participants', '-password');

    if (existingChat) {
      return res.json(existingChat);
    }

    const chat = await Chat.create({
      participants: [req.user._id, participantId]
    });

    const populatedChat = await Chat.findById(chat._id)
      .populate('participants', '-password');

    res.status(201).json(populatedChat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/group', protect, async (req, res) => {
  try {
    const { groupName, participants } = req.body;

    const allParticipants = [...new Set([...participants, req.user._id.toString()])];

    const chat = await Chat.create({
      participants: allParticipants,
      isGroup: true,
      groupName,
      groupAdmin: req.user._id
    });

    const populatedChat = await Chat.findById(chat._id)
      .populate('participants', '-password');

    res.status(201).json(populatedChat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/group/:id', protect, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    if (!chat.isGroup) return res.status(400).json({ message: 'Not a group' });

    if (req.body.groupName) chat.groupName = req.body.groupName;
    if (req.body.participants) chat.participants = req.body.participants;

    await chat.save();

    const populatedChat = await Chat.findById(chat._id)
      .populate('participants', '-password');

    res.json(populatedChat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    if (!chat.participants.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not a participant' });
    }

    await Message.deleteMany({ chat: chat._id });
    await Chat.findByIdAndDelete(chat._id);

    res.json({ message: 'Chat deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
