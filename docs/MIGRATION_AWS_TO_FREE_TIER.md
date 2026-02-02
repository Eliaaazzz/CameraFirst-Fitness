# AWS 到免费方案迁移指南

本文档描述如何将 AuraFitness 从 AWS 迁移到免费替代方案。

## 迁移概览

| 服务 | AWS (之前) | 免费替代方案 |
|------|------------|--------------|
| 数据库 | RDS PostgreSQL | Supabase PostgreSQL |
| 缓存 | ElastiCache Redis | Upstash Redis |
| 后端托管 | EC2 | Render |
| 前端托管 | S3 + CloudFront | Cloudflare Pages |
| 对象存储 | - | Cloudflare R2 (已配置) |

## 免费额度

| 服务 | 免费额度 |
|------|----------|
| Supabase | 500MB 数据库, 1GB 文件存储, 2GB 带宽 |
| Upstash Redis | 10K commands/day, 256MB |
| Render | 750 hours/month (1个服务24/7), 冷启动 |
| Cloudflare Pages | 500次构建/月, 无限带宽 |
| Cloudflare R2 | 10GB 存储, 10M 读取, 1M 写入 |

---

## 1. 数据库迁移 (RDS → Supabase)

### 步骤 1.1: 创建 Supabase 项目

1. 访问 [supabase.com](https://supabase.com) 并注册
2. 点击 "New Project"
3. 选择区域 (建议选择离用户最近的)
4. 设置数据库密码 (保存好!)

### 步骤 1.2: 获取连接信息

1. 进入项目 Dashboard → Settings → Database
2. 复制 JDBC 连接字符串:
   ```
   jdbc:postgresql://db.<project-ref>.supabase.co:5432/postgres
   ```
3. 用户名: `postgres`
4. 密码: 你创建项目时设置的密码

### 步骤 1.3: 恢复数据

**方案 A: 自动生成表结构 (推荐用于 Demo)**

应用会使用 Flyway 自动创建表结构:
```yaml
spring.jpa.hibernate.ddl-auto: update
spring.flyway.enabled: true
```

**方案 B: 从备份恢复**

如果你有 SQL 备份:
1. 进入 Supabase Dashboard → SQL Editor
2. 粘贴并运行你的 SQL 脚本

---

## 2. 缓存迁移 (ElastiCache → Upstash)

### 步骤 2.1: 创建 Upstash Redis

1. 访问 [upstash.com](https://upstash.com) 并注册
2. 点击 "Create Database"
3. 选择区域 (建议与 Supabase 相同区域)
4. 选择 "TLS (SSL)" 连接

### 步骤 2.2: 获取连接信息

1. 进入 Redis 详情页
2. 复制:
   - Endpoint: `xxx.upstash.io`
   - Port: `6379`
   - Password: (显示在详情页)

---

## 3. 后端迁移 (EC2 → Render)

### 步骤 3.1: 创建 Render 服务

1. 访问 [render.com](https://render.com) 并注册
2. 点击 "New" → "Web Service"
3. 连接你的 GitHub 仓库
4. 配置:
   - **Name**: `aurafitness-backend`
   - **Root Directory**: `backend`
   - **Runtime**: Docker
   - **Branch**: `main`
   - **Plan**: Free

### 步骤 3.2: 配置环境变量

在 Render Dashboard → Environment 添加:

```bash
# Spring Profile
SPRING_PROFILES_ACTIVE=supabase

# Supabase
SUPABASE_JDBC_URL=jdbc:postgresql://db.xxx.supabase.co:5432/postgres
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=<your-password>

# Upstash Redis
UPSTASH_REDIS_HOST=xxx.upstash.io
UPSTASH_REDIS_PORT=6379
UPSTASH_REDIS_PASSWORD=<your-password>

# R2 Storage
R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com
R2_ACCESS_KEY=<your-access-key>
R2_SECRET_ACCESS_KEY=<your-secret-key>
R2_BUCKET_NAME=aurafit
R2_PUBLIC_URL=https://pub-xxx.r2.dev

# API Keys
GEMINI_API_KEY=<your-key>
YOUTUBE_API_KEY=<your-key>
SPOONACULAR_API_KEY=<your-key>
USDA_API_KEY=<your-key>

# Security (Render 可自动生成)
JWT_SECRET=<generate-secure-256-bit-string>
API_KEY=<your-api-key>
```

### 步骤 3.3: 获取 Deploy Hook (可选)

如果要使用 GitHub Actions 触发部署:
1. 进入 Render Dashboard → Settings → Deploy Hook
2. 复制 Hook URL
3. 在 GitHub 仓库添加 Secret: `RENDER_DEPLOY_HOOK_URL`

---

## 4. 前端迁移 (S3 + CloudFront → Cloudflare Pages)

### 步骤 4.1: 创建 Cloudflare Pages 项目

1. 访问 [dash.cloudflare.com](https://dash.cloudflare.com)
2. 进入 Pages → Create a project
3. 连接 GitHub
4. 选择仓库和分支

### 步骤 4.2: 配置构建

- **Framework preset**: None (或 Expo)
- **Build command**: `npm run build --workspace=frontend`
- **Build output directory**: `frontend/dist`
- **Root directory**: `/`

### 步骤 4.3: 环境变量

```bash
EXPO_PUBLIC_API_URL=https://aurafitness-backend.onrender.com
NODE_VERSION=20
```

### 步骤 4.4: GitHub Actions 配置

在 GitHub 添加以下 Secrets:
- `CLOUDFLARE_API_TOKEN`: 从 Cloudflare Dashboard → API Tokens 创建
- `CLOUDFLARE_ACCOUNT_ID`: 在 Cloudflare Dashboard 右侧栏
- `CLOUDFLARE_PROJECT_NAME`: 你的 Pages 项目名
- `API_BASE_URL`: Render 后端 URL

---

## 5. 验证迁移

### 5.1 检查后端

```bash
# 健康检查
curl https://aurafitness-backend.onrender.com/actuator/health

# 应返回: {"status":"UP"}
```

### 5.2 检查前端

访问 `https://<your-project>.pages.dev`

### 5.3 检查数据库连接

查看 Render 日志确认:
- Flyway 迁移成功
- Redis 连接成功
- 无数据库连接错误

---

## 6. CI/CD 工作流

### 新的工作流文件

| 文件 | 用途 |
|------|------|
| `.github/workflows/deploy-render.yml` | 后端部署到 Render |
| `.github/workflows/deploy-cloudflare-pages.yml` | 前端部署到 Cloudflare Pages |

### 旧工作流 (保留但不再使用)

| 文件 | 用途 |
|------|------|
| `.github/workflows/build-test-deploy-backend.yml` | EC2 部署 (已弃用) |
| `.github/workflows/build-test-deploy-frontend.yml` | S3 部署 (已弃用) |

---

## 7. 注意事项

### Render 免费版限制

- **冷启动**: 15分钟无活动后服务休眠，首次请求需 30-60 秒唤醒
- **资源**: 512MB RAM, 0.1 CPU
- **解决方案**: 使用 cron job 定期 ping 保持活跃

### Supabase 限制

- **连接数**: 免费版最多 60 个并发连接
- **解决方案**: 使用连接池 (已在配置中限制为 5)

### Upstash 限制

- **每日命令数**: 10,000
- **解决方案**: 合理使用缓存，避免过度请求

---

## 8. 回滚方案

如需回滚到 AWS:

1. 将 `SPRING_PROFILES_ACTIVE` 改回 `prod`
2. 重新启用 EC2 部署工作流
3. 更新前端 API URL 指向 EC2

---

## 9. 成本对比

| 服务 | AWS 月费用 | 免费方案 |
|------|-----------|----------|
| 数据库 | ~$15 (RDS t3.micro) | $0 |
| 缓存 | ~$15 (ElastiCache) | $0 |
| 后端 | ~$10 (EC2 t3.micro) | $0 |
| 前端 | ~$1 (S3 + CloudFront) | $0 |
| **总计** | **~$41/月** | **$0** |

对于 Demo 和个人项目，免费方案完全足够!
