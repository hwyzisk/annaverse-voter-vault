#!/bin/bash

# Production Deployment Script
# This script safely deploys changes to production including database migrations

echo "🚀 Starting production deployment..."

# Step 1: Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# Step 2: Stop containers
echo "⏹️ Stopping containers..."
docker compose down

# Step 3: Build and start containers
echo "🔨 Building and starting containers..."
docker compose up -d --build

# Step 4: Wait for containers to be ready
echo "⏳ Waiting for containers to start..."
sleep 30

# Step 5: Run database migration
echo "🗄️ Running database migration..."
docker compose exec app node scripts/run-migration.js

# Step 6: Verify deployment
echo "✅ Verifying deployment..."
docker compose ps

echo "🎉 Production deployment complete!"
echo ""
echo "Next steps:"
echo "1. Import fresh Excel data to get full voter IDs"
echo "2. Verify voter ID field shows full numbers"
echo "3. Confirm no voter IDs appear in nicknames"