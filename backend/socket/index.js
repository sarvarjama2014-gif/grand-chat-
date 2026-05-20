const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const Chat = require('../models/Chat');

const onlineUsers = new Map();

const setupSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return next(new Error('User not found'));
      }
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    const user = socket.user;
    onlineUsers.set(user._id.toString(), socket.id);

    await User.findByIdAndUpdate(user._id, { isOnline: true, lastSeen: new Date() });

    socket.join(user._id.toString());

    io.emit('user-status', { userId: user._id, isOnline: true });

    const chats = await Chat.find({ participants: user._id });
    chats.forEach(chat => {
      socket.join(`chat_${chat._id}`);
    });

    socket.on('join-chat', (chatId) => {
      socket.join(`chat_${chatId}`);
    });

    socket.on('leave-chat', (chatId) => {
      socket.leave(`chat_${chatId}`);
    });

    socket.on('send-message', async (data, callback) => {
      try {
        const { chatId, content, messageType } = data;

        const chat = await Chat.findById(chatId);
        if (!chat || !chat.participants.includes(user._id)) {
          return callback({ error: 'Not a participant' });
        }

        const message = await Message.create({
          chat: chatId,
          sender: user._id,
          content: content || '',
          messageType: messageType || 'text',
          readBy: [user._id],
          deliveredTo: [user._id]
        });

        chat.lastMessage = message._id;
        await chat.save();

        const populatedMessage = await Message.findById(message._id)
          .populate('sender', 'username displayName avatar');

        chat.participants.forEach(participantId => {
          if (participantId.toString() !== user._id.toString()) {
            io.to(`user_${participantId}`).emit('new-message', {
              message: populatedMessage,
              chatId
            });
          }
        });

        io.to(`chat_${chatId}`).emit('message-received', populatedMessage);

        callback({ success: true, message: populatedMessage });
      } catch (error) {
        callback({ error: error.message });
      }
    });

    socket.on('mark-read', async (data) => {
      try {
        const { messageId } = data;
        const message = await Message.findById(messageId);
        if (message && !message.readBy.includes(user._id)) {
          message.readBy.push(user._id);
          await message.save();
          io.to(`chat_${message.chat}`).emit('message-read', {
            messageId,
            userId: user._id
          });
        }
      } catch (error) {
        console.error('Mark read error:', error);
      }
    });

    socket.on('typing', (data) => {
      const { chatId } = data;
      socket.to(`chat_${chatId}`).emit('user-typing', {
        chatId,
        userId: user._id,
        username: user.username
      });
    });

    socket.on('stop-typing', (data) => {
      const { chatId } = data;
      socket.to(`chat_${chatId}`).emit('user-stop-typing', {
        chatId,
        userId: user._id
      });
    });

    socket.on('call-user', (data) => {
      const { to, signal } = data;
      const targetSocketId = onlineUsers.get(to);
      if (targetSocketId) {
        io.to(targetSocketId).emit('incoming-call', {
          from: user._id,
          fromUsername: user.username,
          fromDisplayName: user.displayName,
          fromAvatar: user.avatar,
          signal
        });
      }
    });

    socket.on('accept-call', (data) => {
      const { to, signal } = data;
      const targetSocketId = onlineUsers.get(to);
      if (targetSocketId) {
        io.to(targetSocketId).emit('call-accepted', { signal });
      }
    });

    socket.on('reject-call', (data) => {
      const { to } = data;
      const targetSocketId = onlineUsers.get(to);
      if (targetSocketId) {
        io.to(targetSocketId).emit('call-rejected', { from: user._id });
      }
    });

    socket.on('end-call', (data) => {
      const { to } = data;
      const targetSocketId = onlineUsers.get(to);
      if (targetSocketId) {
        io.to(targetSocketId).emit('call-ended', { from: user._id });
      }
    });

    socket.on('ice-candidate', (data) => {
      const { to, candidate } = data;
      const targetSocketId = onlineUsers.get(to);
      if (targetSocketId) {
        io.to(targetSocketId).emit('ice-candidate', { from: user._id, candidate });
      }
    });

    socket.on('new-message', async (data) => {
      const { chatId, message } = data;
      if (!chatId || !message) return;
      try {
        const chat = await Chat.findById(chatId);
        if (chat) {
          chat.participants.forEach(pid => {
            if (pid.toString() !== user._id.toString()) {
              const targetSocketId = onlineUsers.get(pid.toString());
              if (targetSocketId) {
                io.to(targetSocketId).emit('message-received', message);
              }
            }
          });
        }
      } catch (e) {
        console.error('new-message relay error:', e);
      }
    });

    socket.on('toggle-mic', (data) => {
      const { to, muted } = data;
      const targetSocketId = onlineUsers.get(to);
      if (targetSocketId) {
        io.to(targetSocketId).emit('mic-toggle', { from: user._id, muted });
      }
    });

    socket.on('disconnect', async () => {
      onlineUsers.delete(user._id.toString());
      await User.findByIdAndUpdate(user._id, { isOnline: false, lastSeen: new Date() });
      io.emit('user-status', { userId: user._id, isOnline: false });
    });
  });
};

module.exports = setupSocket;
