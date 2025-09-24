#!/bin/bash

# SSL Certificate Setup Script using Let's Encrypt
# Usage: ./setup-ssl.sh <domain-name> [email]
# Example: ./setup-ssl.sh annaverse.yourdomain.com admin@yourdomain.com

set -e  # Exit on any error

if [ $# -eq 0 ]; then
    echo "Usage: $0 <domain-name> [email]"
    echo "Example: $0 annaverse.yourdomain.com admin@yourdomain.com"
    exit 1
fi

DOMAIN=$1
EMAIL=${2:-""}

echo "🔒 Setting up SSL certificate for domain: $DOMAIN"

# Install Certbot
echo "📦 Installing Certbot..."
apt update
apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
if [ -n "$EMAIL" ]; then
    echo "🔑 Obtaining SSL certificate with email: $EMAIL"
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL
else
    echo "🔑 Obtaining SSL certificate (you'll be prompted for email)..."
    certbot --nginx -d $DOMAIN
fi

# Test auto-renewal
echo "🔄 Testing SSL certificate auto-renewal..."
certbot renew --dry-run

# Setup auto-renewal cron job
echo "⏰ Setting up automatic certificate renewal..."
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

echo "✅ SSL certificate setup complete!"
echo ""
echo "🔒 Your site should now be accessible at: https://$DOMAIN"
echo ""
echo "📝 Certificate details:"
certbot certificates
echo ""
echo "🔍 Useful commands:"
echo "  certbot certificates        - List certificates"
echo "  certbot renew              - Manually renew certificates"
echo "  certbot revoke --cert-path /path/to/cert - Revoke certificate"
echo ""
echo "⏰ Auto-renewal is set up to check daily at 12:00 PM"