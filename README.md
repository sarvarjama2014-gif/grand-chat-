# Grand Chat

A full-featured messaging platform inspired by Telegram, built with the MERN stack (MongoDB, Express, React, Node.js) with real-time communication via Socket.io.

## Features

- **User Authentication** - Register/login with username/email + JWT
- **Real-time Messaging** - Instant message delivery via WebSocket
- **Private Chats** - 1-on-1 conversations
- **Group Chats** - Create and manage group conversations
- **File Sharing** - Send images, videos, documents, and voice messages
- **Voice Calls** - WebRTC-based audio calls with mic toggle
- **Dark/Light Themes** - Telegram-like interface with theme switching
- **User Search** - Find users by username
- **Online Status** - See who's online and message read/delivered status
- **Admin Panel** - Owner-only panel for user management, bans, and analytics
- **Responsive Design** - Works on desktop and mobile

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express |
| Database | MongoDB + Mongoose |
| Real-time | Socket.io |
| Auth | JWT + bcrypt |
| File Upload | Multer (local storage) |
| Calls | WebRTC signaling |

## Prerequisites

- Node.js v16+
- MongoDB (local or Atlas)
- npm or yarn

## Setup Instructions

### 1. Clone and Install

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment

Edit `backend/.env`:

```
PORT=5000
MONGO_URI=mongodb://localhost:27017/grandchat
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRE=30d
UPLOAD_PATH=uploads
OWNER_USERNAME=grandadmin
```

> The user registered with username `grandadmin` will automatically be the owner/admin.

### 3. Start MongoDB

Make sure MongoDB is running locally:

```bash
# If installed locally
mongod

# Or using Docker
docker run -d -p 27017:27017 --name mongo mongo:7
```

### 4. Run the Application

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 5. Open in Browser

Visit **http://localhost:5173**

### 6. Create Owner Account

1. Register with username: `grandadmin`
2. You'll automatically get admin/owner privileges
3. Access the admin panel via the gear icon in the sidebar

## Project Structure

```
Grand Chat/
├── backend/
│   ├── config/        # Database config
│   ├── middleware/     # Auth & admin middleware
│   ├── models/        # Mongoose models
│   ├── routes/        # API routes
│   ├── socket/        # Socket.io handlers
│   └── server.js      # Entry point
├── frontend/
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── context/     # React contexts (Auth, Theme, Socket)
│   │   ├── pages/       # Page components
│   │   └── utils/       # API client
│   └── index.html
└── README.md
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users/search?q=query` - Search users
- `GET /api/users/profile/:id` - Get user profile
- `PUT /api/users/profile` - Update profile
- `PUT /api/users/avatar` - Upload avatar

### Chats
- `GET /api/chats` - Get all user chats
- `POST /api/chats` - Create or get private chat
- `POST /api/chats/group` - Create group chat
- `PUT /api/chats/group/:id` - Update group

### Messages
- `GET /api/messages/:chatId` - Get messages (paginated)
- `POST /api/messages` - Send message (text/file)
- `PUT /api/messages/read/:messageId` - Mark as read
- `PUT /api/messages/delivered/:messageId` - Mark as delivered

### Admin (owner only)
- `GET /api/admin/users` - List all users
- `GET /api/admin/stats` - Get platform statistics
- `PUT /api/admin/ban/:id` - Toggle user ban
- `DELETE /api/admin/user/:id` - Delete user
- `GET /api/admin/user-activity/:id` - Get user activity

## License

MIT
