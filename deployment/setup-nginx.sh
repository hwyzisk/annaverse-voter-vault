#!/bin/bash

# Nginx Configuration Script for AnnaVerse
# Usage: ./setup-nginx.sh <domain-name>
# Example: ./setup-nginx.sh annaverse.yourdomain.com

set -e  # Exit on any error

if [ $# -eq 0 ]; then
    echo "Usage: $0 <domain-name>"
    echo "Example: $0 annaverse.yourdomain.com"
    echo "Or use IP: $0 $(curl -s ifconfig.me)"
    exit 1
fi

DOMAIN=$1

echo "🌐 Setting up Nginx for domain: $DOMAIN"

# Create Nginx configuration
cat > /etc/nginx/sites-available/annaverse << EOF
server {
    listen 80;
    server_name $DOMAIN;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # Client max body size for file uploads
    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Optional: serve static files directly (if you have them)
    location /assets/ {
        proxy_pass http://localhost:5000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Enable the site
echo "🔗 Enabling Nginx site..."
ln -sf /etc/nginx/sites-available/annaverse /etc/nginx/sites-enabled/

# Remove default site if it exists
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
echo "🧪 Testing Nginx configuration..."
nginx -t

# Restart Nginx
echo "🔄 Restarting Nginx..."
systemctl restart nginx
systemctl enable nginx

echo "✅ Nginx configuration complete!"
echo ""
echo "🌐 Your site should now be accessible at: http://$DOMAIN"
echo ""
echo "📝 Next steps:"
echo "1. Test your site: curl -I http://$DOMAIN"
echo "2. Setup SSL certificate: ./setup-ssl.sh $DOMAIN"
echo ""
echo "🔍 Useful commands:"
echo "  nginx -t                    - Test configuration"
echo "  systemctl status nginx      - Check Nginx status"
echo "  journalctl -u nginx         - View Nginx logs"