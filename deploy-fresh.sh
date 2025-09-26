#!/bin/bash

# =============================================================================
# AnnaVerse Fresh Deployment Script
# =============================================================================
# This script performs a complete fresh deployment of AnnaVerse application
# It includes automatic Docker installation, secure password generation,
# repository cloning, and container orchestration.
#
# Usage: ./deploy-fresh.sh [domain]
# Example: ./deploy-fresh.sh myapp.example.com
#
# Requirements: Ubuntu 22.04 server with sudo access
# =============================================================================

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Configuration
REPO_URL="https://github.com/hwyzisk/annaverse-voter-vault.git"
APP_DIR="/opt/annaverse"
BACKUP_DIR="/opt/annaverse-backups"
LOG_FILE="/var/log/annaverse-deploy.log"
DOMAIN="${1:-localhost}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    log "${RED}ERROR: $1${NC}"
    exit 1
}

success() {
    log "${GREEN}SUCCESS: $1${NC}"
}

warning() {
    log "${YELLOW}WARNING: $1${NC}"
}

info() {
    log "${BLUE}INFO: $1${NC}"
}

# Generate secure random password
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# Generate secure session secret
generate_session_secret() {
    openssl rand -base64 64 | tr -d "=+/"
}

# Check if running as root or with sudo
check_privileges() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root or with sudo"
    fi
}

# Create necessary directories
setup_directories() {
    info "Setting up directories..."
    mkdir -p "$APP_DIR" "$BACKUP_DIR" "$(dirname "$LOG_FILE")"
    chown -R $SUDO_USER:$SUDO_USER "$APP_DIR" "$BACKUP_DIR" 2>/dev/null || true
}

# Install Docker and Docker Compose
install_docker() {
    if command -v docker &> /dev/null && docker --version | grep -q "Docker version"; then
        info "Docker already installed: $(docker --version)"
    else
        info "Installing Docker..."

        # Update package index
        apt-get update

        # Install prerequisites
        apt-get install -y \
            ca-certificates \
            curl \
            gnupg \
            lsb-release \
            wget \
            git

        # Add Docker's official GPG key
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

        # Add Docker repository
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

        # Install Docker
        apt-get update
        apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

        # Start and enable Docker
        systemctl start docker
        systemctl enable docker

        # Add user to docker group
        usermod -aG docker $SUDO_USER

        success "Docker installed successfully"
    fi

    # Verify Docker Compose
    if docker compose version &> /dev/null; then
        info "Docker Compose available: $(docker compose version)"
    else
        error "Docker Compose not available"
    fi
}

# Clone or update repository
setup_repository() {
    info "Setting up repository..."

    if [[ -d "$APP_DIR/.git" ]]; then
        warning "Repository already exists, creating backup..."
        TIMESTAMP=$(date +%Y%m%d_%H%M%S)
        cp -r "$APP_DIR" "$BACKUP_DIR/annaverse_$TIMESTAMP"

        cd "$APP_DIR"
        git fetch origin
        git reset --hard origin/main
        info "Repository updated to latest version"
    else
        info "Cloning repository..."
        rm -rf "$APP_DIR"
        git clone "$REPO_URL" "$APP_DIR"
        cd "$APP_DIR"
        info "Repository cloned successfully"
    fi

    chown -R $SUDO_USER:$SUDO_USER "$APP_DIR"
}

# Generate environment file
generate_env_file() {
    info "Generating production environment file..."

    cd "$APP_DIR"

    # Generate secure passwords
    POSTGRES_PASSWORD=$(generate_password)
    SESSION_SECRET=$(generate_session_secret)
    REDIS_PASSWORD=$(generate_password)

    # Create .env file from template
    cat > .env << EOF
# =============================================================================
# AnnaVerse Production Environment
# Generated: $(date)
# =============================================================================

# Database Configuration
POSTGRES_DB=annaverse
POSTGRES_USER=annaverse_user
POSTGRES_PASSWORD=$POSTGRES_PASSWORD

# Application Security
SESSION_SECRET=$SESSION_SECRET
DOMAIN=$DOMAIN

# Application Settings
NODE_ENV=production
PORT=3000
DEBUG=false
LOG_LEVEL=info

# Optional Services (uncomment and configure as needed)
# SENDGRID_API_KEY=your_sendgrid_api_key_here
# REPLIT_DB_URL=your_replit_auth_url_here
# REDIS_PASSWORD=$REDIS_PASSWORD
EOF

    # Secure the environment file
    chmod 600 .env
    chown $SUDO_USER:$SUDO_USER .env

    success "Environment file generated with secure passwords"
    info "Environment file location: $APP_DIR/.env"
}

# Create additional Docker configuration files
setup_docker_configs() {
    info "Setting up Docker configuration files..."

    cd "$APP_DIR"

    # Create postgres init SQL file
    mkdir -p docker/postgres
    cat > docker/postgres/init.sql << 'EOF'
-- AnnaVerse Database Initialization
-- This file runs when PostgreSQL container starts for the first time

-- Create extensions if needed
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Database is created automatically by POSTGRES_DB environment variable
-- User is created automatically by POSTGRES_USER and POSTGRES_PASSWORD environment variables

-- Additional initialization can be added here
SELECT 'AnnaVerse database initialized successfully' as message;
EOF

    # Create nginx SSL directory (for future SSL certificates)
    mkdir -p docker/nginx/ssl

    # Create a self-signed certificate for development (replace with real certificates in production)
    if [[ "$DOMAIN" != "localhost" ]]; then
        info "Creating self-signed SSL certificate for $DOMAIN (replace with real certificates in production)"
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout docker/nginx/ssl/key.pem \
            -out docker/nginx/ssl/cert.pem \
            -subj "/C=US/ST=State/L=City/O=Organization/OU=OrgUnit/CN=$DOMAIN"
        chmod 600 docker/nginx/ssl/key.pem
    fi

    chown -R $SUDO_USER:$SUDO_USER docker/

    success "Docker configuration files created"
}

# Stop existing containers
stop_existing_containers() {
    info "Stopping existing containers..."
    cd "$APP_DIR"

    if docker compose ps -q | grep -q .; then
        docker compose down --remove-orphans
        success "Existing containers stopped"
    else
        info "No existing containers found"
    fi
}

# Build and start containers
start_application() {
    info "Building and starting application containers..."
    cd "$APP_DIR"

    # Build the application image
    docker compose build --no-cache

    # Start services
    docker compose up -d

    # Wait for services to be ready
    info "Waiting for services to start..."
    sleep 10

    # Check service health
    MAX_ATTEMPTS=30
    ATTEMPT=1

    while [[ $ATTEMPT -le $MAX_ATTEMPTS ]]; do
        if docker compose ps | grep -q "healthy\|running"; then
            break
        fi

        info "Waiting for services to be ready (attempt $ATTEMPT/$MAX_ATTEMPTS)..."
        sleep 5
        ((ATTEMPT++))
    done

    if [[ $ATTEMPT -gt $MAX_ATTEMPTS ]]; then
        error "Services failed to start within expected time"
    fi

    success "Application containers started successfully"
}

# Run database migrations
run_migrations() {
    info "Running database migrations..."
    cd "$APP_DIR"

    # Wait for database to be ready
    sleep 5

    # Run migrations using the app container
    if docker compose exec -T app npm run db:push; then
        success "Database migrations completed"
    else
        warning "Database migrations failed or no migrations to run"
    fi
}

# Display deployment summary
show_summary() {
    cd "$APP_DIR"

    success "=============================================================================
AnnaVerse deployment completed successfully!
============================================================================="

    echo -e "${BLUE}Deployment Information:${NC}"
    echo "- Application Directory: $APP_DIR"
    echo "- Domain: $DOMAIN"
    echo "- Environment File: $APP_DIR/.env"
    echo "- Log File: $LOG_FILE"
    echo ""

    echo -e "${BLUE}Service Status:${NC}"
    docker compose ps
    echo ""

    echo -e "${BLUE}Access Information:${NC}"
    if [[ "$DOMAIN" == "localhost" ]]; then
        echo "- Application URL: http://localhost"
    else
        echo "- Application URL: http://$DOMAIN"
        echo "- HTTPS URL: https://$DOMAIN (configure real SSL certificates)"
    fi
    echo ""

    echo -e "${BLUE}Management Commands:${NC}"
    echo "- View logs: cd $APP_DIR && docker compose logs -f"
    echo "- Stop services: cd $APP_DIR && docker compose down"
    echo "- Start services: cd $APP_DIR && docker compose up -d"
    echo "- View status: cd $APP_DIR && docker compose ps"
    echo "- Database shell: cd $APP_DIR && docker compose exec postgres psql -U annaverse_user -d annaverse"
    echo ""

    echo -e "${YELLOW}Next Steps:${NC}"
    echo "1. Configure your domain's DNS to point to this server"
    echo "2. Obtain and install real SSL certificates (Let's Encrypt recommended)"
    echo "3. Configure SendGrid API key in .env if email functionality is needed"
    echo "4. Set up regular backups of the database"
    echo "5. Configure monitoring and log rotation"
    echo ""

    echo -e "${GREEN}Deployment completed at $(date)${NC}"
}

# Cleanup function for script interruption
cleanup() {
    error "Deployment interrupted"
    cd "$APP_DIR" 2>/dev/null || true
    docker compose down 2>/dev/null || true
    exit 1
}

# Main deployment function
main() {
    trap cleanup INT TERM

    info "=============================================================================
Starting AnnaVerse fresh deployment...
Domain: $DOMAIN
============================================================================="

    check_privileges
    setup_directories
    install_docker
    setup_repository
    generate_env_file
    setup_docker_configs
    stop_existing_containers
    start_application
    run_migrations
    show_summary
}

# Run main function
main "$@"