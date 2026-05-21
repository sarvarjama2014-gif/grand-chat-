const express = require('express');
const db = require('../config/database');
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
    const chat = db.findChatById(req.params.chatId);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    if (!chat.participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Not a participant' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = 50;

    const messages = db.getMessagesWithSender(req.params.chatId, page, limit);
    const total = db.countMessages(req.params.chatId);

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

    const chat = db.findChatById(chatId);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    if (!chat.participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Not a participant' });
    }

    const messageData = {
      chatId,
      sender: req.user.id,
      content: content || '',
      messageType: messageType || 'text',
      readBy: [req.user.id],
      deliveredTo: [req.user.id]
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

    const message = db.createMessage(messageData);

    db.updateChat(chatId, { lastMessage: message.id });

    const populatedMessage = db.populateMessageSender(message);

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/read/:messageId', protect, async (req, res) => {
  try {
    const message = db.findMessageById(req.params.messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    if (!message.readBy.includes(req.user.id)) {
      message.readBy.push(req.user.id);
      db.updateMessage(message.id, { readBy: message.readBy });
    }

    res.json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/delivered/:messageId', protect, async (req, res) => {
  try {
    const message = db.findMessageById(req.params.messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    if (!message.deliveredTo.includes(req.user.id)) {
      message.deliveredTo.push(req.user.id);
      db.updateMessage(message.id, { deliveredTo: message.deliveredTo });
    }

    res.json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/chat/:chatId', protect, async (req, res) => {
  try {
    const chat = db.findChatById(req.params.chatId);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    if (!chat.participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Not a participant' });
    }

    db.deleteMessagesByChat(chat.id);
    db.updateChat(chat.id, { lastMessage: null });

    res.json({ message: 'Chat cleared' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
