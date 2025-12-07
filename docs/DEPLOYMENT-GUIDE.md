# CI/CD Deployment Guide

**Updated**: December 7, 2025  
**Project**: AuraFitness  
**Status**: Production Ready with Improvements

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Workflow Overview](#workflow-overview)
3. [GitHub Secrets Setup](#github-secrets-setup)
4. [Deployment Strategies](#deployment-strategies)
5. [Troubleshooting](#troubleshooting)
6. [Rollback Procedures](#rollback-procedures)
7. [Monitoring & Alerts](#monitoring--alerts)

---

## 🚀 Quick Start

### Prerequisites
- GitHub repository configured with AWS EC2 instance
- Docker Hub account with private repository access
- SSH access to EC2 instance
- All required GitHub Secrets configured

### Deploy Latest Changes
```bash
# Backend (automatically on push to main)
git push origin main

# Frontend (automatically on push to main)
git push origin main

# Or manually trigger workflow
gh workflow run build-test-deploy-backend.yml
gh workflow run build-test-deploy-frontend.yml
```

---

## 📊 Workflow Overview

### Backend Workflow: `build-test-deploy-backend.yml`

**Trigger Events**:
- ✅ Push to `main`, `develop`, `CF-17-mvp` branches (paths: `backend/**`)
- ✅ Pull requests to `main`, `develop` branches
- ✅ Manual workflow dispatch

**Jobs**:

1. **build-and-test** (Ubuntu Latest)
   - Sets up JDK 21 with Gradle cache
   - Runs `./gradlew test` (JUnit tests)
   - Runs linting checks (Checkstyle)
   - Generates JaCoCo coverage reports
   - Uploads test results to Codecov

2. **build-docker** (Needs: build-and-test)
   - Sets up Docker Buildx with cache
   - Builds multi-stage Docker image
   - Pushes to Docker Hub with semantic versioning:
     - `latest` (for main branch)
     - `develop` (for develop branch)
     - Git SHA tags for traceability
   - Scans image with Trivy for vulnerabilities

3. **deploy** (Needs: build-docker, if: main + push)
   - Configures SSH keys
   - Creates deployment script
   - Executes deployment on EC2
   - Verifies service health with retries

4. **rollback** (Needs: deploy, if: deploy fails)
   - Automatically triggered on deployment failure
   - Reverts to previous Docker image
   - Logs rollback details

**Estimated Duration**: 10-15 minutes

---

### Frontend Workflow: `build-test-deploy-frontend.yml`

**Trigger Events**:
- ✅ Push to `main`, `develop`, `CF-17-mvp` branches (paths: `frontend/**`)
- ✅ Pull requests to `main`, `develop` branches  
- ✅ Manual workflow dispatch

**Jobs**:

1. **lint-and-test** (Ubuntu Latest)
   - Sets up Node.js 20 with npm cache
   - Runs `npm run lint` (ESLint)
   - Runs `npm run type-check` (TypeScript)
   - Runs `npm run test` (Jest tests with coverage)
   - Uploads coverage to Codecov

2. **build** (Needs: lint-and-test)
   - Installs dependencies with `npm ci`
   - Builds with `npm run build` (Expo web export)
   - Generates `.build-info.json` with metadata
   - Uploads build artifact (7-day retention)

3. **deploy** (Needs: build, if: not PR)
   - Downloads build artifact
   - Configures SSH keys
   - Creates tar.gz deployment package
   - Uploads to EC2 via SCP
   - Extracts and verifies deployment
   - Creates backup before deployment

4. **performance-test** (Needs: deploy, if: main + push)
   - Runs Lighthouse CI with 3 runs
   - Generates performance report
   - (Rollback handled in deploy script by restoring backup on verification failure)

**Estimated Duration**: 8-12 minutes

---

## 🔐 GitHub Secrets Setup

### Required Secrets for Backend Deployment

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `DOCKERHUB_USERNAME` | Docker Hub username | `my-docker-user` |
| `DOCKERHUB_TOKEN` | Docker Hub access token | `dckr_pat_xxxxxxxxxxxx` |
| `EC2_HOST` | EC2 public IP or domain | `54.123.45.67` |
| `EC2_USER` | EC2 SSH user | `ubuntu` |
| `EC2_SSH_KEY` | Private SSH key (PEM format) | (multiline) |
| `EC2_SSH_KEY_B64` | Base64-encoded SSH key | `LS0tLS1CRUdJTi4uLg==` |

### Required Secrets for Frontend Deployment

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `EC2_HOST` | EC2 public IP or domain | `54.123.45.67` |
| `EC2_USER` | EC2 SSH user | `ubuntu` |
| `EC2_SSH_KEY` or `EC2_SSH_KEY_B64` | SSH private key (plain or base64) | `LS0tLS1CRUdJTi4uLg==` |
| `API_BASE_URL` (optional) | Backend API URL (defaults to `http://localhost:8080` in workflow if unset) | `http://54.123.45.67:8080` |

### Setting Up Secrets

```bash
# Using GitHub CLI
gh secret set DOCKERHUB_USERNAME --body "my-docker-user"
gh secret set DOCKERHUB_TOKEN --body "dckr_pat_..."
gh secret set EC2_HOST --body "54.123.45.67"
gh secret set EC2_USER --body "ubuntu"

# For SSH key (base64 encoded)
cat ~/.ssh/id_rsa | base64 | gh secret set EC2_SSH_KEY_B64

# Or paste directly via web UI
# Settings → Secrets and variables → Actions → New repository secret
```

---

## 🎯 Deployment Strategies

### Strategy 1: Continuous Deployment (Default)
```
Commit → Build → Test → Deploy (if main)
```
- ✅ Fastest feedback
- ✅ Automatic production updates
- ⚠️ Requires high confidence in tests
- ⚠️ Needs good monitoring

### Strategy 2: Staging First
```
Commit → Build → Test → Deploy to Staging → (Manual approval) → Deploy to Production
```
Configuration:
```yaml
# In workflow file
if: github.ref == 'refs/heads/main' && github.event_name == 'push'
```

### Strategy 3: Blue-Green Deployment
```
Deploy to Blue → Health Check → Switch Traffic → Keep Green as Fallback
```
Implementation:
```bash
# In deployment script
BLUE_PORT=8080
GREEN_PORT=8081
# Deploy new version to GREEN
# Test GREEN
# Switch nginx upstream from BLUE to GREEN
```

### Strategy 4: Canary Deployment
```
Deploy 10% traffic → Monitor → Gradually increase to 100%
```
Requires:
- Load balancer with traffic splitting
- Metrics monitoring (Prometheus/CloudWatch)
- Automated rollback on error spike

---

## 🔧 Troubleshooting

### Issue: Workflow Stuck on "Waiting for Deployment"

**Cause**: EC2 instance not responding or health check failing

**Solution**:
```bash
# SSH into EC2
ssh -i ~/.ssh/id_rsa ubuntu@54.123.45.67

# Check Docker logs
docker-compose logs app

# Check service health
curl -v http://localhost:8080/actuator/health

# Restart containers
docker-compose down && docker-compose up -d
```

### Issue: Docker Build Fails with "Gradle Build Failed"

**Cause**: Test failures or compilation errors

**Solution**:
```bash
# Run locally first
cd backend
./gradlew clean test

# Fix errors before pushing
# Review the error output in Actions tab
```

### Issue: Frontend Deployment Fails - "Build Artifact Not Found"

**Cause**: TypeScript compilation or build errors

**Solution**:
```bash
# Run locally
cd frontend
npm ci
npm run lint
npm run type-check
npm run build

# Fix issues and commit
```

### Issue: SSH Connection Timeout

**Cause**: EC2 security group, SSH key mismatch, or key permissions

**Solution**:
```bash
# Verify SSH key permissions (locally)
chmod 600 ~/.ssh/id_rsa
chmod 700 ~/.ssh

# Test connection manually
ssh -v -i ~/.ssh/id_rsa ubuntu@EC2_HOST

# Check EC2 security group allows port 22
# AWS Console → Security Groups → Inbound Rules
```

### Issue: "EC2_SSH_KEY secret is missing"

**Cause**: Secret not configured in GitHub

**Solution**:
```bash
# Set the secret (choose ONE method)

# Method 1: GitHub CLI
cat ~/.ssh/id_rsa | base64 | gh secret set EC2_SSH_KEY_B64

# Method 2: Web UI
# 1. Settings → Secrets and variables → Actions
# 2. Click "New repository secret"
# 3. Name: EC2_SSH_KEY_B64
# 4. Value: (paste base64 encoded key)
# 5. Click "Add secret"
```

---

## 🔄 Rollback Procedures

### Automatic Rollback (Triggered on Deploy Failure)

The workflow automatically rolls back if:
1. ❌ Deployment health check fails (3+ consecutive failures)
2. ❌ Service fails to start
3. ❌ Database connectivity fails

**What happens**:
- Stops current container
- Restores previous version from Docker registry
- Verifies health check passes
- Logs rollback event

**Monitoring**:
- Check GitHub Actions workflow logs
- Check EC2 Docker logs: `docker-compose logs app`

### Manual Rollback

**Backend**:
```bash
# SSH into EC2
ssh -i ~/.ssh/id_rsa ubuntu@EC2_HOST

# Rollback to previous Docker image (check tag)
docker pull your-docker-user/fitness-backend:main-<previous-sha>

# Update docker-compose.yml or environment
docker-compose down
docker pull fitness-backend:main-<previous-sha>
docker-compose up -d

# Verify health
curl http://localhost:8080/actuator/health
```

**Frontend**:
```bash
# SSH into EC2
ssh -i ~/.ssh/id_rsa ubuntu@EC2_HOST

# Restore from backup
sudo cp -r /var/www/fitness-app-backup-<timestamp>/* /var/www/fitness-app/

# Verify
curl http://localhost/
```

---

## 📊 Monitoring & Alerts

### Health Checks

**Backend**:
```bash
# Spring Boot Actuator endpoint
curl http://EC2_HOST:8080/actuator/health

# Expected response
{
  "status": "UP",
  "components": {
    "db": {"status": "UP"},
    "redis": {"status": "UP"}
  }
}
```

**Frontend**:
```bash
# Check if served
curl -I http://EC2_HOST/

# Expected response
HTTP/1.1 200 OK
Content-Type: text/html
```

### Metrics to Monitor

1. **Deployment Metrics**
   - Build success rate (target: >99%)
   - Deployment duration (target: <10 min)
   - Rollback frequency (target: <1%)

2. **Application Metrics**
   - Request latency (target: <200ms)
   - Error rate (target: <0.1%)
   - CPU usage (target: <70%)
   - Memory usage (target: <80%)

3. **Infrastructure Metrics**
   - EC2 disk space (target: >20% free)
   - Database connections (target: <80% max)
   - Redis memory (target: <80%)

### Setting Up CloudWatch Alarms

```bash
# Example: Alert if deployment fails
aws cloudwatch put-metric-alarm \
  --alarm-name fitness-deploy-failure \
  --alarm-description "Alert when deployment fails" \
  --metric-name WorkflowRunConclusion \
  --namespace GitHub \
  --statistic Sum \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold
```

### Integration with Slack

Add to workflow:
```yaml
- name: Notify Slack
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "text": "❌ Deployment failed",
        "channel": "#alerts"
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

---

## 📈 Performance Optimization

### Build Optimization
```yaml
# Use GitHub Actions cache
- uses: actions/cache@v3
  with:
    path: ~/.gradle/caches
    key: ${{ runner.os }}-gradle-${{ hashFiles('**/*.gradle') }}
```

### Docker Build Optimization
```dockerfile
# Multi-stage build (already in Dockerfile)
FROM gradle:8.10.2 AS build
# ... build stage ...

FROM eclipse-temurin:21-jre-alpine
# ... runtime stage ...
```

### Frontend Build Optimization
```json
{
  "build": "expo export --platform web --minify"
}
```

---

## 🔒 Security Best Practices

1. **Secret Management**
   - Use GitHub Secrets for sensitive data
   - Rotate Docker Hub tokens quarterly
   - Use SSH keys instead of passwords
   - Never log secrets

2. **Docker Security**
   - Use non-root user in containers
   - Scan images with Trivy
   - Keep base images updated
   - Sign container images

3. **SSH Security**
   - Use ED25519 keys (if possible)
   - Set key expiration (if supported)
   - Monitor authorized_keys
   - Disable password login on EC2

4. **Access Control**
   - Limit branch protections
   - Require PR reviews before merge
   - Use CODEOWNERS file
   - Audit GitHub organization access

---

## 📞 Support & Escalation

### Issue Levels

| Level | Response Time | Severity |
|-------|---------------|----------|
| P1 | < 15 min | Production down, data loss |
| P2 | < 1 hour | Partial outage, degraded performance |
| P3 | < 4 hours | Non-critical issue, workaround available |
| P4 | < 24 hours | Enhancement, documentation |

### Escalation Path
1. Check GitHub Actions logs
2. SSH into EC2 and check Docker logs
3. Review recent commits for breaking changes
4. Check CloudWatch alarms and metrics
5. Trigger manual rollback if needed
6. Notify on-call engineer

---

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Documentation](https://docs.docker.com/)
- [Spring Boot Deployment Guide](https://spring.io/guides/gs/spring-boot-docker/)
- [React Native Deployment](https://expo.dev/docs)
- [EC2 Best Practices](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-best-practices.html)
