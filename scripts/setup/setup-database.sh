#!/bin/bash

# Database Setup Script for AWS EC2
# This script sets up PostgreSQL database for the Fitness App

set -e

echo "========================================="
echo "Fitness App Database Setup"
echo "========================================="

# Configuration
DB_NAME="fitness_app"
DB_USER="fitness_user"
DB_PASSWORD=""

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

echo -e "${GREEN}Step 1: Checking PostgreSQL installation...${NC}"
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}PostgreSQL not found. Installing PostgreSQL 16 with pgvector...${NC}"

    # Install PostgreSQL 16
    apt-get update
    apt-get install -y gnupg lsb-release

    # Add PostgreSQL APT repository
    sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -

    apt-get update
    apt-get install -y postgresql-16 postgresql-contrib-16

    # Install pgvector extension
    apt-get install -y postgresql-16-pgvector

    # Start PostgreSQL
    systemctl start postgresql
    systemctl enable postgresql

    echo "PostgreSQL 16 with pgvector installed successfully"
else
    echo "PostgreSQL is already installed"
    # Ensure pgvector is installed for existing PostgreSQL
    echo -e "${YELLOW}Checking pgvector extension...${NC}"
    PG_VERSION=$(psql --version | grep -oP '(?<=PostgreSQL )\d+')
    apt-get update
    apt-get install -y postgresql-${PG_VERSION}-pgvector 2>/dev/null || echo "pgvector may already be installed or not available for this version"
fi

# Generate random password if not provided
if [ -z "$DB_PASSWORD" ]; then
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    echo -e "${YELLOW}Generated random password for database user${NC}"
fi

echo -e "${GREEN}Step 2: Creating database and user...${NC}"

# Run SQL commands as postgres user
sudo -u postgres psql <<EOF
-- Drop existing database and user if they exist (be careful!)
-- DROP DATABASE IF EXISTS ${DB_NAME};
-- DROP USER IF EXISTS ${DB_USER};

-- Create database user
CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';

-- Create database
CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};

-- Connect to the database and grant schema privileges
\c ${DB_NAME}
GRANT ALL ON SCHEMA public TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${DB_USER};

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "vector";

EOF

echo -e "${GREEN}Database setup completed!${NC}"

echo -e "${GREEN}Step 3: Configuring PostgreSQL for remote access...${NC}"

# Find PostgreSQL configuration directory
PG_VERSION=$(psql --version | grep -oP '(?<=PostgreSQL )\d+')
PG_CONFIG_DIR="/etc/postgresql/${PG_VERSION}/main"

# Backup original files
if [ ! -f "${PG_CONFIG_DIR}/postgresql.conf.backup" ]; then
    cp ${PG_CONFIG_DIR}/postgresql.conf ${PG_CONFIG_DIR}/postgresql.conf.backup
fi

if [ ! -f "${PG_CONFIG_DIR}/pg_hba.conf.backup" ]; then
    cp ${PG_CONFIG_DIR}/pg_hba.conf ${PG_CONFIG_DIR}/pg_hba.conf.backup
fi

# Configure PostgreSQL to listen on localhost only (more secure)
sed -i "s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/" ${PG_CONFIG_DIR}/postgresql.conf

# Add local authentication for the app user
grep -qxF "host    ${DB_NAME}    ${DB_USER}    127.0.0.1/32    scram-sha-256" ${PG_CONFIG_DIR}/pg_hba.conf || \
    echo "host    ${DB_NAME}    ${DB_USER}    127.0.0.1/32    scram-sha-256" >> ${PG_CONFIG_DIR}/pg_hba.conf

echo -e "${GREEN}Step 4: Restarting PostgreSQL...${NC}"
systemctl restart postgresql

echo -e "${GREEN}Step 5: Testing database connection...${NC}"
if PGPASSWORD=${DB_PASSWORD} psql -h localhost -U ${DB_USER} -d ${DB_NAME} -c "SELECT version();" > /dev/null 2>&1; then
    echo -e "${GREEN}Database connection successful!${NC}"
else
    echo -e "${RED}Database connection failed. Please check the configuration.${NC}"
    exit 1
fi

echo ""
echo "========================================="
echo -e "${GREEN}Database setup completed successfully!${NC}"
echo "========================================="
echo ""
echo "Database Information:"
echo "  Database Name: ${DB_NAME}"
echo "  Database User: ${DB_USER}"
echo "  Database Password: ${DB_PASSWORD}"
echo "  Host: localhost"
echo "  Port: 5432"
echo ""
echo -e "${YELLOW}IMPORTANT: Save these credentials securely!${NC}"
echo ""
echo "Update your backend .env file with:"
echo "  POSTGRES_HOST=localhost"
echo "  POSTGRES_PORT=5432"
echo "  POSTGRES_DB=${DB_NAME}"
echo "  POSTGRES_USER=${DB_USER}"
echo "  POSTGRES_PASSWORD=${DB_PASSWORD}"
echo ""
echo "Useful commands:"
echo "  - Connect to DB:     psql -h localhost -U ${DB_USER} -d ${DB_NAME}"
echo "  - Check status:      sudo systemctl status postgresql"
echo "  - View logs:         sudo tail -f /var/log/postgresql/postgresql-${PG_VERSION}-main.log"
echo ""
