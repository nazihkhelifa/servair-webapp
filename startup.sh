#!/bin/bash
# Startup script for Azure App Service
# This script is used when deploying Next.js standalone build

# Set default PORT if not provided by Azure
export PORT=${PORT:-8080}

# If standalone build exists (from deployment), use it
if [ -d ".next/standalone" ]; then
  echo "Starting from standalone build..."
  cd .next/standalone
  node server.js
else
  echo "No standalone build found, using regular Next.js start..."
  npm run start
fi
