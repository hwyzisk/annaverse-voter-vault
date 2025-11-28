#!/bin/bash
# Script to help find your existing production environment variables
# Run this ON YOUR PRODUCTION SERVER

echo "🔍 Looking for existing environment variables..."
echo ""
echo "=================================================="
echo "CHECKING PRODUCTION ENVIRONMENT"
echo "=================================================="
echo ""

# Check if .env file exists
if [ -f .env ]; then
    echo "✅ Found .env file in current directory"
    echo ""
    echo "📋 Your EXISTING variables:"
    echo "---------------------------------------------------"

    # Show non-sensitive parts
    if grep -q "POSTGRES_PASSWORD" .env; then
        echo "✅ POSTGRES_PASSWORD is set"
        # Show first few characters only
        PASSWORD=$(grep "POSTGRES_PASSWORD" .env | cut -d'=' -f2)
        echo "   Value starts with: ${PASSWORD:0:5}..."
    else
        echo "❌ POSTGRES_PASSWORD is NOT set"
    fi

    if grep -q "SESSION_SECRET" .env; then
        echo "✅ SESSION_SECRET is set"
        SECRET=$(grep "SESSION_SECRET" .env | cut -d'=' -f2)
        echo "   Value starts with: ${SECRET:0:5}..."
    else
        echo "❌ SESSION_SECRET is NOT set"
    fi

    if grep -q "DOMAIN" .env; then
        echo "✅ DOMAIN is set"
        grep "DOMAIN=" .env
    else
        echo "❌ DOMAIN is NOT set"
    fi

    if grep -q "REDIS_PASSWORD" .env; then
        echo "✅ REDIS_PASSWORD is already set"
    else
        echo "⚠️  REDIS_PASSWORD is NOT set (THIS IS NEW - we'll create one)"
    fi

    echo ""
    echo "---------------------------------------------------"
    echo ""

    # Show the actual .env file (be careful!)
    echo "📄 Full .env file contents:"
    echo "---------------------------------------------------"
    cat .env
    echo "---------------------------------------------------"

else
    echo "❌ No .env file found!"
    echo ""
    echo "Checking docker-compose for environment variables..."
    echo ""

    if [ -f docker-compose.yml ]; then
        echo "📋 Environment variables from docker-compose.yml:"
        grep -A 20 "environment:" docker-compose.yml | grep -E "POSTGRES|SESSION|DOMAIN"
    fi
fi

echo ""
echo "=================================================="
echo "SYSTEM INFO"
echo "=================================================="
echo "Current directory: $(pwd)"
echo "Docker containers running:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
