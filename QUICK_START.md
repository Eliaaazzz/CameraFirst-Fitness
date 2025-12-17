# 🚀 快速启动和测试命令

## 当前应用状态

```
✅ 后端 (8080)：UP
✅ 数据库 (5432)：UP  
✅ Redis (6379)：UP
✅ 前端 (8081)：UP
```

---

## 📱 打开应用

**在浏览器中打开**:
```
http://localhost:8081
```

**或用手机扫描 QR 码**:
- Metro Bundler 终端会显示 QR 码
- 用 Expo Go app 扫描即可

---

## 🧪 核心测试（3 步）

### 1️⃣ Google 登录
```
点击 "Google 登录" → 使用新 Google 账号 → 完成授权
```

### 2️⃣ 查看后端日志（验证修复）
```bash
docker logs fitness-backend | tail -20
```

**应该看到**:
```
Created new user via GOOGLE: your@email.com
Created default UserProfile for user: [uuid]
```

### 3️⃣ 记录营养数据
```
进入 Nutrition → 拍照 → 分析 → 保存
```

**验证**: ✅ 成功保存 (不出现 EntityNotFoundException)

---

## 🔧 常用命令

### 查看日志

```bash
# 实时后端日志
docker logs -f fitness-backend

# 看最近 50 行
docker logs fitness-backend | tail -50

# 搜索 UserProfile 相关日志
docker logs fitness-backend | grep -i profile

# 搜索错误
docker logs fitness-backend | grep -i error
```

### 数据库操作

```bash
# 进入数据库
docker exec -it fitness-postgres psql -U fitness_user -d fitness_db

# 看最新的用户
SELECT id, email, created_at FROM "user" ORDER BY created_at DESC LIMIT 5;

# 检查 UserProfile 是否存在
SELECT u.id, u.email, CASE WHEN up.user_id IS NULL THEN '❌' ELSE '✅' END 
FROM "user" u LEFT JOIN user_profile up ON u.id = up.user_id 
ORDER BY u.created_at DESC LIMIT 5;

# 看 meal logs
SELECT id, user_id, meal_type, total_calories FROM meal_log ORDER BY created_at DESC LIMIT 10;

# 查看特定用户的数据
SELECT * FROM "user" WHERE email = 'your@email.com';
```

### 重启服务

```bash
# 完整重启
docker-compose down && docker-compose up -d

# 只重启后端
docker-compose restart fitness-backend

# 查看所有容器状态
docker-compose ps
```

### 重新构建后端

```bash
cd backend
./gradlew clean build -x test
docker-compose up -d
```

---

## ✅ 成功标志

看到这些说明修复生效:

```
✅ 后端日志: "Created default UserProfile for user: [uuid]"
✅ 新用户登录成功
✅ 能立即记录营养数据
✅ 没有 EntityNotFoundException 错误
✅ 数据库中 User 和 UserProfile 对应
```

---

## ⚠️ 问题排查

| 问题 | 原因 | 解决 |
|------|------|------|
| 无法连接后端 | API 未启动 | `docker-compose up -d` |
| 看不到 UserProfile 日志 | 代码未更新 | `docker-compose down` + `./gradlew clean build` + `docker-compose up -d` |
| EntityNotFoundException | Bug 未修复 | 检查 AuthService.java 是否包含创建 UserProfile 的代码 |
| 前端无反应 | Metro 未启动 | `cd frontend && npm start` |

---

## 📊 修复检查清单

- [ ] 后端编译成功: `BUILD SUCCESSFUL`
- [ ] Docker 容器全部启动
- [ ] 能访问 http://localhost:8081
- [ ] Google 登录成功
- [ ] 后端日志显示创建了 UserProfile
- [ ] 能成功记录营养数据
- [ ] 没有 EntityNotFoundException 错误
- [ ] 数据库中 User 和 UserProfile 一一对应

---

## 🎯 最快验证（< 5 分钟）

```bash
# 1. 打开浏览器: http://localhost:8081
# 2. Google 登录 (新账号)
# 3. 运行此命令检查日志:
docker logs fitness-backend | grep "Created default UserProfile"

# 4. 应该看到:
# Created default UserProfile for user: [uuid]

# 如果看到这行，说明修复成功 ✅
```

---

**修复**: UserProfile 自动创建  
**状态**: ✅ 全部就绪  
**开始**: http://localhost:8081
