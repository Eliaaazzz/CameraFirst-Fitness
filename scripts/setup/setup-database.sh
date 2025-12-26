#!/bin/bash

# Database Setup Script for CameraFirst-Fitness
# This script creates the PostgreSQL database and user for local development

echo "🗄️  Setting up PostgreSQL database for CameraFirst-Fitness..."
echo ""

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed or not in PATH"
    echo "Please install PostgreSQL first:"
    echo "  brew install postgresql@15"
    exit 1
fi

# Check if PostgreSQL is running
if ! pg_isready -q; then
    echo "⚠️  PostgreSQL is not running. Starting it now..."
    brew services start postgresql@15
    sleep 3
fi

echo "✅ PostgreSQL is running"
echo ""

# Create database user
echo "Creating database user 'fitnessuser'..."
psql postgres -c "CREATE USER fitnessuser WITH PASSWORD 'dev_password';" 2>/dev/null || echo "User already exists"

# Create database
echo "Creating database 'fitness_mvp'..."
psql postgres -c "CREATE DATABASE fitness_mvp OWNER fitnessuser;" 2>/dev/null || echo "Database already exists"

# Grant privileges
echo "Granting privileges..."
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE fitness_mvp TO fitnessuser;"
psql fitness_mvp -c "GRANT ALL ON SCHEMA public TO fitnessuser;"

echo ""
echo "✅ Database setup complete!"
echo ""
echo "📝 Database connection details:"
echo "   Host: localhost"
echo "   Port: 5432"
echo "   Database: fitness_mvp"
echo "   User: fitnessuser"
echo "   Password: dev_password"
echo ""
echo "🚀 You can now start the application with:"
echo "   ./gradlew bootRun"
