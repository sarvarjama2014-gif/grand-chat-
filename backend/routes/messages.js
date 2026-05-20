const express = require('express');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
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
  limits: { fileSize: 50 * 1024 * 1024 }
});

router.get('/:chatId', protect, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    if (!chat.participants.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not a participant' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = 50;
    const skip = (page - 1) * limit;

    const messages = await Message.find({ chat: req.params.chatId })
      .populate('sender', 'username displayName avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Message.countDocuments({ chat: req.params.chatId });

    res.json({
      messages: messages.reverse(),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', protect, upload.single('file'), async (req, res) => {
  try {
    const { chatId, content, messageType } = req.body;

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    if (!chat.participants.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not a participant' });
    }

    const messageData = {
      chat: chatId,
      sender: req.user._id,
      content: content || '',
      messageType: messageType || 'text',
      readBy: [req.user._id],
      deliveredTo: [req.user._id]
    };

    if (req.file) {
      messageData.fileUrl = `/uploads/${req.file.filename}`;
      messageData.fileName = req.file.originalname;
      messageData.fileSize = req.file.size;

      if (req.file.mimetype.startsWith('image/')) messageData.messageType = 'image';
      else if (req.file.mimetype.startsWith('video/')) messageData.messageType = 'video';
      else if (req.file.mimetype.startsWith('audio/')) messageData.messageType = 'voice';
      else if (messageType === 'sticker') messageData.messageType = 'sticker';
      else messageData.messageType = 'file';
    }

    const message = await Message.create(messageData);

    chat.lastMessage = message._id;
    await chat.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'username displayName avatar');

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/read/:messageId', protect, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    if (!message.readBy.includes(req.user._id)) {
      message.readBy.push(req.user._id);
      await message.save();
    }

    res.json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/delivered/:messageId', protect, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    if (!message.deliveredTo.includes(req.user._id)) {
      message.deliveredTo.push(req.user._id);
      await message.save();
    }

    res.json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/chat/:chatId', protect, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    if (!chat.participants.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not a participant' });
    }

    await Message.deleteMany({ chat: chat._id });

    chat.lastMessage = null;
    await chat.save();

    res.json({ message: 'Chat cleared' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
