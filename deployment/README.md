# AnnaVerse Deployment Guide

Complete deployment instructions for AnnaVerse on SSD Nodes or any Ubuntu server.

## Quick Start

**Prerequisites:**
- Ubuntu 20.04+ server
- Root access or sudo privileges
- Domain name pointed to your server IP (optional but recommended)
- GitHub repository access

## Step-by-Step Deployment

### 1. Initial Server Setup

SSH into your server and run the setup script:

```bash
# Make the script executable and run it
wget https://raw.githubusercontent.com/hwyzisk/annaverse-voter-vault/main/deployment/server-setup.sh
chmod +x server-setup.sh
sudo ./server-setup.sh
```

**What this does:**
- Updates system packages
- Installs Node.js 20.x, PostgreSQL, Nginx, PM2
- Configures firewall (ports 22, 80, 443)
- Creates PostgreSQL database and user
- Sets up application directory

### 2. Deploy Application

```bash
# Download and run the deployment script
wget https://raw.githubusercontent.com/hwyzisk/annaverse-voter-vault/main/deployment/deploy-app.sh
chmod +x deploy-app.sh
sudo ./deploy-app.sh https://github.com/hwyzisk/annaverse-voter-vault.git
```

**What this does:**
- Clones your GitHub repository
- Installs Node.js dependencies
- Creates production environment configuration
- Builds the application
- Initializes database schema
- Starts application with PM2

### 3. Configure Web Server

```bash
# Setup Nginx reverse proxy
wget https://raw.githubusercontent.com/hwyzisk/annaverse-voter-vault/main/deployment/setup-nginx.sh
chmod +x setup-nginx.sh
sudo ./setup-nginx.sh your-domain.com  # or use your server IP
```

### 4. Setup SSL Certificate (Recommended)

```bash
# Setup Let's Encrypt SSL certificate
wget https://raw.githubusercontent.com/hwyzisk/annaverse-voter-vault/main/deployment/setup-ssl.sh
chmod +x setup-ssl.sh
sudo ./setup-ssl.sh your-domain.com admin@yourdomain.com
```

### 5. Verify Deployment

```bash
# Check application status
wget https://raw.githubusercontent.com/hwyzisk/annaverse-voter-vault/main/deployment/maintenance.sh
chmod +x maintenance.sh
sudo ./maintenance.sh status
```

## Environment Configuration

After deployment, edit `/opt/annaverse/.env.production`:

```env
# Database (automatically configured)
DATABASE_URL=postgresql://annaverse_user:AnnaVerse2024!Secure@localhost:5432/annaverse

# Session security (automatically generated)
SESSION_SECRET=your_generated_secret

# Email service (REQUIRED for password resets)
SENDGRID_API_KEY=your_sendgrid_api_key_here

# Production settings
NODE_ENV=production
PORT=5000
```

## Maintenance Commands

Use the maintenance script for ongoing management:

```bash
sudo ./maintenance.sh <command>
```

Available commands:
- `status` - Show application and system status
- `logs` - Show recent application logs
- `restart` - Restart the application
- `update` - Pull latest code and restart
- `backup` - Create database backup
- `restore` - Restore from database backup
- `monitor` - Show real-time monitoring
- `health` - Run health checks
- `cleanup` - Clean up old logs and temporary files

## Security Notes

1. **Database Password**: Change the default database password in production
2. **Session Secret**: A secure random session secret is auto-generated
3. **Firewall**: Only ports 22, 80, and 443 are exposed
4. **SSL**: Always use HTTPS in production
5. **Backups**: Set up automated database backups

## Troubleshooting

### Application won't start
```bash
# Check PM2 status and logs
pm2 status
pm2 logs annaverse

# Check if port 5000 is available
netstat -tulpn | grep :5000
```

### Database connection issues
```bash
# Test PostgreSQL connection
sudo -u postgres psql -d annaverse -c "SELECT version();"

# Check if database exists
sudo -u postgres psql -l | grep annaverse
```

### Nginx issues
```bash
# Test Nginx configuration
nginx -t

# Check Nginx status and logs
systemctl status nginx
journalctl -u nginx -f
```

### SSL certificate issues
```bash
# Check certificate status
certbot certificates

# Test renewal
certbot renew --dry-run
```

## Updating the Application

To update to the latest version:

```bash
sudo ./maintenance.sh update
```

This will:
1. Pull latest code from GitHub
2. Install any new dependencies
3. Rebuild the application
4. Update database schema if needed
5. Restart the application

## Database Management

### Manual Backup
```bash
sudo ./maintenance.sh backup
```

### Manual Restore
```bash
sudo ./maintenance.sh restore backup_filename.sql
```

### Direct Database Access
```bash
sudo -u postgres psql annaverse
```

## Performance Tuning

For high-traffic deployments, consider:

1. **Database optimization**: Configure PostgreSQL for your server specs
2. **Nginx caching**: Add caching headers for static assets
3. **PM2 clustering**: Use multiple Node.js processes
4. **Database connection pooling**: Already configured via Neon driver

## Support

If you encounter issues:

1. Check application logs: `sudo ./maintenance.sh logs`
2. Run health checks: `sudo ./maintenance.sh health`
3. Review this guide for common issues
4. Check the GitHub repository for updates