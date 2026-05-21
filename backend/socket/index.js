const jwt = require('jsonwebtoken');
const db = require('../config/database');

const onlineUsers = new Map();

const setupSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = db.findUser(decoded.id);
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
    onlineUsers.set(user.id, socket.id);

    db.updateUser(user.id, { isOnline: true, lastSeen: new Date().toISOString() });

    socket.join(user.id);

    io.emit('user-status', { userId: user.id, isOnline: true });

    const chats = db.findChatsByUser(user.id);
    chats.forEach(chat => {
      socket.join(`chat_${chat.id}`);
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

        const chat = db.findChatById(chatId);
        if (!chat || !chat.participants.includes(user.id)) {
          return callback({ error: 'Not a participant' });
        }

        const message = db.createMessage({
          chatId,
          sender: user.id,
          content: content || '',
          messageType: messageType || 'text',
          readBy: [user.id],
          deliveredTo: [user.id]
        });

        db.updateChat(chatId, { lastMessage: message.id });

        const populatedMessage = db.populateMessageSender(message);

        chat.participants.forEach(participantId => {
          if (participantId !== user.id) {
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
        const message = db.findMessageById(messageId);
        if (message && !message.readBy.includes(user.id)) {
          message.readBy.push(user.id);
          db.updateMessage(message.id, { readBy: message.readBy });
          io.to(`chat_${message.chat}`).emit('message-read', {
            messageId,
            userId: user.id
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
        userId: user.id,
        username: user.username
      });
    });

    socket.on('stop-typing', (data) => {
      const { chatId } = data;
      socket.to(`chat_${chatId}`).emit('user-stop-typing', {
        chatId,
        userId: user.id
      });
    });

    socket.on('call-user', (data) => {
      const { to, signal } = data;
      const targetSocketId = onlineUsers.get(to);
      if (targetSocketId) {
        io.to(targetSocketId).emit('incoming-call', {
          from: user.id,
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
        io.to(targetSocketId).emit('call-rejected', { from: user.id });
      }
    });

    socket.on('end-call', (data) => {
      const { to } = data;
      const targetSocketId = onlineUsers.get(to);
      if (targetSocketId) {
        io.to(targetSocketId).emit('call-ended', { from: user.id });
      }
    });

    socket.on('ice-candidate', (data) => {
      const { to, candidate } = data;
      const targetSocketId = onlineUsers.get(to);
      if (targetSocketId) {
        io.to(targetSocketId).emit('ice-candidate', { from: user.id, candidate });
      }
    });

    socket.on('new-message', async (data) => {
      const { chatId, message } = data;
      if (!chatId || !message) return;
      try {
        const chat = db.findChatById(chatId);
        if (chat) {
          chat.participants.forEach(pid => {
            if (pid !== user.id) {
              const targetSocketId = onlineUsers.get(pid);
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
        io.to(targetSocketId).emit('mic-toggle', { from: user.id, muted });
      }
    });

    socket.on('disconnect', async () => {
      onlineUsers.delete(user.id);
      db.updateUser(user.id, { isOnline: false, lastSeen: new Date().toISOString() });
      io.emit('user-status', { userId: user.id, isOnline: false });
    });
  });
};

module.exports = setupSocket;
