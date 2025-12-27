#!/bin/bash

# Frontend Deployment Script for AWS EC2
# This script deploys the React Native Web application
# Usage: ./frontend-deploy.sh [--skip-nginx]

set -e

# Colors for output (defined early for error trap)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Error handling
trap 'echo -e "\n${RED}ERROR: Deployment failed at line $LINENO${NC}" >&2; exit 1' ERR

# Parse arguments
SKIP_NGINX=false
for arg in "$@"; do
    case $arg in
        --skip-nginx)
            SKIP_NGINX=true
            shift
            ;;
    esac
done

echo "========================================="
echo "Fitness App Frontend Deployment"
echo "========================================="

# Configuration
APP_NAME="aurafitness"
WEB_ROOT="/var/www/${APP_NAME}"
NGINX_CONF_DIR="/etc/nginx/conf.d"
NGINX_CONF="${NGINX_CONF_DIR}/${APP_NAME}.conf"
SOURCE_DIR="./dist"
BACKUP_DIR="/var/backups/${APP_NAME}"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}This script must be run as root${NC}"
   exit 1
fi

echo -e "${GREEN}Step 1: Checking prerequisites...${NC}"

# Check if nginx is installed
if ! command -v nginx &> /dev/null; then
    echo -e "${YELLOW}Nginx not found. Installing...${NC}"
    # Detect package manager (Amazon Linux uses dnf/yum)
    if command -v dnf &> /dev/null; then
        dnf install -y nginx
    elif command -v yum &> /dev/null; then
        yum install -y nginx
    elif command -v apt-get &> /dev/null; then
        apt-get update
        apt-get install -y nginx
    else
        echo -e "${RED}Error: No supported package manager found${NC}"
        exit 1
    fi
fi

# Check if source directory exists
if [ ! -d "${SOURCE_DIR}" ]; then
    echo -e "${RED}Error: Source directory not found: ${SOURCE_DIR}${NC}"
    echo "Please ensure you've built the frontend with: npx expo export --platform web"
    exit 1
fi

echo -e "${GREEN}Step 2: Creating web root directory...${NC}"
mkdir -p ${WEB_ROOT}
mkdir -p ${BACKUP_DIR}

echo -e "${GREEN}Step 3: Backing up existing files...${NC}"
if [ -d "${WEB_ROOT}" ] && [ "$(ls -A ${WEB_ROOT})" ]; then
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    tar -czf ${BACKUP_DIR}/frontend-${TIMESTAMP}.tar.gz -C ${WEB_ROOT} . 2>/dev/null || true
    echo "Backup created: ${BACKUP_DIR}/frontend-${TIMESTAMP}.tar.gz"
fi

echo -e "${GREEN}Step 4: Removing old files...${NC}"
rm -rf ${WEB_ROOT}/*

echo -e "${GREEN}Step 5: Copying new frontend files...${NC}"
cp -r ${SOURCE_DIR}/* ${WEB_ROOT}/
echo "Frontend files copied to ${WEB_ROOT}"

echo -e "${GREEN}Step 6: Creating .env.production for runtime config...${NC}"
cat > ${WEB_ROOT}/.env.production <<EOF
# Frontend Runtime Configuration
# This file can be read by the client-side app

# Backend API URL
REACT_APP_API_URL=http://localhost:8080

# Environment
REACT_APP_ENV=production
EOF
echo -e "${YELLOW}Update ${WEB_ROOT}/.env.production with your API URL${NC}"

echo -e "${GREEN}Step 7: Setting permissions...${NC}"
# Detect nginx user (Amazon Linux uses 'nginx', Debian/Ubuntu uses 'www-data')
if id "nginx" &>/dev/null; then
    NGINX_USER="nginx"
elif id "www-data" &>/dev/null; then
    NGINX_USER="www-data"
else
    NGINX_USER="root"
    echo -e "${YELLOW}Warning: Using root user (nginx/www-data user not found)${NC}"
fi
chown -R ${NGINX_USER}:${NGINX_USER} ${WEB_ROOT}
find ${WEB_ROOT} -type f -exec chmod 644 {} \;
find ${WEB_ROOT} -type d -exec chmod 755 {} \;

if [ "$SKIP_NGINX" = true ]; then
    echo -e "${YELLOW}Step 8: Skipping nginx configuration (using existing config)${NC}"
else
    echo -e "${GREEN}Step 8: Installing nginx configuration...${NC}"
    if [ -f "./aurafitness.conf" ]; then
        cp ./aurafitness.conf ${NGINX_CONF}
        echo "Nginx config copied to ${NGINX_CONF}"
    else
        echo -e "${YELLOW}Warning: aurafitness.conf not found in current directory${NC}"
        echo "You'll need to configure nginx manually"
    fi

    echo -e "${GREEN}Step 9: Testing nginx configuration...${NC}"
    nginx -t

    echo -e "${GREEN}Step 10: Reloading nginx...${NC}"
    systemctl reload nginx
fi

echo ""
echo "========================================="
echo -e "${GREEN}Frontend deployment completed!${NC}"
echo "========================================="
echo ""
echo "Frontend location: ${WEB_ROOT}"
if [ "$SKIP_NGINX" = true ]; then
    echo "Nginx config: Using existing configuration (not modified)"
else
    echo "Nginx config: ${NGINX_CONF}"
fi
echo ""
echo "Useful commands:"
echo "  - Check nginx status:  sudo systemctl status nginx"
echo "  - View nginx logs:     sudo tail -f /var/log/nginx/access.log"
echo "  - Reload nginx:        sudo systemctl reload nginx"
echo "  - Test nginx config:   sudo nginx -t"
echo ""
if [ "$SKIP_NGINX" = false ]; then
    echo -e "${YELLOW}IMPORTANT: Update the following files:${NC}"
    echo "  1. ${NGINX_CONF} - Set your domain name"
    echo "  2. ${WEB_ROOT}/.env.production - Set your API URL"
    echo ""
    echo "Then reload nginx: sudo systemctl reload nginx"
fi
echo ""
