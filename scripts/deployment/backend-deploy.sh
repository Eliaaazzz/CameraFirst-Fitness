#!/bin/bash

# Backend Deployment Script for AWS EC2 (Docker-based)
# This script deploys the Spring Boot application using Docker containers

set -e

# Error handling
trap 'echo -e "\n${RED}ERROR: Deployment failed at line $LINENO${NC}" >&2; exit 1' ERR

echo "========================================="
echo "Fitness App Docker Deployment"
echo "========================================="

# Configuration
DOCKER_IMAGE="${DOCKER_IMAGE:-fitnessdev/fitness-backend:latest}"
APP_DIR="/opt/fitness-app"
COMPOSE_FILE="/opt/fitness-app/docker-compose.prod.yml"
ENV_FILE="/opt/fitness-app/.env.prod"

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

echo -e "${GREEN}Step 1: Checking prerequisites...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install Docker first.${NC}"
    echo "Install with: curl -fsSL https://get.docker.com | sh"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}docker-compose not found. Installing...${NC}"
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

echo "Docker version: $(docker --version)"
if command -v docker-compose &> /dev/null; then
    echo "Docker Compose version: $(timeout 5 docker-compose --version 2>/dev/null || echo 'Could not get version')"
else
    echo -e "${YELLOW}docker-compose command not available after installation${NC}"
fi

echo -e "${GREEN}Step 2: Migrating from systemd (if needed)...${NC}"
if systemctl is-active --quiet fitness-app; then
    echo "Stopping old systemd service..."
    systemctl stop fitness-app
    systemctl disable fitness-app
    echo -e "${YELLOW}Old systemd service stopped and disabled${NC}"
fi

echo -e "${GREEN}Step 3: Creating application directories...${NC}"
mkdir -p ${APP_DIR}

echo -e "${GREEN}Step 4: Setting up environment file...${NC}"
if [ ! -f "${ENV_FILE}" ]; then
    cat > ${ENV_FILE} <<'EOF'
# ==========================================
# PRODUCTION ENVIRONMENT (EC2)
# ==========================================
# 生产环境: Postgres 在 Docker 容器, Redis 用 AWS ElastiCache

# Spring Profile
SPRING_PROFILES_ACTIVE=prod

# Database - AWS RDS
SPRING_DATASOURCE_URL=jdbc:postgresql://database-1.cdq2m4iswpu8.ap-southeast-2.rds.amazonaws.com:5432/fitness_mvp
SPRING_DATASOURCE_USERNAME=fitnessuser
SPRING_DATASOURCE_PASSWORD=CHANGE_ME_SECURE_PASSWORD

# Redis - AWS ElastiCache (更新为你的 ElastiCache 地址)
SPRING_DATA_REDIS_HOST=master.aura-redis.rz4l3i.apse2.cache.amazonaws.com
SPRING_DATA_REDIS_PORT=6379
SPRING_DATA_REDIS_PASSWORD=CHANGE_ME_REDIS_PASSWORD
SPRING_DATA_REDIS_SSL=false

# API Keys (Required)
YOUTUBE_API_KEY=
SPOONACULAR_API_KEY=
USDA_API_KEY=

# Google OAuth
GOOGLE_CLIENT_ID=

# AI APIs (Optional)
OPENAI_ENABLED=false
OPENAI_API_KEY=
GEMINI_API_KEY=

# Application Settings
APP_SEED_ENABLED=false
SERVER_PORT=8080
API_KEY=fitness-secret-key-123
APP_API_KEY=fitness-secret-key-123

# Cloudflare R2 Storage
R2_ACCESS_KEY=
R2_SECRET_ACCESS_KEY=
R2_ENDPOINT=
R2_BUCKET_NAME=aurafit
R2_PUBLIC_URL=
EOF
    echo -e "${YELLOW}Created .env.prod file. IMPORTANT: Edit ${ENV_FILE} with your configuration!${NC}"
    chmod 600 ${ENV_FILE}
else
    echo ".env.prod file already exists, keeping current configuration"
fi

echo -e "${GREEN}Step 5: Creating docker-compose.prod.yml...${NC}"
cat > ${COMPOSE_FILE} <<'EOF'
# ==========================================
# PRODUCTION DOCKER COMPOSE (EC2)
# ==========================================
# RDS PostgreSQL + AWS ElastiCache Redis
# 只运行 backend 容器

services:
  app:
    image: ${DOCKER_IMAGE}
    container_name: fitness-app
    restart: unless-stopped
    ports:
      - "8080:8080"
    env_file:
      - .env.prod
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8080/actuator/health"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 60s
EOF

echo -e "${GREEN}Step 6: Pulling latest Docker image...${NC}"
echo "Pulling image: ${DOCKER_IMAGE}"
echo -e "${GREEN}Pre-clean: reclaiming unused Docker space (safe)${NC}"
# By default run a safe prune to remove stopped containers, unused networks and dangling images.
# Override by setting DOCKER_CLEANUP=false to skip this step (e.g., in CI where caching matters).
if [ "${DOCKER_CLEANUP:-true}" = "true" ]; then
  echo "Running docker system prune -f to remove stopped containers, unused networks & dangling images..."
  # don't fail the deployment if prune fails for any reason
  docker system prune -f || echo -e "${YELLOW}docker system prune failed or returned non-zero; continuing${NC}"
else
  echo "DOCKER_CLEANUP is set to false; skipping docker space cleanup"
fi

if docker pull ${DOCKER_IMAGE}; then
    echo -e "${GREEN}Image pulled successfully${NC}"
else
    echo -e "${YELLOW}Could not pull image. Will use local image if available.${NC}"
fi

echo -e "${GREEN}Step 7: Stopping old containers...${NC}"
cd ${APP_DIR}
if docker-compose ps -q 2>/dev/null | grep -q .; then
    echo "Stopping running containers..."
    docker-compose down || true
else
    echo "No running containers to stop"
fi

echo -e "${GREEN}Step 8: Starting containers...${NC}"
echo "Starting services with image: ${DOCKER_IMAGE}"
docker-compose --env-file ${ENV_FILE} up -d

echo -e "${GREEN}Step 9: Waiting for application to be healthy...${NC}"
sleep 10

echo ""
echo "========================================="
echo -e "${GREEN}Deployment completed successfully!${NC}"
echo "========================================="
echo ""
echo "Container status:"
docker-compose ps
echo ""
echo "Application health:"
docker-compose exec -T app wget -qO- http://localhost:8080/actuator/health || echo "Still starting up..."
echo ""
echo "Useful commands:"
echo "  - View logs:         cd ${APP_DIR} && docker-compose logs -f app"
echo "  - Check status:      cd ${APP_DIR} && docker-compose ps"
echo "  - Restart app:       cd ${APP_DIR} && docker-compose restart app"
echo "  - Stop all:          cd ${APP_DIR} && docker-compose down"
echo "  - View DB logs:      cd ${APP_DIR} && docker-compose logs -f postgres"
echo "  - Access DB shell:   cd ${APP_DIR} && docker-compose exec postgres psql -U fitnessuser -d fitness_mvp"
echo ""
echo -e "${YELLOW}IMPORTANT: Edit ${ENV_FILE} with your secure passwords and API keys!${NC}"
echo ""
