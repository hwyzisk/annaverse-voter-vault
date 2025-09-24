#!/bin/bash

# AnnaVerse Server Cleanup Script
# This will remove any previous installation attempts and reset everything

set -e  # Exit on any error

echo "🧹 Cleaning up previous AnnaVerse installation..."

# Stop any running processes
echo "🛑 Stopping any running processes..."
pm2 delete annaverse || true
pm2 kill || true

# Remove application directory
echo "📁 Removing application directory..."
rm -rf /opt/annaverse

# Clean up PostgreSQL
echo "🗄️ Cleaning up PostgreSQL..."
sudo -u postgres dropdb annaverse || true
sudo -u postgres dropuser annaverse_user || true

# Remove Nginx configuration
echo "🌐 Removing Nginx configuration..."
rm -f /etc/nginx/sites-enabled/annaverse
rm -f /etc/nginx/sites-available/annaverse
systemctl restart nginx || true

# Remove any SSL certificates
echo "🔒 Removing SSL certificates..."
certbot delete --cert-name 23.227.173.229 || true

# Clean up any leftover files
echo "🧹 Final cleanup..."
rm -f /root/server-setup.sh
rm -f /root/deploy-app.sh
rm -f /root/setup-nginx.sh
rm -f /root/setup-ssl.sh
rm -f /root/maintenance.sh

echo "✅ Cleanup complete! Ready for fresh installation."
echo ""
echo "🚀 Next steps:"
echo "1. Run the server-setup.sh script again"
echo "2. Follow the deployment steps in order"