# 🧪 AuraFitness UserProfile Bug 修复 - 测试指南

## ✅ 应用重启状态

### 后端服务
- ✅ PostgreSQL: 运行中 (端口 5432)
- ✅ Redis: 运行中 (端口 6379)
- ✅ Backend API: 运行中 (端口 8080)
- ✅ 健康检查: UP

### 后端代码
- ✅ 编译成功 (BUILD SUCCESSFUL)
- ✅ 修复已应用: AuthService.java 包含 UserProfile 创建逻辑

### 前端应用
- ✅ 启动中 (运行 `npm start`)
- 📲 Web: http://localhost:8081
- 📲 Metro Bundler: 等待连接

---

## 🧬 修复验证清单

### 修复内容概述
```
问题: 新用户 Google 登录后无法记录营养数据 (EntityNotFoundException)
原因: 只创建了 User，没有创建 UserProfile
修复: 在 AuthService.loginSocial() 和 registerEmail() 中添加 UserProfile 创建
```

---

## 🧪 测试场景 (按顺序执行)

### 📝 测试 1: 首次 Google 登录 (新用户)

**目标**: 验证新用户登录时同时创建 User 和 UserProfile

**步骤**:
1. 打开前端应用（Web 或移动设备）
2. 点击 "Google 登录" 按钮
3. 使用从未登录过的 Google 账号
4. 登录完成后，检查以下内容：

**验证点**:
```
✓ 前端显示登录成功
✓ 进入主应用界面 (不是登录页面)
✓ 后端日志显示:
  - "Created new user via GOOGLE: [email]"
  - "Created default UserProfile for user: [uuid]"
```

**数据库验证** (可选):
```sql
-- 连接到 PostgreSQL: psql -h localhost -U fitness_user -d fitness_db

-- 查看新用户
SELECT id, email, auth_provider FROM "user" 
WHERE email = '[你的Google邮箱]' ORDER BY created_at DESC LIMIT 1;

-- 查看对应的 UserProfile
SELECT user_id FROM user_profile 
WHERE user_id = '[上面查到的id]';

-- 应该能找到对应的 UserProfile
```

---

### 🍽️ 测试 2: 新用户记录营养数据

**目标**: 验证新用户登录后能正常记录营养数据 (Bug修复的关键验证)

**前置条件**:
- 已完成测试 1 (新用户登录)
- 仍处于登录状态

**步骤**:
1. 进入 "Nutrition" 或 "记录食物" 屏幕
2. 点击拍照按钮，拍摄食物照片
3. 应用分析照片并识别食物
4. 点击 "保存食物" 或 "确认" 按钮
5. 等待响应

**验证点**:
```
✓ 收到 200 OK 响应 (成功)
✓ 页面显示 "保存成功" 消息
✗ 不应该出现错误: "User not found", "EntityNotFoundException"
✓ 食物出现在日报告中
✓ 营养数据显示正确
```

**后端日志验证**:
```
应该看到日志类似:
  - "Creating meal log for user [uuid] with [n] items"
  - "Created meal log [id] with total calories: [cal]"

不应该看到:
  - "User not found"
  - "EntityNotFoundException"
  - "500 Internal Server Error"
```

---

### 👤 测试 3: 现有用户登录 (不受影响)

**目标**: 验证修复不会影响现有用户

**前置条件**:
- 使用之前已登录过的 Google 账号或邮箱账号

**步骤**:
1. 登出之前的用户（如果还在登录状态）
2. 用现有账号重新登录
3. 进入 Nutrition 屏幕
4. 尝试记录营养数据

**验证点**:
```
✓ 登录成功
✓ UserProfile 未被重复创建 (数据库中仍只有一条记录)
✓ 能正常记录营养数据
✓ 之前保存的 meal logs 都能显示
```

**后端日志验证**:
```
应该看到:
  - "User [uuid] logged in via GOOGLE" (没有创建日志)

不应该看到:
  - "Created default UserProfile" (这只在新用户时出现)
```

---

### ✉️ 测试 4: 邮箱注册新用户

**目标**: 验证邮箱注册也创建了 UserProfile

**步骤**:
1. 登出
2. 点击 "注册" 按钮
3. 输入新邮箱 (从未使用过的)
4. 输入密码
5. 点击注册

**验证点**:
```
✓ 注册成功
✓ 自动登录
✓ 后端日志显示:
  - "Registered new user via email: [email]"
  - "Created default UserProfile for user: [uuid]"
```

**功能验证**:
1. 进入 Nutrition 屏幕
2. 记录一条营养数据

**验证点**:
```
✓ 能正常保存
✓ 没有 EntityNotFoundException 错误
```

---

### 📊 测试 5: 完整端到端流程

**目标**: 测试完整的新用户流程

**步骤**:
```
1. 清空浏览器 Cookie/SessionStorage
2. 打开应用 → 显示登录页面
3. 点击 Google 登录 → 完成 OAuth
4. 进入主屏幕
5. 进入 Nutrition 屏幕
6. 拍照、分析、保存食物
7. 查看日报告
8. 点击个人资料
9. 编辑个人信息 (身高、体重等)
10. 保存个人信息
11. 返回 Nutrition 屏幕
12. 重新记录一条数据
13. 登出
14. 检查是否返回登录页面
```

**验证点**:
```
✓ 全流程无错误
✓ 每一步都能正常完成
✓ 数据持久化 (刷新页面后数据仍在)
✓ 登出后能正常登录回来
```

---

## 🔍 常见错误排查

### 错误 1: "User not found" / "EntityNotFoundException"
```
❌ 症状: 记录营养数据时返回 404/500 错误
✅ 原因: UserProfile 未被创建 (Bug 未修复)
✅ 检查:
   1. 确认后端已重新编译: BUILD SUCCESSFUL
   2. 确认后端已重新启动: docker-compose up -d
   3. 查看后端日志: docker logs -f fitness-backend
   4. 检查日志中是否有 "Created default UserProfile" 行
```

### 错误 2: Google 登录失败
```
❌ 症状: 点击 Google 登录后无反应或显示错误
✅ 可能原因:
   1. Google OAuth Client ID 配置不正确
   2. 后端 API 无响应
   3. JWT token 生成失败
✅ 检查:
   1. 后端是否在运行: curl http://localhost:8080/actuator/health
   2. 后端日志: docker logs fitness-backend | tail -50
   3. 检查 .env 文件中的 Google Client ID
```

### 错误 3: 个人信息更新失败
```
❌ 症状: 编辑个人信息后显示错误
✅ 原因: UserProfile 数据为空或不完整
✅ 解决:
   1. 清空浏览器缓存
   2. 重新登录
   3. 再次尝试编辑
```

---

## 📋 日志检查命令

### 查看后端实时日志
```bash
docker logs -f fitness-backend
```

### 查看特定的日志行
```bash
# 查看用户创建相关的日志
docker logs fitness-backend | grep -E "Created new user|Created default UserProfile"

# 查看错误日志
docker logs fitness-backend | grep -E "ERROR|Exception"

# 查看特定用户的操作日志
docker logs fitness-backend | grep "[your-email@example.com]"
```

### 连接到数据库检查数据
```bash
# 进入 PostgreSQL 容器
docker exec -it fitness-postgres psql -U fitness_user -d fitness_db

# 查看用户列表
SELECT id, email, auth_provider, created_at FROM "user" ORDER BY created_at DESC LIMIT 5;

# 查看 UserProfile 列表
SELECT user_id, created_at FROM user_profile ORDER BY created_at DESC LIMIT 5;

# 查看 Meal logs
SELECT id, user_id, meal_type, created_at FROM meal_log ORDER BY created_at DESC LIMIT 10;

# 查看某个用户的数据一致性
SELECT u.id, u.email, CASE WHEN up.user_id IS NULL THEN '❌' ELSE '✅' END AS has_profile
FROM "user" u
LEFT JOIN user_profile up ON u.id = up.user_id
ORDER BY u.created_at DESC;
```

---

## 📞 如果遇到问题

### 快速重启
```bash
# 停止所有服务
docker-compose down

# 重新启动
docker-compose up -d

# 重新构建后端（如有代码变更）
cd backend && ./gradlew clean build -x test

# 再次启动
docker-compose up -d
```

### 清空数据（开始全新测试）
```bash
# 停止服务
docker-compose down -v

# 删除 volumes（数据库数据）
docker volume rm aurafitness_postgres_data aurafitness_redis_data

# 重新启动
docker-compose up -d
```

### 查看详细错误
```bash
# 查看后端启动日志
docker logs fitness-backend

# 查看 PostgreSQL 启动日志
docker logs fitness-postgres

# 查看 Redis 启动日志
docker logs fitness-redis
```

---

## ✅ 成功标志

当你看到以下内容时，说明修复成功：

```
✅ 新用户 Google 登录 → 创建了 User 和 UserProfile
✅ 新用户立即能记录营养数据 (没有 EntityNotFoundException)
✅ 后端日志显示 "Created default UserProfile for user: [uuid]"
✅ 数据库中 User 和 UserProfile 一一对应
✅ 现有用户不受影响，登录和使用都正常
```

---

## 📝 测试结果记录

完成测试后，请填写以下内容：

```
测试时间: _______________

测试 1 (Google 登录新用户):      [ ] 通过 [ ] 失败 [ ] 部分失败
测试 2 (新用户记录营养):         [ ] 通过 [ ] 失败 [ ] 部分失败
测试 3 (现有用户登录):           [ ] 通过 [ ] 失败 [ ] 部分失败
测试 4 (邮箱注册新用户):         [ ] 通过 [ ] 失败 [ ] 部分失败
测试 5 (完整端到端流程):         [ ] 通过 [ ] 失败 [ ] 部分失败

问题汇总: _______________________________________________________________

建议/备注: _______________________________________________________________
```

---

**祝测试顺利！** 🚀
