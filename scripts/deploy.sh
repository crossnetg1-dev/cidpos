#!/bin/bash

# POS System Deployment Script
# This script automates the deployment process for updates

set -e  # Exit on any error

echo "🚀 Starting POS System Deployment..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

# Check if we're in the project directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root directory."
    exit 1
fi

# Step 1: Pull latest changes
print_info "Step 1: Pulling latest changes from Git..."
if git pull; then
    print_success "Git pull completed"
else
    print_error "Git pull failed. Continuing anyway..."
fi
echo ""

# Step 2: Install dependencies
print_info "Step 2: Installing dependencies..."
if npm install; then
    print_success "Dependencies installed"
else
    print_error "npm install failed"
    exit 1
fi
echo ""

# Step 3: Generate Prisma Client
print_info "Step 3: Generating Prisma Client..."
if npx prisma generate; then
    print_success "Prisma Client generated"
else
    print_error "Prisma generate failed"
    exit 1
fi
echo ""

# Step 4: Push database schema (if changed)
print_info "Step 4: Updating database schema..."
if npx prisma db push --accept-data-loss; then
    print_success "Database schema updated"
else
    print_error "Database schema update failed"
    exit 1
fi
echo ""

# Step 5: Build the application
print_info "Step 5: Building Next.js application..."
if npm run build; then
    print_success "Build completed successfully"
else
    print_error "Build failed"
    exit 1
fi
echo ""

# Step 6: Restart PM2 application
print_info "Step 6: Restarting application with PM2..."
if pm2 restart pos-system; then
    print_success "Application restarted"
else
    print_error "PM2 restart failed. Trying to start instead..."
    pm2 start npm --name "pos-system" -- start || {
        print_error "Failed to start application with PM2"
        exit 1
    }
fi
echo ""

# Step 7: Show PM2 status
print_info "Application Status:"
pm2 status
echo ""

# Step 8: Show recent logs
print_info "Recent logs (last 20 lines):"
pm2 logs pos-system --lines 20 --nostream
echo ""

print_success "🎉 Deployment completed successfully!"
print_info "Your application should be running at http://YOUR_PUBLIC_IP"
print_info "To view live logs, run: pm2 logs pos-system"

