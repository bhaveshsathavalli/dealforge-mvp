#!/bin/bash
# Clean startup script for the web app

echo "🧹 Cleaning up ports..."
lsof -ti:3000,3001 | xargs kill -9 2>/dev/null || echo "No processes to kill"

echo "🚀 Starting development server on port 3000..."
npm run dev
