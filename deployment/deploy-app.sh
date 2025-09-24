#!/bin/bash

# AnnaVerse Application Deployment Script
# Run this after server-setup.sh completes
# Usage: ./deploy-app.sh <github-repo-url>

set -e  # Exit on any error

if [ $# -eq 0 ]; then
    echo "Usage: $0 <github-repo-url>"
    echo "Example: $0 https://github.com/yourusername/annaverse-voter-vault.git"
    exit 1
fi

REPO_URL=$1
APP_DIR="/opt/annaverse"

echo "🚀 Deploying AnnaVerse application..."

# Navigate to application directory
cd $APP_DIR

# Clone repository if it doesn't exist, otherwise pull latest
if [ ! -d ".git" ]; then
    echo "📥 Cloning repository..."
    git clone $REPO_URL .
else
    echo "📥 Pulling latest changes..."
    git pull origin main
fi

# Install dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Create production environment file
echo "⚙️ Creating production environment file..."
cat > .env.production << EOF
# Database Configuration
DATABASE_URL=postgresql://annaverse_user:AnnaVerse2024!Secure@localhost:5432/annaverse

# Session Configuration - CHANGE THIS TO A SECURE RANDOM STRING
SESSION_SECRET=$(openssl rand -hex 32)

# Production Configuration
NODE_ENV=production
PORT=5000

# Email Configuration (optional - add your SendGrid API key)
# SENDGRID_API_KEY=your_sendgrid_api_key_here

# Optional: Replit Auth (only if migrating from Replit)
# REPLIT_DB_URL=your_replit_db_url_here
EOF

echo "⚙️ Environment file created at .env.production"
echo "📝 Please edit .env.production to add your SendGrid API key if needed"

# Build the application
echo "🔨 Building application..."
npm run build

# Initialize database schema
echo "🗄️ Initializing database schema..."
NODE_ENV=production npm run db:push

# Stop existing PM2 process if running
echo "🔄 Managing PM2 processes..."
pm2 delete annaverse || true

# Start application with PM2
echo "🚀 Starting application with PM2..."
pm2 start dist/index.js --name "annaverse" --env production

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup

echo "✅ Application deployment complete!"
echo ""
echo "📊 Application Status:"
pm2 status
echo ""
echo "📝 Next steps:"
echo "1. Configure Nginx (run setup-nginx.sh)"
echo "2. Setup SSL certificate"
echo "3. Update DNS to point to your server IP"
echo ""
echo "🔍 Useful commands:"
echo "  pm2 status          - Check application status"
echo "  pm2 logs annaverse  - View application logs"
echo "  pm2 restart annaverse - Restart application"