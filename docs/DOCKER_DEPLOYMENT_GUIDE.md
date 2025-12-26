# Docker Deployment Guide

This guide explains how to deploy your fitness app using the new Docker-based CI/CD pipeline.

## Overview

The deployment process has been modernized from JAR-based systemd deployment to containerized Docker deployment:

**Old Way**: GitHub builds JAR → SCP to EC2 → systemd runs Java
**New Way**: GitHub builds Docker image → Push to Docker Hub → EC2 pulls and runs containers

## Prerequisites

### 1. Docker Hub Account

1. Create a free account at [hub.docker.com](https://hub.docker.com/)
2. Create a repository named `fitness-backend` (can be public or private)
3. Generate an access token:
   - Go to Account Settings → Security → New Access Token
   - Give it a descriptive name like "GitHub Actions"
   - Copy the token (you won't see it again!)

### 2. GitHub Secrets

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

| Secret Name | Description | Example |
|------------|-------------|---------|
| `DOCKERHUB_USERNAME` | Your Docker Hub username | `myusername` |
| `DOCKERHUB_TOKEN` | Docker Hub access token | `dckr_pat_xxxxx...` |
| `EC2_HOST` | Your EC2 public IP or domain | `54.123.45.67` or `api.mydomain.com` |
| `EC2_USER` | SSH user for EC2 | `ec2-user` or `ubuntu` |
| `EC2_SSH_KEY_B64` | Base64-encoded SSH private key | See below |

#### Encoding SSH Key to Base64

On Mac/Linux:
```bash
cat ~/.ssh/your-ec2-key.pem | base64 | pbcopy
# Now paste into GitHub secret
```

On Windows (PowerShell):
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\path\to\your-key.pem")) | clip
# Now paste into GitHub secret
```

## How It Works

### GitHub Actions Workflow

When you push code to `main` or `CF-17-mvp` branches:

1. **Build Stage** (Job: `build-and-push`)
   - Builds Docker image using your Dockerfile
   - Tags with branch name, commit SHA, and `latest`
   - Pushes to Docker Hub
   - Uses GitHub Actions cache for faster builds

2. **Deploy Stage** (Job: `deploy`)
   - SSHs into your EC2 instance
   - Uploads `backend-deploy.sh`
   - Runs the deployment script which:
     - Pulls the latest Docker image from Docker Hub
     - Stops old containers
     - Starts new containers (app + PostgreSQL + Redis)
   - Verifies the deployment with health checks

### On EC2

The deployment script creates this structure:

```
/opt/fitness-app/
├── .env                    # Environment variables (edit this!)
├── docker-compose.yml      # Service orchestration
└── data/
    ├── postgres/          # PostgreSQL data (persists across deployments)
    └── redis/             # Redis data (persists across deployments)
```

## First-Time Setup on EC2

### 1. SSH into your EC2 instance

```bash
ssh -i your-key.pem ec2-user@your-ec2-host
```

### 2. Install Docker (Amazon Linux 2023)

```bash
sudo yum update -y
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user
```

Log out and back in for group changes to take effect.

### 3. Configure Environment

After the first deployment, edit the environment file:

```bash
sudo nano /opt/fitness-app/.env
```

Update these critical values:
```bash
# IMPORTANT: Change this from default!
POSTGRES_PASSWORD=your_secure_password_here

# Optional: Add your API keys
YOUTUBE_API_KEY=your_youtube_key
SPOONACULAR_API_KEY=your_spoonacular_key
OPENAI_ENABLED=true
OPENAI_API_KEY=your_openai_key
```

Then restart the services:
```bash
cd /opt/fitness-app
sudo docker-compose down
sudo docker-compose up -d
```

## Manual Deployment (Optional)

If you want to deploy manually instead of using GitHub Actions:

### Build locally
```bash
cd /path/to/project
docker build -f infrastructure/backend/Dockerfile -t yourusername/fitness-backend:latest ./backend
docker push yourusername/fitness-backend:latest
```

### Deploy to EC2
```bash
# Copy deployment script
scp infrastructure/backend-deploy.sh ec2-user@your-host:/tmp/

# SSH and deploy
ssh ec2-user@your-host
export DOCKER_IMAGE="yourusername/fitness-backend:latest"
cd /tmp
sudo bash backend-deploy.sh
```

## Testing Locally with Docker Compose

You can test the entire stack locally before deploying:

```bash
# Navigate to infrastructure/backend
cd infrastructure/backend

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Access the app
open http://localhost:8080/swagger-ui.html

# Stop all services
docker-compose down
```

## Useful Commands on EC2

```bash
# View logs
cd /opt/fitness-app
sudo docker-compose logs -f app         # App logs
sudo docker-compose logs -f postgres    # Database logs

# Check status
sudo docker-compose ps

# Restart just the app (without rebuilding DB)
sudo docker-compose restart app

# Access database shell
sudo docker-compose exec postgres psql -U fitnessuser -d fitness_mvp

# Stop everything
sudo docker-compose down

# Stop and remove all data (DANGER!)
sudo docker-compose down -v
```

## Rollback

If a deployment breaks, you can rollback to a previous image:

```bash
ssh ec2-user@your-host
cd /opt/fitness-app

# Find previous image tags at hub.docker.com
export DOCKER_IMAGE="yourusername/fitness-backend:CF-17-mvp-abc1234"

# Update docker-compose.yml to use that tag
sudo sed -i "s|image: .*|image: ${DOCKER_IMAGE}|" docker-compose.yml

# Restart
sudo docker-compose up -d
```

## Troubleshooting

### Build fails in GitHub Actions

- **Error: "failed to solve: failed to compute cache key"**
  - Ensure all files referenced in Dockerfile exist
  - Check that `gradle.properties` exists in backend directory

- **Error: "denied: requested access to the resource is denied"**
  - Verify `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` secrets are correct
  - Make sure Docker Hub repository exists

### Deployment fails on EC2

- **Error: "Cannot connect to the Docker daemon"**
  ```bash
  sudo systemctl start docker
  ```

- **App won't start - port already in use**
  ```bash
  # Check what's using port 8080
  sudo lsof -i :8080
  # If it's the old systemd service:
  sudo systemctl stop fitness-app
  sudo systemctl disable fitness-app
  ```

- **Database connection errors**
  - Check PostgreSQL is healthy: `docker-compose ps`
  - Verify password in `.env` matches what app expects

### Health check fails

```bash
# Check if containers are running
docker-compose ps

# Check app logs
docker-compose logs app | tail -50

# Try health check manually
curl http://localhost:8080/actuator/health

# If Spring Boot isn't starting, check Java errors
docker-compose logs app | grep -i error
```

## Security Best Practices

1. **Never commit secrets** - Use `.env` files (which are in `.gitignore`)
2. **Change default passwords** - Update `POSTGRES_PASSWORD` in production
3. **Use Redis password** - Set `REDIS_PASSWORD` for production
4. **Restrict EC2 security group** - Only allow port 22 (SSH) from your IP and port 8080 from your load balancer
5. **Enable HTTPS** - Use nginx reverse proxy with Let's Encrypt SSL

## Next Steps

After successful deployment:

1. Set up nginx reverse proxy for HTTPS
2. Configure CloudWatch logs for monitoring
3. Set up automated backups for PostgreSQL data
4. Consider using AWS Secrets Manager for sensitive env vars
5. Implement blue-green deployments for zero-downtime updates

## Questions?

- Review the workflow file: `.github/workflows/deploy-backend.yml`
- Check deployment script: `infrastructure/backend-deploy.sh`
- Review Dockerfile: `infrastructure/backend/Dockerfile`
