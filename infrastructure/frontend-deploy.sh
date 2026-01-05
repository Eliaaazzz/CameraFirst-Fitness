#!/bin/bash
# ==========================================
# FRONTEND DEPLOYMENT SCRIPT
# ==========================================
# Usage: ./frontend-deploy.sh <build-file>
# This script deploys the frontend build to the web server directory

set -euo pipefail

BUILD_FILE="${1:-}"
DEPLOY_DIR="/var/www/fitness-app"
BACKUP_DIR="/var/www/fitness-app-backup-$(date +%s)"

if [ -z "$BUILD_FILE" ]; then
    echo "Usage: $0 <build-file.tar.gz>"
    exit 1
fi

if [ ! -f "$BUILD_FILE" ]; then
    echo "Error: Build file not found: $BUILD_FILE"
    exit 1
fi

echo "Starting frontend deployment..."
echo "Build file: $BUILD_FILE"
echo "Deploy directory: $DEPLOY_DIR"

# Backup current version if exists
if [ -d "$DEPLOY_DIR" ] && [ "$(ls -A "$DEPLOY_DIR" 2>/dev/null)" ]; then
    echo "Backing up current version to $BACKUP_DIR..."
    sudo cp -r "$DEPLOY_DIR" "$BACKUP_DIR"
fi

# Create deploy directory if it doesn't exist
sudo mkdir -p "$DEPLOY_DIR"

# Extract new build
echo "Extracting new build..."
sudo tar -xzf "$BUILD_FILE" -C "$DEPLOY_DIR"

# Verify deployment
echo "Verifying deployment..."
if [ ! -f "$DEPLOY_DIR/index.html" ]; then
    echo "Deployment verification failed - index.html not found"
    if [ -d "$BACKUP_DIR" ]; then
        echo "Rolling back to previous version..."
        sudo rm -rf "$DEPLOY_DIR"/*
        sudo cp -r "$BACKUP_DIR"/* "$DEPLOY_DIR/"
        echo "Rollback complete"
    fi
    exit 1
fi

echo "Frontend deployed successfully!"
echo "Deployed files:"
sudo ls -lah "$DEPLOY_DIR" | head -20

# Cleanup build file
rm -f "$BUILD_FILE"

echo "Deployment complete!"
