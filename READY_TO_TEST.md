# ✅ 应用启动完成 - 准备测试

## 🎯 当前状态

```
启动时间: Wed 17 Dec 2025
应用状态: ✅ 全部启动完成
修复状态: ✅ UserProfile 创建 Bug 已修复
```

---

## 🚀 运行中的服务

| 服务 | 地址 | 状态 | 说明 |
|------|------|------|------|
| **Backend API** | http://localhost:8080 | ✅ UP | Spring Boot + Java 21 |
| **PostgreSQL** | localhost:5432 | ✅ UP | pgvector 数据库 |
| **Redis** | localhost:6379 | ✅ UP | 缓存服务 |
| **Frontend Metro** | http://localhost:8081 | ✅ UP | React Native Expo |

---

## 🧪 快速测试（5 分钟）

### 步骤 1️⃣: 打开应用
```
在浏览器打开: http://localhost:8081
或用手机扫描 Metro Bundler 的 QR 码
```

### 步骤 2️⃣: Google 登录
```
1. 点击 "Google 登录" 按钮
2. 使用从未登录过的 Google 账号
3. 完成授权
4. 验证: ✅ 进入主界面 (不是登录页)
```

### 步骤 3️⃣: 记录营养数据（关键测试）
```
1. 进入 Nutrition 屏幕
2. 拍照或选择食物照片
3. 点击 "保存食物" 按钮
4. 验证: ✅ 保存成功，显示在日报告中
   ❌ 错误情况: EntityNotFoundException (说明 Bug 未修复)
```

---

## 🔍 验证修复的最直接方法

### 方式 1️⃣: 查看后端日志
```bash
docker logs -f fitness-backend | grep -E "Created new user|Created default UserProfile"
```

**预期看到**:
```
Created new user via GOOGLE: your@email.com
Created default UserProfile for user: 550e8400-e29b-41d4-a716-446655440000
Creating meal log for user 550e8400-e29b-41d4-a716-446655440000...
```

### 方式 2️⃣: 查看数据库
```bash
# 进入数据库
docker exec -it fitness-postgres psql -U fitness_user -d fitness_db

# 查看用户和 profile 的一致性
SELECT u.id, u.email, CASE WHEN up.user_id IS NULL THEN '❌' ELSE '✅' END as has_profile
FROM "user" u
LEFT JOIN user_profile up ON u.id = up.user_id
ORDER BY u.created_at DESC LIMIT 3;
```

**预期结果**: 所有新用户都有对应的 UserProfile (✅)

---

## 📊 修复对照表

| 操作 | 修复前 | 修复后 |
|------|--------|--------|
| Google 登录 | ✅ User 创建 | ✅ User + UserProfile |
| 立即记录营养 | ❌ EntityNotFoundException | ✅ 成功保存 |
| 邮箱注册 | ✅ User 创建 | ✅ User + UserProfile |
| 现有用户登录 | ✅ 正常 | ✅ 正常 (无重复) |

---

## 🎯 关键验证点

当你看到以下现象时，**修复成功** ✅:

```
✅ 新用户登录后能立即记录营养数据
✅ 没有看到 "User not found" 错误
✅ 后端日志显示创建了 UserProfile
✅ 数据库中 User 和 UserProfile 一一对应
✅ 现有用户登录不会重复创建 UserProfile
```

---

## 💾 修改总结

**唯一修改的文件**: `AuthService.java`

**修改内容**:
```java
// 在 loginSocial() 和 registerEmail() 中添加
UserProfile profile = new UserProfile();
profile.setUser(user);
userProfileRepository.save(profile);
```

**效果**: 新用户注册时自动创建 UserProfile，防止后续 EntityNotFoundException

---

## 🚨 如果遇到问题

### 问题: 看不到 "Created default UserProfile" 日志
```
❌ 说明: 后端可能没有重新编译或重启
✅ 解决:
   docker-compose down
   cd backend && ./gradlew clean build -x test
   docker-compose up -d
```

### 问题: 仍然出现 EntityNotFoundException
```
❌ 说明: 修复可能没有被应用
✅ 检查:
   1. 后端容器是否有最新代码
   2. docker logs fitness-backend 查看是否有错误
   3. 确认 AuthService.java 包含 userProfileRepository.save(profile)
```

### 问题: 前端无法连接到后端
```
❌ 说明: API 连接问题
✅ 检查:
   1. curl http://localhost:8080/actuator/health
   2. 确认前端 .env 中的 API_BASE_URL 正确
   3. docker ps 确认所有容器在运行
```

---

## 🧬 完整测试流程（如需彻底验证）

```
1. ✅ 首次 Google 登录 (新用户)
   - 检查后端日志 (看到 UserProfile 创建日志)
   - 检查数据库 (User 和 UserProfile 一致)

2. ✅ 立即记录营养数据
   - 拍照、分析、保存
   - 验证成功响应 (200 OK)
   - 检查日报告显示正确

3. ✅ 现有用户登录
   - 重新登录同一账号
   - 验证 UserProfile 未被重复创建
   - 验证之前的数据还在

4. ✅ 邮箱注册新用户
   - 注册新邮箱
   - 检查后端日志 (看到 UserProfile 创建)
   - 立即记录营养数据 (成功)

5. ✅ 登出测试
   - 验证能正常登出
   - 验证返回登录页面
   - 验证能再次登录
```

---

## 📝 测试记录模板

```
测试日期: _____________
测试者: _____________

□ 新用户 Google 登录成功
□ 后端日志显示创建了 UserProfile
□ 新用户能立即记录营养数据
□ 没有出现 EntityNotFoundException
□ 数据库中 User 和 UserProfile 对应
□ 现有用户登录不重复创建 Profile
□ 邮箱注册新用户成功
□ 登出测试通过

问题/备注: _______________________________________________________
```

---

## ✨ 快速命令参考

```bash
# 查看后端日志
docker logs -f fitness-backend

# 查看特定日志
docker logs fitness-backend | grep UserProfile

# 重启所有服务
docker-compose down && docker-compose up -d

# 进入数据库
docker exec -it fitness-postgres psql -U fitness_user -d fitness_db

# 查看所有用户
SELECT id, email, created_at FROM "user" ORDER BY created_at DESC;

# 查看所有 profile
SELECT user_id, created_at FROM user_profile ORDER BY created_at DESC;

# 查看一致性
SELECT u.id, u.email, CASE WHEN up.user_id IS NULL THEN '❌' ELSE '✅' END 
FROM "user" u LEFT JOIN user_profile up ON u.id = up.user_id 
ORDER BY u.created_at DESC;
```

---

## 🎉 准备好开始测试了吗?

**现在就可以:**
1. 打开浏览器: http://localhost:8081
2. 点击 Google 登录
3. 记录一条营养数据
4. 观察后端日志验证修复生效

**预期结果**: ✅ 一切正常工作！

---

**修复版本**: UserProfile 自动创建  
**编译状态**: ✅ BUILD SUCCESSFUL  
**启动状态**: ✅ 全部就绪  
**准备状态**: ✅ 可以开始测试

祝测试顺利! 🚀
