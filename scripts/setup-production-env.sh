#!/bin/bash
# Interactive script to set up production environment variables
# Run this ON YOUR PRODUCTION SERVER

set -e

echo "=================================================="
echo "🚀 AnnaVerse Production Environment Setup"
echo "=================================================="
echo ""
echo "This script will help you set up your .env file safely."
echo "Press Ctrl+C at any time to cancel."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Backup existing .env if it exists
if [ -f .env ]; then
    echo -e "${YELLOW}⚠️  Found existing .env file${NC}"
    BACKUP_FILE=".env.backup.$(date +%Y%m%d_%H%M%S)"
    cp .env "$BACKUP_FILE"
    echo -e "${GREEN}✅ Backed up to: $BACKUP_FILE${NC}"
    echo ""

    # Try to read existing values
    if grep -q "POSTGRES_PASSWORD=" .env; then
        EXISTING_PG_PASSWORD=$(grep "POSTGRES_PASSWORD=" .env | cut -d'=' -f2-)
    fi
    if grep -q "SESSION_SECRET=" .env; then
        EXISTING_SESSION_SECRET=$(grep "SESSION_SECRET=" .env | cut -d'=' -f2-)
    fi
    if grep -q "DOMAIN=" .env; then
        EXISTING_DOMAIN=$(grep "DOMAIN=" .env | cut -d'=' -f2-)
    fi
fi

echo "=================================================="
echo "Step 1: PostgreSQL Password"
echo "=================================================="
echo ""
echo "This is the password for your PostgreSQL database."
echo "If you already have PostgreSQL running, use the SAME password."
echo ""

if [ -n "$EXISTING_PG_PASSWORD" ]; then
    echo -e "${GREEN}Found existing password in .env${NC}"
    echo "First 5 characters: ${EXISTING_PG_PASSWORD:0:5}..."
    echo ""
    read -p "Keep this password? (y/n): " KEEP_PG
    if [ "$KEEP_PG" = "y" ]; then
        POSTGRES_PASSWORD="$EXISTING_PG_PASSWORD"
        echo -e "${GREEN}✅ Using existing PostgreSQL password${NC}"
    else
        read -sp "Enter new PostgreSQL password: " POSTGRES_PASSWORD
        echo ""
    fi
else
    echo -e "${YELLOW}No existing password found.${NC}"
    echo "If you don't know it, check your docker-compose or database config."
    echo ""
    read -sp "Enter PostgreSQL password: " POSTGRES_PASSWORD
    echo ""
fi

echo ""
echo "=================================================="
echo "Step 2: Session Secret"
echo "=================================================="
echo ""
echo "This encrypts user sessions (login cookies)."
echo ""

if [ -n "$EXISTING_SESSION_SECRET" ]; then
    echo -e "${GREEN}Found existing session secret${NC}"
    echo "First 5 characters: ${EXISTING_SESSION_SECRET:0:5}..."
    echo ""
    read -p "Keep this secret? (y/n): " KEEP_SECRET
    if [ "$KEEP_SECRET" = "y" ]; then
        SESSION_SECRET="$EXISTING_SESSION_SECRET"
        echo -e "${GREEN}✅ Using existing session secret${NC}"
    else
        SESSION_SECRET=$(openssl rand -base64 32)
        echo -e "${GREEN}✅ Generated new session secret${NC}"
    fi
else
    echo -e "${YELLOW}No existing secret found. Generating a new one...${NC}"
    SESSION_SECRET=$(openssl rand -base64 32)
    echo -e "${GREEN}✅ Generated session secret: ${SESSION_SECRET:0:10}...${NC}"
fi

echo ""
echo "=================================================="
echo "Step 3: Redis Password (NEW)"
echo "=================================================="
echo ""
echo "Redis is NEW - it stores user sessions for better performance."
echo "We'll generate a secure password for it."
echo ""

REDIS_PASSWORD=$(openssl rand -base64 32)
echo -e "${GREEN}✅ Generated Redis password: ${REDIS_PASSWORD:0:10}...${NC}"

echo ""
echo "=================================================="
echo "Step 4: Domain"
echo "=================================================="
echo ""
echo "This is your website domain (e.g., annaverse.com or yoursite.com)"
echo ""

if [ -n "$EXISTING_DOMAIN" ]; then
    echo -e "${GREEN}Found existing domain: $EXISTING_DOMAIN${NC}"
    echo ""
    read -p "Keep this domain? (y/n): " KEEP_DOMAIN
    if [ "$KEEP_DOMAIN" = "y" ]; then
        DOMAIN="$EXISTING_DOMAIN"
    else
        read -p "Enter your domain: " DOMAIN
    fi
else
    read -p "Enter your domain (without http://): " DOMAIN
fi

echo ""
echo "=================================================="
echo "📋 Summary of Configuration"
echo "=================================================="
echo ""
echo "PostgreSQL Password:  ${POSTGRES_PASSWORD:0:5}... (length: ${#POSTGRES_PASSWORD})"
echo "Session Secret:       ${SESSION_SECRET:0:5}... (length: ${#SESSION_SECRET})"
echo "Redis Password:       ${REDIS_PASSWORD:0:5}... (length: ${#REDIS_PASSWORD})"
echo "Domain:               $DOMAIN"
echo ""

read -p "Save this configuration? (y/n): " CONFIRM

if [ "$CONFIRM" != "y" ]; then
    echo -e "${RED}❌ Configuration not saved. Exiting.${NC}"
    exit 1
fi

# Create the .env file
cat > .env << EOF
# =============================================================================
# PRODUCTION ENVIRONMENT VARIABLES
# Generated: $(date)
# =============================================================================

# PostgreSQL Database Configuration
POSTGRES_DB=annaverse
POSTGRES_USER=annaverse_user
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

# Redis Configuration (for session storage - performance optimization)
REDIS_PASSWORD=${REDIS_PASSWORD}

# Application Security
SESSION_SECRET=${SESSION_SECRET}
DOMAIN=${DOMAIN}

# Mailjet Email Service (if you have these configured)
MAILJET_API_KEY=92a0a0ad886cd6d776f4bc62194fda2b
MAILJET_SECRET_KEY=5d777670fbf7237569f46155f7d8e3bc

# Application Settings
NODE_ENV=production
PORT=3000

# =============================================================================
# IMPORTANT: Keep this file secure!
# - Do not commit to git (.gitignore includes .env)
# - Set file permissions: chmod 600 .env
# =============================================================================
EOF

# Set secure permissions
chmod 600 .env

echo ""
echo -e "${GREEN}=================================================="
echo "✅ SUCCESS! Configuration saved to .env"
echo "==================================================${NC}"
echo ""
echo "📁 File location: $(pwd)/.env"
echo "🔒 Permissions set to 600 (readable only by owner)"
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo "1. Deploy your code: git pull origin main"
echo "2. Restart services: docker-compose down && docker-compose up -d --build"
echo "3. Check logs: docker logs annaverse_app"
echo ""
echo "You should see: ✅ Redis connected for session storage"
echo ""
