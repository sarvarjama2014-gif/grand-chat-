const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const dbPath = process.env.DB_PATH || (process.env.NODE_ENV === 'production' ? '/tmp/grand-chat.db' : path.join(__dirname, '..', 'grand-chat.db'));
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT,
    password TEXT NOT NULL,
    displayName TEXT DEFAULT '',
    avatar TEXT DEFAULT '',
    bio TEXT DEFAULT '',
    isAdmin INTEGER DEFAULT 0,
    isBanned INTEGER DEFAULT 0,
      isOnline INTEGER DEFAULT 0,
      badges TEXT DEFAULT '[]',
      lastSeen TEXT,
      createdAt TEXT,
      updatedAt TEXT
  );
  CREATE TABLE IF NOT EXISTS chats (
    id TEXT PRIMARY KEY,
    participants TEXT NOT NULL,
    isGroup INTEGER DEFAULT 0,
    groupName TEXT DEFAULT '',
    groupAvatar TEXT DEFAULT '',
    groupAdmin TEXT,
    lastMessage TEXT,
    createdAt TEXT,
    updatedAt TEXT
  );
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    chatId TEXT NOT NULL,
    sender TEXT NOT NULL,
    content TEXT DEFAULT '',
    messageType TEXT DEFAULT 'text',
    fileUrl TEXT DEFAULT '',
    fileName TEXT DEFAULT '',
    fileSize INTEGER DEFAULT 0,
    readBy TEXT DEFAULT '[]',
    deliveredTo TEXT DEFAULT '[]',
    createdAt TEXT,
    updatedAt TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_messages_chatId ON messages(chatId);
`);

try {
  db.exec("ALTER TABLE users ADD COLUMN badges TEXT DEFAULT '[]'");
} catch (e) {}
try {
  db.exec("ALTER TABLE users ADD COLUMN isPremium INTEGER DEFAULT 0");
} catch (e) {}
try {
  db.exec("ALTER TABLE users ADD COLUMN premiumExpires TEXT");
} catch (e) {}

function rowToUser(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    username: row.username,
    email: row.email,
    password: row.password,
    displayName: row.displayName,
    avatar: row.avatar,
    bio: row.bio,
    isAdmin: !!row.isAdmin,
    isBanned: !!row.isBanned,
    isOnline: !!row.isOnline,
    isPremium: !!row.isPremium,
    premiumExpires: row.premiumExpires,
    badges: JSON.parse(row.badges || '[]'),
    lastSeen: row.lastSeen,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function sanitizeUser(user) {
  if (!user) return null;
  const { password, ...rest } = user;
  return rest;
}

function rowToChat(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    participants: JSON.parse(row.participants),
    isGroup: !!row.isGroup,
    groupName: row.groupName,
    groupAvatar: row.groupAvatar,
    groupAdmin: row.groupAdmin,
    lastMessage: row.lastMessage,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function rowToMessage(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    chat: row.chatId,
    chatId: row.chatId,
    sender: row.sender,
    content: row.content,
    messageType: row.messageType,
    fileUrl: row.fileUrl,
    fileName: row.fileName,
    fileSize: row.fileSize,
    readBy: JSON.parse(row.readBy),
    deliveredTo: JSON.parse(row.deliveredTo),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

const stmtFindUser = db.prepare('SELECT * FROM users WHERE id = ?');
const stmtFindUserByUsername = db.prepare('SELECT * FROM users WHERE username = ?');
const stmtFindByUsernameOrEmail = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?');
const stmtFindChat = db.prepare('SELECT * FROM chats WHERE id = ?');
const stmtFindMessage = db.prepare('SELECT * FROM messages WHERE id = ?');
const stmtAllUsersCount = db.prepare('SELECT COUNT(*) as count FROM users');
const stmtBannedUsersCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE isBanned = 1');
const stmtOnlineUsersCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE isOnline = 1');
const stmtAllChatsCount = db.prepare('SELECT COUNT(*) as count FROM chats');
const stmtGroupsCount = db.prepare('SELECT COUNT(*) as count FROM chats WHERE isGroup = 1');
const stmtAllMessagesCount = db.prepare('SELECT COUNT(*) as count FROM messages');
const stmtInsertUser = db.prepare('INSERT INTO users (id, username, email, password, displayName, isAdmin, badges, lastSeen, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
const stmtInsertChat = db.prepare('INSERT INTO chats (id, participants, isGroup, groupName, groupAdmin, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)');
const stmtInsertMessage = db.prepare('INSERT INTO messages (id, chatId, sender, content, messageType, fileUrl, fileName, fileSize, readBy, deliveredTo, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
const stmtDeleteUser = db.prepare('DELETE FROM users WHERE id = ?');
const stmtDeleteChat = db.prepare('DELETE FROM chats WHERE id = ?');
const stmtDeleteMessagesByChat = db.prepare('DELETE FROM messages WHERE chatId = ?');
const stmtDeleteMessagesBySender = db.prepare('DELETE FROM messages WHERE sender = ?');
const stmtCountMessages = db.prepare('SELECT COUNT(*) as count FROM messages WHERE chatId = ?');
const stmtCountUserMessages = db.prepare('SELECT COUNT(*) as count FROM messages WHERE sender = ?');
const stmtChatsByUser = db.prepare('SELECT * FROM chats WHERE participants LIKE ? ORDER BY updatedAt DESC');
const stmtMessagesByChat = db.prepare('SELECT * FROM messages WHERE chatId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?');
const stmtAllUsers = db.prepare('SELECT * FROM users ORDER BY createdAt DESC LIMIT ? OFFSET ?');
const stmtAllChats = db.prepare('SELECT * FROM chats ORDER BY updatedAt DESC LIMIT ? OFFSET ?');

const dbh = {
  findUser(id) {
    return sanitizeUser(rowToUser(stmtFindUser.get(id)));
  },

  findUserWithPassword(id) {
    return rowToUser(stmtFindUser.get(id));
  },

  findUserByUsername(username) {
    return rowToUser(stmtFindUserByUsername.get(username));
  },

  findUserByUsernameOrEmail(identifier) {
    return rowToUser(stmtFindByUsernameOrEmail.get(identifier, identifier));
  },

  searchUsers(query, excludeId, limit = 20) {
    const stmt = db.prepare('SELECT * FROM users WHERE id != ? AND (username LIKE ? OR displayName LIKE ?) LIMIT ?');
    const rows = stmt.all(excludeId, `%${query}%`, `%${query}%`, limit);
    return rows.map(row => sanitizeUser(rowToUser(row)));
  },

  createUser({ username, email, password, displayName, isAdmin }) {
    const id = uuidv4();
    const now = new Date().toISOString();
    const hashedPassword = bcrypt.hashSync(password, 10);
    stmtInsertUser.run(id, username, email || '', hashedPassword, displayName || username, isAdmin ? 1 : 0, '[]', now, now, now);
    return sanitizeUser(rowToUser(stmtFindUser.get(id)));
  },

  updateUser(id, updates) {
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(updates)) {
      if (key === 'password') {
        fields.push('password = ?');
        values.push(bcrypt.hashSync(value, 10));
      } else if (key === '_id' || key === 'id') {
        continue;
      } else if (key === 'isAdmin' || key === 'isBanned' || key === 'isOnline' || key === 'isPremium') {
        fields.push(`${key} = ?`);
        values.push(value ? 1 : 0);
      } else if (key === 'badges' || key === 'participants') {
        fields.push(`${key} = ?`);
        values.push(JSON.stringify(value));
      } else {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    if (fields.length === 0) return dbh.findUser(id);
    fields.push('updatedAt = ?');
    values.push(new Date().toISOString());
    values.push(id);
    db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return dbh.findUser(id);
  },

  deleteUser(id) {
    stmtDeleteUser.run(id);
  },

  getAllUsers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const rows = stmtAllUsers.all(limit, skip);
    return rows.map(row => sanitizeUser(rowToUser(row)));
  },

  countAllUsers() {
    return stmtAllUsersCount.get().count;
  },

  countBannedUsers() {
    return stmtBannedUsersCount.get().count;
  },

  countOnlineUsers() {
    return stmtOnlineUsersCount.get().count;
  },

  findChatById(id) {
    return rowToChat(stmtFindChat.get(id));
  },

  findChatsByUser(userId) {
    const rows = stmtChatsByUser.all(`%${userId}%`);
    return rows.map(rowToChat);
  },

  findExistingChat(userId1, userId2) {
    const rows = db.prepare('SELECT * FROM chats WHERE isGroup = 0 AND participants LIKE ? AND participants LIKE ?').all(`%${userId1}%`, `%${userId2}%`);
    return rows.find(row => {
      const parts = JSON.parse(row.participants);
      return parts.length === 2 && parts.includes(userId1) && parts.includes(userId2);
    }) || null;
  },

  createChat({ participants, isGroup, groupName, groupAdmin }) {
    const id = uuidv4();
    const now = new Date().toISOString();
    stmtInsertChat.run(id, JSON.stringify(participants), isGroup ? 1 : 0, groupName || '', groupAdmin || '', now, now);
    return rowToChat(stmtFindChat.get(id));
  },

  updateChat(id, updates) {
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(updates)) {
      if (key === '_id' || key === 'id') continue;
      if (key === 'participants') {
        fields.push('participants = ?');
        values.push(JSON.stringify(value));
      } else if (key === 'isGroup') {
        fields.push('isGroup = ?');
        values.push(value ? 1 : 0);
      } else {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    if (fields.length === 0) return dbh.findChatById(id);
    fields.push('updatedAt = ?');
    values.push(new Date().toISOString());
    values.push(id);
    db.prepare(`UPDATE chats SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return dbh.findChatById(id);
  },

  deleteChat(id) {
    stmtDeleteChat.run(id);
  },

  countAllChats() {
    return stmtAllChatsCount.get().count;
  },

  getAllChats(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const rows = stmtAllChats.all(limit, skip);
    return rows.map(rowToChat);
  },

  countGroups() {
    return stmtGroupsCount.get().count;
  },

  findMessageById(id) {
    return rowToMessage(stmtFindMessage.get(id));
  },

  findMessagesByChat(chatId, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const rows = stmtMessagesByChat.all(chatId, limit, skip);
    return rows.map(rowToMessage);
  },

  createMessage({ chatId, sender, content, messageType, fileUrl, fileName, fileSize, readBy, deliveredTo }) {
    const id = uuidv4();
    const now = new Date().toISOString();
    stmtInsertMessage.run(id, chatId, sender, content || '', messageType || 'text', fileUrl || '', fileName || '', fileSize || 0, JSON.stringify(readBy || []), JSON.stringify(deliveredTo || []), now, now);
    return rowToMessage(stmtFindMessage.get(id));
  },

  updateMessage(id, updates) {
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(updates)) {
      if (key === '_id' || key === 'id') continue;
      if (key === 'readBy' || key === 'deliveredTo') {
        fields.push(`${key} = ?`);
        values.push(JSON.stringify(value));
      } else {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    if (fields.length === 0) return dbh.findMessageById(id);
    fields.push('updatedAt = ?');
    values.push(new Date().toISOString());
    values.push(id);
    db.prepare(`UPDATE messages SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return dbh.findMessageById(id);
  },

  deleteMessagesByChat(chatId) {
    stmtDeleteMessagesByChat.run(chatId);
  },

  deleteMessagesBySender(senderId) {
    stmtDeleteMessagesBySender.run(senderId);
  },

  countMessages(chatId) {
    return stmtCountMessages.get(chatId).count;
  },

  countAllMessages() {
    return stmtAllMessagesCount.get().count;
  },

  countUserMessages(userId) {
    return stmtCountUserMessages.get(userId).count;
  },

  populateUsers(userIds) {
    if (!userIds || userIds.length === 0) return [];
    const placeholders = userIds.map(() => '?').join(',');
    const rows = db.prepare(`SELECT * FROM users WHERE id IN (${placeholders})`).all(...userIds);
    return rows.map(row => sanitizeUser(rowToUser(row)));
  },

  populateMessageSender(message) {
    if (!message) return null;
    const sender = dbh.findUser(message.sender);
    return { ...message, sender: sender || message.sender };
  },

  getChatsForUser(userId) {
    const chats = dbh.findChatsByUser(userId);
    return chats.map(chat => {
      const participants = dbh.populateUsers(chat.participants);
      let lastMessageData = null;
      if (chat.lastMessage) {
        lastMessageData = dbh.findMessageById(chat.lastMessage);
      }
      return { ...chat, participants, lastMessage: lastMessageData };
    });
  },

  getChatWithDetails(chatId) {
    const chat = rowToChat(stmtFindChat.get(chatId));
    if (!chat) return null;
    const participants = dbh.populateUsers(chat.participants);
    let lastMessageData = null;
    if (chat.lastMessage) {
      lastMessageData = dbh.findMessageById(chat.lastMessage);
    }
    return { ...chat, participants, lastMessage: lastMessageData };
  },

  getMessagesWithSender(chatId, page = 1, limit = 50) {
    const messages = dbh.findMessagesByChat(chatId, page, limit);
    return messages.map(msg => dbh.populateMessageSender(msg));
  },

  deleteUserAndData(userId) {
    const chats = dbh.findChatsByUser(userId);
    chats.forEach(chat => dbh.deleteChat(chat.id));
    dbh.deleteMessagesBySender(userId);
    dbh.deleteUser(userId);
  }
};

module.exports = dbh;
