@echo off
REM AnnaVerse Production Deployment Script (Windows)
REM This script automates the full deployment process

echo 🚀 Starting AnnaVerse deployment...
echo =================================

REM Step 1: Pull latest code
echo 📥 Pulling latest code from main branch...
git pull origin main
if %errorlevel% neq 0 (
    echo ❌ Git pull failed!
    pause
    exit /b %errorlevel%
)

REM Step 2: Stop containers
echo ⏹️  Stopping containers...
docker compose down
if %errorlevel% neq 0 (
    echo ❌ Failed to stop containers!
    pause
    exit /b %errorlevel%
)

REM Step 3: Build with no cache
echo 🔨 Building containers (no cache)...
docker compose build --no-cache app
if %errorlevel% neq 0 (
    echo ❌ Build failed!
    pause
    exit /b %errorlevel%
)

REM Step 4: Start containers
echo ▶️  Starting containers...
docker compose up -d
if %errorlevel% neq 0 (
    echo ❌ Failed to start containers!
    pause
    exit /b %errorlevel%
)

REM Step 5: Show status
echo 📊 Container status:
docker compose ps

echo.
echo ✅ Deployment complete!
echo 🔍 To view logs: docker compose logs -f app
echo 🌐 Site should be available at: https://annaverseapp.com
pause