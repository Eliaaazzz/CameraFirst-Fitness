#!/bin/bash

# Redis Setup Script for AWS EC2
# This script sets up Redis for the Fitness App

set -e

echo "========================================="
echo "Fitness App Redis Setup"
echo "========================================="

# Configuration
REDIS_PASSWORD=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}This script must be run as root${NC}"
   exit 1
fi

echo -e "${GREEN}Step 1: Checking Redis installation...${NC}"
if ! command -v redis-server &> /dev/null; then
    echo -e "${YELLOW}Redis not found. Installing Redis...${NC}"

    # Install Redis
    apt-get update
    apt-get install -y redis-server

    echo "Redis installed successfully"
else
    echo "Redis is already installed"
fi

# Generate random password if not provided
if [ -z "$REDIS_PASSWORD" ]; then
    REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    echo -e "${YELLOW}Generated random password for Redis${NC}"
fi

echo -e "${GREEN}Step 2: Configuring Redis...${NC}"

# Backup original config
if [ ! -f "/etc/redis/redis.conf.backup" ]; then
    cp /etc/redis/redis.conf /etc/redis/redis.conf.backup
fi

# Configure Redis
cat >> /etc/redis/redis.conf <<EOF

# Fitness App Configuration
# Added by setup script

# Bind to localhost only (more secure)
bind 127.0.0.1 ::1

# Set password
requirepass ${REDIS_PASSWORD}

# Persistence
save 900 1
save 300 10
save 60 10000

# Memory
maxmemory 256mb
maxmemory-policy allkeys-lru

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log

# Performance
tcp-backlog 511
timeout 0
tcp-keepalive 300
EOF

echo -e "${GREEN}Step 3: Enabling Redis service...${NC}"
systemctl enable redis-server
systemctl restart redis-server

echo -e "${GREEN}Step 4: Testing Redis connection...${NC}"
if redis-cli -a ${REDIS_PASSWORD} ping | grep -q "PONG"; then
    echo -e "${GREEN}Redis connection successful!${NC}"
else
    echo -e "${RED}Redis connection failed. Please check the configuration.${NC}"
    exit 1
fi

# Set up firewall (if ufw is installed)
if command -v ufw &> /dev/null; then
    echo -e "${GREEN}Step 5: Configuring firewall...${NC}"
    # Redis should only be accessible locally, so no need to open external ports
    echo "Redis is configured to listen on localhost only (secure)"
fi

echo ""
echo "========================================="
echo -e "${GREEN}Redis setup completed successfully!${NC}"
echo "========================================="
echo ""
echo "Redis Information:"
echo "  Host: localhost"
echo "  Port: 6379"
echo "  Password: ${REDIS_PASSWORD}"
echo ""
echo -e "${YELLOW}IMPORTANT: Save this password securely!${NC}"
echo ""
echo "Update your backend .env file with:"
echo "  REDIS_HOST=localhost"
echo "  REDIS_PORT=6379"
echo "  REDIS_PASSWORD=${REDIS_PASSWORD}"
echo ""
echo "Useful commands:"
echo "  - Check status:      sudo systemctl status redis-server"
echo "  - View logs:         sudo tail -f /var/log/redis/redis-server.log"
echo "  - Connect to Redis:  redis-cli -a ${REDIS_PASSWORD}"
echo "  - Test connection:   redis-cli -a ${REDIS_PASSWORD} ping"
echo "  - Monitor commands:  redis-cli -a ${REDIS_PASSWORD} monitor"
echo ""
