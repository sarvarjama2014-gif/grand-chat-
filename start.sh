#!/bin/bash

echo "================================"
echo "  Grand Chat - Starting..."
echo "================================"

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Build frontend if not built
if [ ! -d "$PROJECT_DIR/frontend/dist" ]; then
  echo "[1/3] Building Frontend..."
  cd "$PROJECT_DIR/frontend"
  npx vite build > /dev/null 2>&1
  echo "  Frontend built"
fi

# 1. Start MongoDB
echo "[1/3] Starting MongoDB..."
MONGO_PATH="$HOME/mongodb/bin/mongod"
if [ -f "$MONGO_PATH" ]; then
  nohup "$MONGO_PATH" --dbpath "$HOME/mongodb/data" --port 27017 > "$HOME/mongodb/mongod.log" 2>&1 &
  MONGO_PID=$!
  echo "  MongoDB PID: $MONGO_PID"
else
  echo "  MongoDB not found at $MONGO_PATH"
fi

# 2. Start Backend (also serves frontend)
echo "[2/3] Starting Backend..."
cd "$PROJECT_DIR/backend"
nohup node server.js > "$HOME/grand-chat-backend.log" 2>&1 &
BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID"

echo ""
echo "================================"
echo "  Grand Chat is running!"
echo "  Open: http://localhost:5001"
echo "================================"
echo ""
echo "To stop: kill $MONGO_PID $BACKEND_PID"
