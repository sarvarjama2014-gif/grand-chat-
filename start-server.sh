#!/bin/bash
cd "$(dirname "$0")"
nohup node backend/server.js > /tmp/grandchat-server.log 2>&1 &
nohup npx localtunnel --port 5001 > /tmp/grandchat-tunnel.log 2>&1 &
echo "Grand Chat started on http://localhost:5001"
echo "Check /tmp/grandchat-tunnel.log for public URL"
