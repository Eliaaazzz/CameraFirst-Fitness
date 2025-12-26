# AWS EC2 Deployment Guide - Backend Only

## 📦 Files in this package:
- `app.jar` - Your Spring Boot application (90MB)
- `Dockerfile` - Docker image configuration
- `docker-compose.yml` - Docker Compose configuration
- `.env.example` - Environment variables template
- `install-docker.sh` - Docker installation script
- `DEPLOY.md` - This file

---

## 🚀 Deployment Steps

### Step 1: Launch EC2 Instance

1. **Go to EC2 Console**: https://console.aws.amazon.com/ec2
2. Click **"Launch Instance"**
3. **Configure:**
   - Name: `fitness-backend`
   - AMI: **Amazon Linux 2023**
   - Instance type: **t3.medium** (2 vCPU, 4GB RAM)
   - Key pair: Create new or select existing
   - Network settings:
     - VPC: Select your existing VPC
     - Subnet: Select a **public subnet**
     - Auto-assign public IP: **Enable**
   - Security group:
     - SSH (22): Your IP
     - HTTP (80): 0.0.0.0/0
     - Custom TCP (8080): 0.0.0.0/0
   - Storage: **30 GB gp3**
4. Click **"Launch Instance"**

### Step 2: Connect to EC2

```bash
# Replace with your key and IP
ssh -i your-key.pem ec2-user@your-ec2-public-ip
```

### Step 3: Upload Files to EC2

On your local machine:

```bash
# Navigate to deployment folder
cd /Users/qingfengrumeng/Desktop/CameraFirst-Fitness/deployment/backend

# Upload all files (replace key and IP)
scp -i your-key.pem * ec2-user@your-ec2-public-ip:/home/ec2-user/

# Or use rsync
rsync -avz -e "ssh -i your-key.pem" . ec2-user@your-ec2-public-ip:/home/ec2-user/app/
```

### Step 4: Setup EC2 Instance

On EC2 instance:

```bash
# Install Docker
chmod +x install-docker.sh
./install-docker.sh

# Log out and back in (or run)
newgrp docker

# Create app directory
sudo mkdir -p /opt/fitness-app
sudo chown ec2-user:ec2-user /opt/fitness-app
cd /opt/fitness-app

# Move uploaded files
mv /home/ec2-user/{app.jar,Dockerfile,docker-compose.yml,.env.example} .

# Create .env file from example
cp .env.example .env
nano .env  # Edit with your actual values
```

### Step 5: Configure Environment Variables

Edit `/opt/fitness-app/.env`:

```bash
# Database - Replace with your RDS endpoint
DB_HOST=your-rds-instance.xxx.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=fitness_db
DB_USERNAME=admin
DB_PASSWORD=your-secure-password

# Redis - Replace with your ElastiCache endpoint
REDIS_HOST=your-redis-cluster.xxx.cache.amazonaws.com
REDIS_PORT=6379

# Your API Keys
SPOONACULAR_API_KEY=your-actual-key
YOUTUBE_API_KEY=your-actual-key
```

### Step 6: Start Application

```bash
cd /opt/fitness-app

# Build and start
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Test health
curl http://localhost:8080/actuator/health
```

### Step 7: Verify Deployment

```bash
# Test from outside EC2
curl http://your-ec2-public-ip:8080/actuator/health

# Should return: {"status":"UP"}
```

---

## 🔧 Management Commands

```bash
# View logs
docker-compose logs -f

# Restart application
docker-compose restart

# Stop application
docker-compose down

# Rebuild after changes
docker-compose up -d --build

# Check running containers
docker ps
```

---

## ⚠️ Prerequisites Needed

### 1. RDS PostgreSQL Database
- Create in AWS Console
- Engine: PostgreSQL 16
- Instance: db.t3.micro
- Public access: No (same VPC as EC2)
- Get endpoint from RDS console

### 2. ElastiCache Redis
- Create in AWS Console
- Engine: Redis 7.x
- Node type: cache.t3.micro
- Get endpoint from ElastiCache console

### 3. Security Groups
- EC2 → RDS: Port 5432
- EC2 → Redis: Port 6379
- Internet → EC2: Port 8080

---

## 🐛 Troubleshooting

### Application won't start
```bash
# Check logs
docker-compose logs

# Common issues:
# 1. Database connection - verify RDS endpoint and security group
# 2. Redis connection - verify ElastiCache endpoint
# 3. API keys - check .env file
```

### Can't connect from outside
```bash
# Check EC2 security group allows port 8080
# Check EC2 public IP is correct
# Test from EC2: curl localhost:8080/actuator/health
```

### Database errors
```bash
# Verify RDS security group allows EC2
# Test connection:
psql -h your-rds-endpoint -U admin -d fitness_db
```

---

## 📊 Monitoring

```bash
# CPU/Memory usage
docker stats

# Application logs
docker-compose logs -f app

# System resources
top
free -h
df -h
```

---

## 🔄 Updates

```bash
# After building new JAR locally, upload to EC2:
scp -i your-key.pem app.jar ec2-user@your-ec2-ip:/opt/fitness-app/

# On EC2:
cd /opt/fitness-app
docker-compose down
docker-compose up -d --build
```

---

## 💰 Estimated Monthly Cost
- EC2 t3.medium: ~$30
- RDS db.t3.micro: ~$15
- ElastiCache cache.t3.micro: ~$13
- Data transfer: ~$5
- **Total: ~$63/month**

---

## 🆘 Need Help?

1. Check application logs: `docker-compose logs -f`
2. Verify environment variables: `cat .env`
3. Test database connection from EC2
4. Check security group rules in AWS Console
