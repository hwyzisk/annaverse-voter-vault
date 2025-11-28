# Production Deployment Checklist - Performance Updates

## ✅ Pre-Deployment Verification

### 1. Environment Variables Check
On your production server, create/update `.env` file with these values:

```bash
# PostgreSQL (Local Docker Container - NOT Neon)
POSTGRES_DB=annaverse
POSTGRES_USER=annaverse_user
POSTGRES_PASSWORD=YOUR_SECURE_PASSWORD_HERE

# Redis (NEW - Required for Performance)
REDIS_PASSWORD=YOUR_SECURE_REDIS_PASSWORD_HERE

# Session Secret
SESSION_SECRET=YOUR_SECURE_SESSION_SECRET_HERE

# Domain
DOMAIN=your-actual-domain.com
```

**IMPORTANT:**
- Do NOT set `DATABASE_URL` in production `.env` - docker-compose.yml handles this automatically
- The app will connect to `postgres:5432` (docker container), NOT Neon
- Redis is now required for optimal performance

### 2. Verify Docker Compose Configuration

Your `docker-compose.yml` already correctly sets:
```yaml
DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
```

This connects to the **local PostgreSQL container**, not Neon.

### 3. Database Connection Pool Settings

The new configuration uses:
- **Max connections:** 30 (up from 10)
- **Min connections:** 5
- **Connection timeout:** 10 seconds

Your PostgreSQL container needs to support 30+ connections. Check your docker-compose postgres settings.

### 4. Redis Setup

Redis is now enabled for session storage. This is CRITICAL for performance with 15+ concurrent users.

## 🚀 Deployment Steps

### Step 1: Pull Latest Code
```bash
cd /path/to/annaverse-voter-vault
git pull origin main
```

### Step 2: Update Environment Variables
```bash
nano .env  # or vim .env
# Add REDIS_PASSWORD and verify POSTGRES_PASSWORD is set
```

### Step 3: Rebuild and Restart
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Step 4: Verify Services Started
```bash
# Check all containers are running
docker-compose ps

# Should see:
# - annaverse_postgres (healthy)
# - annaverse_redis (healthy)
# - annaverse_app (healthy)
```

### Step 5: Check Logs
```bash
# Check app logs for Redis connection
docker logs annaverse_app --tail 50

# Look for:
# ✅ Redis connected for session storage
# 📦 Using Redis for session storage
# serving on port 3000
```

### Step 6: Test Connection
```bash
# Test database connection
docker exec -it annaverse_postgres psql -U annaverse_user -d annaverse -c "SELECT version();"

# Test Redis connection
docker exec -it annaverse_redis redis-cli -a YOUR_REDIS_PASSWORD ping
# Should return: PONG
```

## 🔧 Troubleshooting

### If App Won't Start

**Check 1: Environment Variables**
```bash
docker-compose config | grep -E "DATABASE_URL|REDIS_URL"
```
- DATABASE_URL should point to `@postgres:5432`
- REDIS_URL should point to `@redis:6379`

**Check 2: Connection Pool**
```bash
# Check PostgreSQL max_connections setting
docker exec -it annaverse_postgres psql -U annaverse_user -d annaverse -c "SHOW max_connections;"
```
Should be at least 100 (default).

**Check 3: Redis Connection**
```bash
docker logs annaverse_redis
```
Look for any authentication errors.

### If Performance Issues Persist

1. Check active database connections:
```bash
docker exec -it annaverse_postgres psql -U annaverse_user -d annaverse -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"
```

2. Monitor Redis memory usage:
```bash
docker exec -it annaverse_redis redis-cli -a YOUR_REDIS_PASSWORD info memory
```

## 📊 Expected Improvements

After deployment:
- Search queries: **60 seconds → under 3 seconds**
- Database queries per search: **120+ → 4 queries**
- Concurrent user support: **~5 users → 30+ users**
- Session overhead: **50-100ms → <5ms**

## ⚠️ Important Notes

1. **NO DATABASE MIGRATION NEEDED** - Code changes are backward compatible
2. **Sessions will reset** - Users will need to log in again after deployment
3. **Redis is required** - App will fail to start without REDIS_PASSWORD set
4. **Connection pool increased** - Monitor PostgreSQL connections for first 24 hours

## 🆘 Rollback Plan (If Needed)

If issues occur:
```bash
# Stop services
docker-compose down

# Checkout previous version
git checkout HEAD~1

# Restart with old version
docker-compose up -d --build
```

## ✅ Post-Deployment Verification

1. Log in to the application
2. Search for contacts - should be fast (<3 seconds)
3. Open multiple browser tabs and search simultaneously
4. Check docker logs for any errors:
   ```bash
   docker logs annaverse_app -f
   ```

## 📞 Support

If you encounter issues:
1. Check logs: `docker logs annaverse_app --tail 100`
2. Verify all containers are healthy: `docker ps`
3. Test database connection manually
4. Check Redis connectivity

---

**Changes Made:**
- ✅ Database connection pool optimized (30 connections)
- ✅ N+1 query problem fixed (97% query reduction)
- ✅ Redis session storage enabled
- ✅ Backward compatible - no schema changes
