@echo off
REM AI Novel Writing System - Cloud Deployment Script for Windows

echo ==========================================
echo AI Novel Writing System - Deployment
echo ==========================================
echo.

REM Check if Vercel CLI is installed
where vercel >nul 2>nul
if %errorlevel% neq 0 (
    echo Vercel CLI not found. Installing...
    npm install -g vercel
)

REM Build the project
echo Building project...
call npm run build:prod

REM Ask for deployment type
echo.
echo Choose deployment type:
echo 1) Production deployment
echo 2) Preview deployment
set /p choice="Enter choice (1 or 2): "

if "%choice%"=="1" (
    echo.
    echo Deploying to production...
    call vercel --prod
) else (
    echo.
    echo Deploying to preview...
    call vercel
)

echo.
echo ==========================================
echo Deployment complete!
echo ==========================================
echo.
echo Next steps:
echo 1. Configure environment variables in Vercel dashboard
echo 2. Set up Supabase database tables
echo 3. Test your deployment
echo.
echo See DEPLOYMENT.md for more details.

pause
