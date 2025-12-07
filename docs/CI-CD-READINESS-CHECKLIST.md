# CI/CD Readiness Checklist

**Project**: AuraFitness  
**Created**: December 7, 2025  
**Purpose**: Verify readiness for CI/CD pipeline activation

---

## ✅ GitHub Setup Verification

### Workflows
- [ ] `.github/workflows/build-test-deploy-backend.yml` is created and visible
- [ ] `.github/workflows/build-test-deploy-frontend.yml` is created and visible
- [ ] Both workflows are enabled (not disabled)
- [ ] Workflow files have valid YAML syntax (no red errors in editor)

### Secrets Configuration
Complete before first deployment:

```bash
# Backend Secrets (Required)
gh secret set DOCKERHUB_USERNAME -b "your-docker-username"
gh secret set DOCKERHUB_TOKEN -b "your-docker-token"
gh secret set EC2_HOST -b "54.123.45.67"
gh secret set EC2_USER -b "ubuntu"
gh secret set EC2_SSH_KEY_B64 -b "$(cat ~/.ssh/id_rsa | base64)"

# Frontend Secrets (Optional)
gh secret set API_BASE_URL -b "http://54.123.45.67:8080"
```

Verify secrets are set:
```bash
gh secret list
```

Expected output:
```
DOCKERHUB_USERNAME    Updated ...
DOCKERHUB_TOKEN       Updated ...
EC2_HOST              Updated ...
EC2_USER              Updated ...
EC2_SSH_KEY_B64       Updated ...
API_BASE_URL          Updated ...
```

---

## ✅ Code Quality Verification

### Backend
```bash
cd backend

# Run tests
./gradlew test --info

# Build
./gradlew bootJar

# Check for errors
echo "Build result: $?"  # Should be 0
```

**Pass Criteria**:
- [ ] All tests pass or skip successfully
- [ ] Build jar created at `build/libs/fitness-app.jar`
- [ ] No error exit codes

### Frontend
```bash
cd frontend

# Install dependencies
npm ci

# Type check
npm run type-check

# Lint
npm run lint

# Build
npm run build

# Verify
ls -la dist/index.html  # Should exist
```

**Pass Criteria**:
- [ ] No TypeScript compilation errors
- [ ] ESLint has 0 critical errors (warnings ok)
- [ ] Build artifact created at `dist/`
- [ ] `dist/index.html` exists

---

## ✅ EC2 Infrastructure Checklist

### SSH Access
```bash
# Test SSH connectivity
ssh -i ~/.ssh/id_rsa -o StrictHostKeyChecking=accept-new ubuntu@EC2_HOST

# Should connect without password prompts
# Result: Should see Ubuntu shell prompt
```

- [ ] SSH connection successful
- [ ] No password prompt required
- [ ] Can run `whoami` and see "ubuntu"

### Docker Installation
```bash
# Check Docker is installed and running
docker --version
docker ps
docker-compose --version
```

- [ ] Docker version 20.10+ installed
- [ ] docker-compose version 2.0+ installed
- [ ] `docker ps` runs without sudo errors

### Docker Hub Access
```bash
# Verify Docker Hub login
docker login -u DOCKERHUB_USERNAME
# Enter token when prompted

# Test push capability
docker pull hello-world
docker tag hello-world DOCKERHUB_USERNAME/hello-world:test
docker push DOCKERHUB_USERNAME/hello-world:test
docker rmi DOCKERHUB_USERNAME/hello-world:test
```

- [ ] Docker Hub login successful
- [ ] Can push and pull images
- [ ] Repository is accessible

### Database Setup
```bash
# Connect to PostgreSQL
psql -h localhost -U fitnessuser -d fitness_mvp -c "SELECT version();"

# Should show PostgreSQL version
```

- [ ] PostgreSQL installed and running
- [ ] User `fitnessuser` can connect
- [ ] Database `fitness_mvp` exists
- [ ] User has appropriate permissions

### Redis Setup
```bash
# Test Redis connection
redis-cli ping
# Should return: PONG
```

- [ ] Redis installed and running
- [ ] Redis accepts local connections
- [ ] Port 6379 is accessible

---

## ✅ Test Workflow Execution

### Dry Run on Non-Main Branch

```bash
# Create test branch
git checkout -b test-cicd-setup

# Make a small change to trigger workflow
echo "# Test deployment" >> README.md
git add README.md
git commit -m "test: trigger CI/CD workflow"
git push origin test-cicd-setup

# Go to GitHub Actions and monitor
# Check that backend workflow runs
# Check that frontend workflow runs
# Let workflows complete (don't merge yet)

# Expected results:
# - Build job completes ✓
# - Test job completes ✓
# - Docker build job completes ✓
# - NO deployment (since branch is not main) ✓
```

**Workflow Health Checks**:
- [ ] Backend lint job completes
- [ ] Backend test job completes
- [ ] Backend Docker build job completes
- [ ] Frontend lint-and-test job completes
- [ ] Frontend build job completes
- [ ] No unexpected errors in logs
- [ ] Test artifacts uploaded to GitHub
- [ ] No actual deployments triggered

### Review Test Logs

Check GitHub Actions logs for:
- [ ] No "secret is missing" errors
- [ ] No "SSH failed" errors
- [ ] Build succeeded with clear output
- [ ] Tests ran and reported results
- [ ] Docker image built successfully

### Cleanup Test Branch

```bash
# Delete test branch (don't merge)
git branch -d test-cicd-setup
git push origin --delete test-cicd-setup
```

---

## ✅ Pre-Production Validation

### Security Audit
- [ ] No secrets in source code (check with `git grep "password"`)
- [ ] No API keys committed to repo
- [ ] SSH keys are private (600 permissions)
- [ ] Database passwords are in GitHub Secrets only
- [ ] Docker credentials are in GitHub Secrets only

### Performance Baseline
```bash
# Load test application locally
# Record baseline metrics:
# - API response time (target: <200ms)
# - Frontend load time (target: <3s)
# - Memory usage under load
# - CPU usage under load
# - Database query time
```

- [ ] Baseline metrics recorded
- [ ] No obvious performance issues
- [ ] Application handles expected load

### Rollback Testing
```bash
# Test manual rollback procedure locally

# For backend:
# 1. Note current image tag
# 2. Deploy older image tag
# 3. Verify service comes up
# 4. Check health endpoints

# For frontend:
# 1. Create test deployment package
# 2. Create backup
# 3. Restore backup
# 4. Verify restoration worked
```

- [ ] Rollback procedure tested
- [ ] Can restore previous version
- [ ] Health checks work post-rollback

---

## ✅ Documentation Review

- [ ] Deployment guide reviewed: `docs/DEPLOYMENT-GUIDE.md`
- [ ] CI/CD review understood: `docs/CI-CD-REVIEW.md`
- [ ] Implementation summary read: `docs/CI-CD-IMPLEMENTATION-SUMMARY.md`
- [ ] All team members understand workflows
- [ ] On-call runbook is prepared
- [ ] Escalation procedures are documented

---

## 🚀 Ready for First Production Deployment

When all checkboxes above are completed, you can proceed:

```bash
# Make sure main branch is clean
git checkout main
git pull origin main
git status  # Should show "nothing to commit"

# Deploy!
# Option 1: Push to main
git push origin main

# Option 2: Trigger manually
gh workflow run build-test-deploy-backend.yml -r main
gh workflow run build-test-deploy-frontend.yml -r main

# Watch workflows:
gh workflow run list
gh run watch <run-id>
```

---

## 📊 Success Indicators

After first deployment, verify:

**Backend**:
```bash
curl http://EC2_HOST:8080/actuator/health
# Expected: {"status":"UP", ...}

curl http://EC2_HOST:8080/api/health
# Expected: 200 OK
```

**Frontend**:
```bash
curl http://EC2_HOST/
# Expected: HTML content, 200 OK

curl http://EC2_HOST/.build-info.json
# Expected: Build metadata JSON
```

**Monitoring**:
- [ ] No error spikes in logs
- [ ] Response times normal
- [ ] Database queries fast
- [ ] No connection pool exhaustion

---

## 🆘 If Something Goes Wrong

### Issue: "Secret is missing" error
**Solution**: Run `gh secret list` and add missing secrets

### Issue: Docker build fails
**Solution**: Check logs, run `docker build` locally first

### Issue: SSH connection timeout
**Solution**: Verify EC2 security group allows port 22, check SSH key

### Issue: Deployment succeeds but service unhealthy
**Solution**: SSH to EC2, check `docker logs`, verify database connectivity

---

## ✅ Final Sign-Off

- [ ] All checklist items completed
- [ ] Team briefed on deployment
- [ ] On-call engineer ready
- [ ] Monitoring active
- [ ] Rollback plan confirmed

**Ready to deploy**: _____ YES / _____ NO

**Deployment authorized by**: _______________________

**Date**: _______________________

