#!/bin/bash

# AnnaVerse Server Setup Script for SSD Nodes
# Run this script on your Ubuntu server as root or with sudo

set -e  # Exit on any error

echo "🚀 Starting AnnaVerse deployment on SSD Nodes..."

# Update system packages
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install required packages
echo "📦 Installing required packages..."
apt install -y curl wget git nginx ufw postgresql postgresql-contrib

# Install Node.js 20.x
echo "📦 Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install PM2 globally
echo "📦 Installing PM2 process manager..."
npm install -g pm2

# Configure firewall
echo "🔒 Configuring firewall..."
ufw allow ssh
ufw allow 80
ufw allow 443
ufw --force enable

# Setup PostgreSQL
echo "🗄️ Setting up PostgreSQL..."
systemctl start postgresql
systemctl enable postgresql

# Create database and user
echo "🗄️ Creating database and user..."
sudo -u postgres psql -c "CREATE DATABASE annaverse;"
sudo -u postgres psql -c "CREATE USER annaverse_user WITH ENCRYPTED PASSWORD 'AnnaVerse2024!Secure';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE annaverse TO annaverse_user;"
sudo -u postgres psql -c "ALTER USER annaverse_user CREATEDB;"

# Create application directory
echo "📁 Creating application directory..."
mkdir -p /opt/annaverse
cd /opt/annaverse

echo "✅ Server setup complete!"
echo "📝 Next steps:"
echo "1. Clone your GitHub repository"
echo "2. Configure environment variables"
echo "3. Build and deploy the application"
echo ""
echo "Database created with:"
echo "  - Database: annaverse"
echo "  - User: annaverse_user"
echo "  - Password: AnnaVerse2024!Secure"
echo ""
echo "Your database URL will be:"
echo "postgresql://annaverse_user:AnnaVerse2024!Secure@localhost:5432/annaverse"