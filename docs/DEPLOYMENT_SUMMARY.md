# Fitness App Deployment Summary

Quick reference for deploying your Fitness App to AWS EC2.

## 📦 What's Been Built

### Backend
- **Location**: `build/libs/fitness-app-0.0.1-SNAPSHOT.jar`
- **Size**: ~90 MB (Spring Boot fat JAR with all dependencies)
- **Tech Stack**: Spring Boot 3.3.5, Java 21, PostgreSQL, Redis
- **Features**: REST API, AI integration (OpenAI), YouTube API, OAuth2, image processing

### Frontend
- **Location**: `fitness-mvp/dist/`
- **Size**: ~3 MB (static web bundle)
- **Tech Stack**: React Native Web, Expo, Material Design 3
- **Features**: Responsive web app, goals tracking, recipes, workouts, nutrition

## 📂 Deployment Files

```
deployment/
├── deploy-all.sh              # Master deployment script (runs everything)
├── backend-deploy.sh          # Deploy Spring Boot backend
├── frontend-deploy.sh         # Deploy React Native Web frontend
├── setup-database.sh          # Set up PostgreSQL database
├── setup-redis.sh             # Set up Redis cache
├── nginx-frontend.conf        # Nginx configuration
├── env.template               # Environment variables template
├── EC2_DEPLOYMENT_GUIDE.md    # Complete deployment guide
└── DEPLOYMENT_SUMMARY.md      # This file
```

## 🚀 Quick Start

### Prerequisites
1. ✅ AWS EC2 instance running Ubuntu 22.04
2. ✅ SSH access to the instance
3. ✅ OpenAI API key
4. ✅ YouTube API key

### Deploy in 5 Steps

**1. Package everything:**
```bash
cd /Users/qingfengrumeng/Desktop/CameraFirst-Fitness

# Create deployment package
mkdir -p deploy-package
cp build/libs/fitness-app-0.0.1-SNAPSHOT.jar deploy-package/
cp -r fitness-mvp/dist deploy-package/
cp -r deployment/*.sh deployment/*.conf deployment/env.template deploy-package/

# Create tarball
tar -czf fitness-app-deploy.tar.gz deploy-package/
```

**2. Transfer to EC2:**
```bash
scp -i ~/path/to/your-key.pem \
    fitness-app-deploy.tar.gz \
    ubuntu@YOUR_EC2_IP:/home/ubuntu/
```

**3. Extract on server:**
```bash
ssh -i ~/path/to/your-key.pem ubuntu@YOUR_EC2_IP
cd /home/ubuntu
tar -xzf fitness-app-deploy.tar.gz
cd deploy-package
```

**4. Run deployment:**
```bash
sudo ./deploy-all.sh
```

This installs Java, PostgreSQL, Redis, Nginx, and deploys both backend and frontend.

**5. Configure environment:**
```bash
# Update backend configuration
sudo nano /opt/fitness-app/.env

# Update these values:
# - POSTGRES_PASSWORD (from script output)
# - REDIS_PASSWORD (from script output)
# - JWT_SECRET (generate with: openssl rand -base64 64)
# - OPENAI_API_KEY (your key)
# - YOUTUBE_API_KEY (your key)
# - ALLOWED_ORIGINS (add your domain)

# Restart services
sudo systemctl restart fitness-app
sudo systemctl reload nginx
```

**Done!** Access your app at `http://YOUR_EC2_IP/`

## 🔍 What Gets Installed

### System Services

| Service | Port | Purpose | Status Command |
|---------|------|---------|----------------|
| fitness-app | 8080 | Spring Boot backend | `sudo systemctl status fitness-app` |
| nginx | 80, 443 | Web server & reverse proxy | `sudo systemctl status nginx` |
| postgresql | 5432 | Database | `sudo systemctl status postgresql` |
| redis | 6379 | Cache | `sudo systemctl status redis-server` |

### File Locations

| Type | Location | Description |
|------|----------|-------------|
| Backend JAR | `/opt/fitness-app/fitness-app-0.0.1-SNAPSHOT.jar` | Spring Boot application |
| Backend config | `/opt/fitness-app/.env` | Environment variables |
| Backend logs | `/opt/fitness-app/logs/` | Application logs |
| Frontend files | `/var/www/fitness-app/` | Static web files |
| Nginx config | `/etc/nginx/sites-available/fitness-app` | Web server configuration |
| Nginx logs | `/var/log/nginx/fitness-app-*.log` | Access & error logs |
| Service file | `/etc/systemd/system/fitness-app.service` | Systemd service |

## 🔒 Security

### Passwords Generated
The deployment scripts automatically generate secure random passwords for:
- PostgreSQL database user
- Redis authentication
- Service user account

**Save these credentials!** They're displayed in the deployment script output.

### Firewall Rules (AWS Security Group)

| Port | Protocol | Source | Purpose |
|------|----------|--------|---------|
| 22 | TCP | Your IP | SSH access |
| 80 | TCP | 0.0.0.0/0 | HTTP web traffic |
| 443 | TCP | 0.0.0.0/0 | HTTPS secure traffic |

### Environment Variables Required

**Critical (must set):**
- `POSTGRES_PASSWORD` - Database password (auto-generated)
- `REDIS_PASSWORD` - Redis password (auto-generated)
- `JWT_SECRET` - JWT signing key (generate: `openssl rand -base64 64`)
- `OPENAI_API_KEY` - OpenAI API key (get from OpenAI)
- `YOUTUBE_API_KEY` - YouTube API key (get from Google Cloud)

**Important:**
- `ALLOWED_ORIGINS` - CORS origins (add your domain)
- `SPRING_PROFILES_ACTIVE` - Environment (default: prod)

See `env.template` for all available options.

## 📊 System Requirements

### Minimum (Testing)
- **Instance**: t3.small
- **RAM**: 2 GB
- **Storage**: 30 GB
- **Cost**: ~$15/month

### Recommended (Production)
- **Instance**: t3.medium
- **RAM**: 4 GB
- **Storage**: 50 GB
- **Cost**: ~$30/month

### Memory Breakdown
- Spring Boot: ~512 MB - 2 GB
- PostgreSQL: ~256 MB
- Redis: ~128 MB
- Nginx: ~50 MB
- System: ~500 MB

## 🛠️ Common Commands

### Service Management
```bash
# Check all services
sudo systemctl status fitness-app
sudo systemctl status nginx
sudo systemctl status postgresql
sudo systemctl status redis-server

# Restart backend
sudo systemctl restart fitness-app

# Reload nginx (no downtime)
sudo systemctl reload nginx
```

### View Logs
```bash
# Backend real-time logs
sudo journalctl -u fitness-app -f

# Backend application logs
sudo tail -f /opt/fitness-app/logs/application.log

# Nginx access logs
sudo tail -f /var/log/nginx/fitness-app-access.log

# Nginx error logs
sudo tail -f /var/log/nginx/fitness-app-error.log
```

### Database Access
```bash
# Connect to database
psql -h localhost -U fitness_user -d fitness_app

# Backup database
sudo -u postgres pg_dump fitness_app > backup.sql

# Restore database
sudo -u postgres psql fitness_app < backup.sql
```

### Configuration
```bash
# Edit backend environment
sudo nano /opt/fitness-app/.env

# Edit nginx config
sudo nano /etc/nginx/sites-available/fitness-app

# Test nginx config
sudo nginx -t
```

## 🔧 Troubleshooting Quick Fixes

### Backend won't start
```bash
# Check logs
sudo journalctl -u fitness-app -n 50 --no-pager

# Common fix: restart database
sudo systemctl restart postgresql
sudo systemctl restart fitness-app
```

### Frontend shows 404
```bash
# Check files exist
ls -la /var/www/fitness-app/

# Fix permissions
sudo chown -R www-data:www-data /var/www/fitness-app

# Restart nginx
sudo systemctl restart nginx
```

### API calls fail (CORS)
```bash
# Update CORS origins
sudo nano /opt/fitness-app/.env
# Add your domain to ALLOWED_ORIGINS

# Restart backend
sudo systemctl restart fitness-app
```

### Out of memory
```bash
# Check memory usage
free -h

# Reduce Java heap
sudo nano /etc/systemd/system/fitness-app.service
# Change -Xmx2048m to -Xmx1024m

sudo systemctl daemon-reload
sudo systemctl restart fitness-app
```

## 🌐 Setting Up Domain (Optional)

### 1. Point Domain to EC2
In your DNS provider, add:
- A Record: `@` → `YOUR_EC2_IP`
- A Record: `www` → `YOUR_EC2_IP`

### 2. Update Nginx
```bash
sudo nano /etc/nginx/sites-available/fitness-app
```

Change:
```nginx
server_name YOUR_EC2_IP;
```

To:
```nginx
server_name yourdomain.com www.yourdomain.com;
```

### 3. Install SSL
```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 4. Update CORS
```bash
sudo nano /opt/fitness-app/.env
```

Update:
```env
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

Restart:
```bash
sudo systemctl restart fitness-app
sudo systemctl reload nginx
```

## 📈 Monitoring

### Health Checks
```bash
# Backend health
curl http://localhost:8080/actuator/health

# Frontend health
curl http://localhost/health

# Database connection
psql -h localhost -U fitness_user -d fitness_app -c "SELECT 1;"

# Redis connection
redis-cli -a YOUR_PASSWORD ping
```

### Resource Monitoring
```bash
# Memory usage
free -h

# Disk usage
df -h

# CPU usage
top

# Service resource usage
systemctl status fitness-app
```

## 📝 Maintenance Schedule

### Daily
- ✅ Check application logs for errors
- ✅ Monitor disk space

### Weekly
- ✅ Review access logs
- ✅ Check for system updates
- ✅ Verify backups are working

### Monthly
- ✅ Apply security patches
- ✅ Review and rotate logs
- ✅ Update SSL certificates (auto via certbot)
- ✅ Review AWS costs

## 🎯 Next Steps

### Essential (Before Production)
1. ✅ Set up SSL/HTTPS certificate
2. ✅ Configure automated database backups
3. ✅ Set up monitoring and alerts
4. ✅ Document your specific configuration
5. ✅ Test disaster recovery process

### Recommended
1. Set up CI/CD pipeline
2. Configure log aggregation (CloudWatch)
3. Set up APM (Application Performance Monitoring)
4. Configure auto-scaling
5. Set up CDN for static assets

### Advanced
1. Multiple availability zones
2. Load balancer
3. Database replication
4. Redis clustering
5. Kubernetes migration

## 📚 Documentation Links

- **Full Guide**: [EC2_DEPLOYMENT_GUIDE.md](EC2_DEPLOYMENT_GUIDE.md)
- **Environment Template**: [env.template](env.template)
- **Backend Deploy Script**: [backend-deploy.sh](backend-deploy.sh)
- **Frontend Deploy Script**: [frontend-deploy.sh](frontend-deploy.sh)
- **Nginx Config**: [nginx-frontend.conf](nginx-frontend.conf)

## 💡 Tips

1. **Test locally first** - Use `npm start` and `./gradlew bootRun` locally
2. **Save credentials** - Keep deployment script output in a password manager
3. **Use environment variables** - Never hard-code secrets
4. **Monitor costs** - Set up AWS billing alerts
5. **Backup regularly** - Database + environment configuration
6. **Document changes** - Keep notes on custom configurations
7. **Use version tags** - Tag deployments for easy rollback
8. **Test SSL renewal** - `sudo certbot renew --dry-run`

## 🆘 Getting Help

### Check Logs First
```bash
# Backend
sudo journalctl -u fitness-app -n 100 --no-pager

# Nginx
sudo tail -100 /var/log/nginx/fitness-app-error.log

# Database
sudo tail -100 /var/log/postgresql/postgresql-*-main.log
```

### Common Issues
- Backend won't start → Check database connection
- Frontend 404 → Check nginx config and file permissions
- API errors → Check CORS settings in backend .env
- SSL issues → Run certbot again
- Out of memory → Increase instance size or reduce Java heap

### Contact Support
If you're still stuck after checking logs and documentation:
1. Check AWS EC2 instance status
2. Review Security Group rules
3. Verify DNS settings (if using domain)
4. Test with curl/postman to isolate issue

---

## ✅ Deployment Checklist

Before marking deployment as complete:

- [ ] EC2 instance launched and accessible
- [ ] All scripts executed successfully
- [ ] Backend service running (green status)
- [ ] Frontend accessible in browser
- [ ] Database credentials saved securely
- [ ] API keys configured (OpenAI, YouTube)
- [ ] CORS origins configured correctly
- [ ] SSL/HTTPS set up (production only)
- [ ] Logs are readable and show no errors
- [ ] Health checks passing
- [ ] Firewall/Security Group configured
- [ ] Backup strategy planned
- [ ] Monitoring set up
- [ ] Documentation updated with specifics

---

## 🎉 Success!

Your Fitness App is now deployed and running on AWS EC2!

**Access your app:**
- Development: `http://YOUR_EC2_IP/`
- Production: `https://yourdomain.com/`

**Key endpoints:**
- Frontend: `/`
- Backend API: `/api/`
- Health Check: `/actuator/health`

Remember to keep your system updated and monitor logs regularly!

Happy deploying! 🚀
