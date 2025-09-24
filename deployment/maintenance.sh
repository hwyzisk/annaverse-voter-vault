#!/bin/bash

# AnnaVerse Maintenance and Monitoring Script
# Provides various maintenance commands for your deployment

show_help() {
    echo "AnnaVerse Maintenance Script"
    echo ""
    echo "Usage: $0 <command>"
    echo ""
    echo "Available commands:"
    echo "  status      - Show application and system status"
    echo "  logs        - Show recent application logs"
    echo "  restart     - Restart the application"
    echo "  update      - Pull latest code and restart"
    echo "  backup      - Create database backup"
    echo "  restore     - Restore from database backup"
    echo "  monitor     - Show real-time logs"
    echo "  health      - Run health checks"
    echo "  cleanup     - Clean up old logs and temporary files"
    echo ""
}

status() {
    echo "🔍 AnnaVerse System Status"
    echo "========================="
    echo ""
    echo "📊 PM2 Process Status:"
    pm2 status
    echo ""
    echo "🌐 Nginx Status:"
    systemctl status nginx --no-pager -l
    echo ""
    echo "🗄️ PostgreSQL Status:"
    systemctl status postgresql --no-pager -l
    echo ""
    echo "💾 Disk Usage:"
    df -h /
    echo ""
    echo "🧠 Memory Usage:"
    free -h
}

logs() {
    echo "📋 Recent Application Logs:"
    echo "=========================="
    pm2 logs annaverse --lines 50
}

restart() {
    echo "🔄 Restarting AnnaVerse application..."
    pm2 restart annaverse
    echo "✅ Application restarted successfully"
    pm2 status
}

update() {
    echo "🔄 Updating AnnaVerse application..."
    cd /opt/annaverse

    echo "📥 Pulling latest changes..."
    git pull origin main

    echo "📦 Installing dependencies..."
    npm install

    echo "🔨 Building application..."
    npm run build

    echo "🗄️ Updating database schema..."
    NODE_ENV=production npm run db:push

    echo "🔄 Restarting application..."
    pm2 restart annaverse

    echo "✅ Update complete!"
    pm2 status
}

backup() {
    BACKUP_DIR="/opt/annaverse/backups"
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/annaverse_backup_$TIMESTAMP.sql"

    echo "💾 Creating database backup..."
    mkdir -p $BACKUP_DIR

    sudo -u postgres pg_dump annaverse > $BACKUP_FILE

    echo "✅ Backup created: $BACKUP_FILE"
    echo "📊 Backup size: $(du -h $BACKUP_FILE | cut -f1)"

    # Keep only last 7 backups
    ls -t $BACKUP_DIR/annaverse_backup_*.sql | tail -n +8 | xargs -r rm
    echo "🧹 Cleaned up old backups (keeping last 7)"
}

restore() {
    BACKUP_DIR="/opt/annaverse/backups"

    if [ $# -eq 0 ]; then
        echo "Available backups:"
        ls -la $BACKUP_DIR/annaverse_backup_*.sql 2>/dev/null || echo "No backups found"
        echo ""
        echo "Usage: $0 restore <backup-file>"
        return 1
    fi

    BACKUP_FILE=$1
    if [ ! -f "$BACKUP_FILE" ]; then
        BACKUP_FILE="$BACKUP_DIR/$BACKUP_FILE"
    fi

    if [ ! -f "$BACKUP_FILE" ]; then
        echo "❌ Backup file not found: $BACKUP_FILE"
        return 1
    fi

    echo "⚠️  WARNING: This will replace all current data!"
    read -p "Are you sure you want to restore from $BACKUP_FILE? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Restore cancelled"
        return 1
    fi

    echo "🔄 Stopping application..."
    pm2 stop annaverse

    echo "🗄️ Restoring database..."
    sudo -u postgres dropdb annaverse
    sudo -u postgres createdb annaverse
    sudo -u postgres psql annaverse < $BACKUP_FILE

    echo "🔄 Starting application..."
    pm2 start annaverse

    echo "✅ Restore complete!"
}

monitor() {
    echo "📊 Real-time monitoring (Press Ctrl+C to exit)"
    echo "=============================================="
    pm2 monit
}

health() {
    echo "🏥 Running Health Checks"
    echo "======================"
    echo ""

    # Check if application is responding
    echo "🌐 Checking application response..."
    if curl -f -s http://localhost:5000/api/health > /dev/null 2>&1; then
        echo "✅ Application is responding"
    else
        echo "❌ Application is not responding"
    fi

    # Check database connection
    echo "🗄️ Checking database connection..."
    if sudo -u postgres psql -d annaverse -c "SELECT 1;" > /dev/null 2>&1; then
        echo "✅ Database connection is working"
    else
        echo "❌ Database connection failed"
    fi

    # Check disk space
    echo "💾 Checking disk space..."
    DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ $DISK_USAGE -lt 80 ]; then
        echo "✅ Disk usage is acceptable ($DISK_USAGE%)"
    else
        echo "⚠️  Disk usage is high ($DISK_USAGE%)"
    fi

    # Check memory usage
    echo "🧠 Checking memory usage..."
    MEMORY_USAGE=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100)}')
    if [ $MEMORY_USAGE -lt 80 ]; then
        echo "✅ Memory usage is acceptable ($MEMORY_USAGE%)"
    else
        echo "⚠️  Memory usage is high ($MEMORY_USAGE%)"
    fi
}

cleanup() {
    echo "🧹 Cleaning up system..."

    # Clean PM2 logs
    echo "📋 Cleaning PM2 logs..."
    pm2 flush

    # Clean system logs
    echo "📋 Cleaning system logs..."
    journalctl --vacuum-time=7d

    # Clean package cache
    echo "📦 Cleaning package cache..."
    apt autoremove -y
    apt autoclean

    # Clean npm cache
    echo "📦 Cleaning npm cache..."
    npm cache clean --force

    echo "✅ Cleanup complete!"
}

# Main script logic
case "${1:-}" in
    status)     status ;;
    logs)       logs ;;
    restart)    restart ;;
    update)     update ;;
    backup)     backup ;;
    restore)    restore "${2:-}" ;;
    monitor)    monitor ;;
    health)     health ;;
    cleanup)    cleanup ;;
    help|--help|-h) show_help ;;
    *)          show_help ;;
esac