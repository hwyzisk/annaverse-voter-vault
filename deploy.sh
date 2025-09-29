#!/bin/bash

# AnnaVerse Production Deployment Script
# This script automates the full deployment process

set -e  # Exit on any error

echo "🚀 Starting AnnaVerse deployment..."
echo "================================="

# Step 1: Pull latest code
echo "📥 Pulling latest code from main branch..."
git pull origin main

# Step 2: Stop containers
echo "⏹️  Stopping containers..."
docker compose down

# Step 3: Build with no cache
echo "🔨 Building containers (no cache)..."
docker compose build --no-cache app

# Step 4: Start containers
echo "▶️  Starting containers..."
docker compose up -d

# Step 5: Show status
echo "📊 Container status:"
docker compose ps

echo ""
echo "✅ Deployment complete!"
echo "🔍 To view logs: docker compose logs -f app"
echo "🌐 Site should be available at: https://annaverseapp.com"