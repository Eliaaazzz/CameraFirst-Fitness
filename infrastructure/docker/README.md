# Docker Compose 快速开始

遵循 12-factor app 原则，所有配置通过单个 `.env` 文件和环境变量管理。

## 快速开始

```bash
cd infrastructure/docker

# 本地开发 (使用 .env 中的配置)
docker-compose up -d

# 或覆盖环境变量
SPRING_DATA_REDIS_HOST=redis docker-compose up -d

# 检查状态
docker-compose ps
curl http://localhost:8080/actuator/health
```

## 环境变量配置

所有配置通过 `.env` 文件设置，环境变量可动态覆盖：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DOCKER_IMAGE` | 见 .env | Docker 镜像地址 |
| `POSTGRES_DB` | fitness_mvp | 数据库名 |
| `POSTGRES_USER` | fitnessuser | 数据库用户 |
| `POSTGRES_PASSWORD` | CHANGE_ME | 数据库密码 |
| `SPRING_DATA_REDIS_HOST` | redis | Redis 主机 |
| `SPRING_DATA_REDIS_PORT` | 6379 | Redis 端口 |
| `SPRING_DATA_REDIS_PASSWORD` | (empty) | Redis 密码 |
| `SPRING_DATA_REDIS_SSL_ENABLED` | false | Redis SSL 开关 |
| `YOUTUBE_API_KEY` | (empty) | YouTube API 密钥 |
| `OPENAI_API_KEY` | (empty) | OpenAI API 密钥 |
| `GEMINI_API_KEY` | (empty) | Gemini API 密钥 |

## 常见任务

### 查看日志
```bash
docker-compose logs -f app
```

### 连接数据库
```bash
docker-compose exec postgres psql -U fitnessuser -d fitness_mvp
```

### 连接 Redis
```bash
docker-compose exec redis redis-cli ping
```

### 重启服务
```bash
docker-compose down
docker-compose up -d
```

## 部署方式

### 本地开发
```bash
# 直接使用 .env (本地 Redis)
docker-compose up -d
```

### AWS 生产环境
```bash
# 覆盖环境变量指向 AWS 服务
SPRING_DATA_REDIS_HOST=master.aura-redis.xxx.com \
SPRING_DATA_REDIS_SSL_ENABLED=true \
SPRING_DATA_REDIS_PASSWORD=your-password \
docker-compose up -d
```

## 故障排除

### Redis 连接失败
```bash
docker-compose logs app | grep -i redis
docker-compose ps redis
```

### PostgreSQL 连接失败
```bash
docker-compose logs app | grep -i postgres
docker-compose ps postgres
```

### 应用启动缓慢或 DOWN
```bash
docker-compose logs app | tail -50
curl http://localhost:8080/actuator/health
```
