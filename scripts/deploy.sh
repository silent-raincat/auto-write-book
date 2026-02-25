#!/bin/bash

# AI Novel Writing System - Cloud Deployment Script
# This script helps deploy the application to Vercel

set -e

echo "=========================================="
echo "AI Novel Writing System - Deployment"
echo "=========================================="
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Build the project
echo "Building project..."
npm run build:prod

# Ask for deployment type
echo ""
echo "Choose deployment type:"
echo "1) Production deployment"
echo "2) Preview deployment"
read -p "Enter choice (1 or 2): " choice

if [ "$choice" = "1" ]; then
    echo ""
    echo "Deploying to production..."
    vercel --prod
else
    echo ""
    echo "Deploying to preview..."
    vercel
fi

echo ""
echo "=========================================="
echo "Deployment complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Configure environment variables in Vercel dashboard"
echo "2. Set up Supabase database tables"
echo "3. Test your deployment"
echo ""
echo "See DEPLOYMENT.md for more details."
