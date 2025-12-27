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
COMPOSE_FILE="/opt/fitness-app/docker-compose.yml"
ENV_FILE="/opt/fitness-app/.env"
POSTGRES_DATA_DIR="/opt/fitness-app/data/postgres"
REDIS_DATA_DIR="/opt/fitness-app/data/redis"

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
mkdir -p ${POSTGRES_DATA_DIR}
mkdir -p ${REDIS_DATA_DIR}

echo -e "${GREEN}Step 4: Setting up environment file...${NC}"
if [ ! -f "${ENV_FILE}" ]; then
    cat > ${ENV_FILE} <<'EOF'
# Docker Compose Environment Variables
# IMPORTANT: Update these values for production!

# Spring Profile
SPRING_PROFILES_ACTIVE=prod

# Database Password (CHANGE THIS!)
POSTGRES_PASSWORD=CHANGE_ME_SECURE_PASSWORD

# Redis Password (Optional, leave empty for no password)
REDIS_PASSWORD=

# API Keys (Optional - app works without these)
OPENAI_ENABLED=false
OPENAI_API_KEY=
YOUTUBE_API_KEY=
SPOONACULAR_API_KEY=

# Application Settings
APP_SEED_ENABLED=true
EOF
    echo -e "${YELLOW}Created .env file. IMPORTANT: Edit ${ENV_FILE} with your configuration!${NC}"
    chmod 600 ${ENV_FILE}
else
    echo ".env file already exists, keeping current configuration"
fi

echo -e "${GREEN}Step 5: Creating docker-compose.yml...${NC}"
cat > ${COMPOSE_FILE} <<'EOF'
services:
  postgres:
    image: postgres:16-alpine
    container_name: fitness-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: fitness_mvp
      POSTGRES_USER: fitnessuser
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      PGDATA: /var/lib/postgresql/data/pgdata
    ports:
      - "5432:5432"
    volumes:
      - /opt/fitness-app/data/postgres:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U fitnessuser -d fitness_mvp"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: fitness-redis
    restart: unless-stopped
    command: redis-server --appendonly yes ${REDIS_PASSWORD:+--requirepass ${REDIS_PASSWORD}}
    ports:
      - "6379:6379"
    volumes:
      - /opt/fitness-app/data/redis:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  app:
    image: ${DOCKER_IMAGE}
    container_name: fitness-app
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      SPRING_PROFILES_ACTIVE: ${SPRING_PROFILES_ACTIVE:-prod}
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/fitness_mvp
      SPRING_DATASOURCE_USERNAME: fitnessuser
      SPRING_DATASOURCE_PASSWORD: ${POSTGRES_PASSWORD}
      SPRING_REDIS_HOST: redis
      SPRING_REDIS_PORT: 6379
      SPRING_REDIS_PASSWORD: ${REDIS_PASSWORD:-}
      OPENAI_ENABLED: ${OPENAI_ENABLED:-false}
      OPENAI_API_KEY: ${OPENAI_API_KEY:-}
      YOUTUBE_API_KEY: ${YOUTUBE_API_KEY:-}
      SPOONACULAR_API_KEY: ${SPOONACULAR_API_KEY:-}
      SERVER_PORT: 8080
      APP_SEED_ENABLED: ${APP_SEED_ENABLED:-true}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
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
