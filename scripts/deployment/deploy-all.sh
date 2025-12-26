#!/bin/bash

# Master Deployment Script for Fitness App on AWS EC2
# This script orchestrates the complete deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

clear

cat <<'EOF'
========================================
    Fitness App Deployment
    Complete Setup for AWS EC2
========================================
EOF

echo ""
echo "This script will:"
echo "  1. Install system dependencies (Java, PostgreSQL, Redis, Nginx)"
echo "  2. Set up the database"
echo "  3. Set up Redis cache"
echo "  4. Deploy the backend Spring Boot application"
echo "  5. Deploy the frontend React Native Web application"
echo "  6. Configure Nginx as reverse proxy"
echo ""

read -p "Do you want to continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}This script must be run as root (use sudo)${NC}"
   exit 1
fi

# Check if we're on Ubuntu/Debian
if ! command -v apt-get &> /dev/null; then
    echo -e "${RED}This script is designed for Ubuntu/Debian systems${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Phase 1: Installing System Dependencies${NC}"
echo -e "${BLUE}========================================${NC}"

echo -e "${GREEN}Updating package lists...${NC}"
apt-get update

echo -e "${GREEN}Installing Java 21...${NC}"
if ! command -v java &> /dev/null || ! java -version 2>&1 | grep -q "21"; then
    # Install Java 21
    apt-get install -y openjdk-21-jdk
else
    echo "Java 21 is already installed"
fi

echo -e "${GREEN}Installing PostgreSQL...${NC}"
if ! command -v psql &> /dev/null; then
    apt-get install -y postgresql postgresql-contrib
else
    echo "PostgreSQL is already installed"
fi

echo -e "${GREEN}Installing Redis...${NC}"
if ! command -v redis-server &> /dev/null; then
    apt-get install -y redis-server
else
    echo "Redis is already installed"
fi

echo -e "${GREEN}Installing Nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    apt-get install -y nginx
else
    echo "Nginx is already installed"
fi

echo -e "${GREEN}Installing utilities...${NC}"
apt-get install -y curl wget openssl

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Phase 2: Database Setup${NC}"
echo -e "${BLUE}========================================${NC}"

if [ -f "./setup-database.sh" ]; then
    chmod +x ./setup-database.sh
    ./setup-database.sh
else
    echo -e "${YELLOW}Warning: setup-database.sh not found, skipping database setup${NC}"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Phase 3: Redis Setup${NC}"
echo -e "${BLUE}========================================${NC}"

if [ -f "./setup-redis.sh" ]; then
    chmod +x ./setup-redis.sh
    ./setup-redis.sh
else
    echo -e "${YELLOW}Warning: setup-redis.sh not found, skipping Redis setup${NC}"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Phase 4: Backend Deployment${NC}"
echo -e "${BLUE}========================================${NC}"

if [ -f "./backend-deploy.sh" ]; then
    chmod +x ./backend-deploy.sh
    ./backend-deploy.sh
else
    echo -e "${YELLOW}Warning: backend-deploy.sh not found, skipping backend deployment${NC}"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Phase 5: Frontend Deployment${NC}"
echo -e "${BLUE}========================================${NC}"

if [ -f "./frontend-deploy.sh" ]; then
    chmod +x ./frontend-deploy.sh
    ./frontend-deploy.sh
else
    echo -e "${YELLOW}Warning: frontend-deploy.sh not found, skipping frontend deployment${NC}"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Phase 6: Firewall Configuration${NC}"
echo -e "${BLUE}========================================${NC}"

if command -v ufw &> /dev/null; then
    echo -e "${GREEN}Configuring UFW firewall...${NC}"

    # Enable UFW if not already enabled
    if ! ufw status | grep -q "Status: active"; then
        echo "y" | ufw enable
    fi

    # Allow SSH
    ufw allow 22/tcp

    # Allow HTTP and HTTPS
    ufw allow 80/tcp
    ufw allow 443/tcp

    # Show status
    ufw status numbered

    echo -e "${GREEN}Firewall configured${NC}"
else
    echo -e "${YELLOW}UFW not found, skipping firewall configuration${NC}"
    echo "Make sure to configure your AWS Security Group to allow:"
    echo "  - Port 22 (SSH)"
    echo "  - Port 80 (HTTP)"
    echo "  - Port 443 (HTTPS)"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next Steps:"
echo ""
echo "1. Configure the backend environment:"
echo "   sudo nano /opt/fitness-app/.env"
echo "   Update all CHANGE_ME values with real credentials"
echo ""
echo "2. Configure the nginx site:"
echo "   sudo nano /etc/nginx/sites-available/fitness-app"
echo "   Set your domain name"
echo ""
echo "3. Restart services:"
echo "   sudo systemctl restart fitness-app"
echo "   sudo systemctl reload nginx"
echo ""
echo "4. Set up SSL/HTTPS (recommended):"
echo "   sudo apt-get install certbot python3-certbot-nginx"
echo "   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com"
echo ""
echo "5. Check service status:"
echo "   sudo systemctl status fitness-app"
echo "   sudo systemctl status nginx"
echo ""
echo "6. View logs:"
echo "   Backend:  sudo journalctl -u fitness-app -f"
echo "   Frontend: sudo tail -f /var/log/nginx/fitness-app-access.log"
echo ""
echo -e "${YELLOW}IMPORTANT SECURITY REMINDERS:${NC}"
echo "  - Update all default passwords in /opt/fitness-app/.env"
echo "  - Set up SSL/HTTPS before going to production"
echo "  - Configure AWS Security Groups properly"
echo "  - Set up regular database backups"
echo "  - Monitor application logs"
echo ""
echo "Your application should be accessible at:"
echo "  http://your-server-ip/"
echo ""
echo -e "${GREEN}Happy deploying! 🚀${NC}"
echo ""
