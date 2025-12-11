# 🔐 JWT 认证集成完整指南

## 📋 实现内容

### 1️⃣ JWT 存储工具 (`src/utils/jwtStorage.ts`)
- ✅ `saveJWT()` - 保存 JWT、Refresh Token 和用户邮箱到 SecureStore
- ✅ `getJWT()` - 从 SecureStore 读取 JWT
- ✅ `getRefreshToken()` - 读取 Refresh Token
- ✅ `getUserEmail()` - 读取用户邮箱
- ✅ `clearJWT()` - 清除所有认证信息（登出用））
- ✅ `isAuthenticated()` - 检查用户是否已登录

### 2️⃣ LoginScreen (`src/screens/LoginScreen.tsx`)
- ✅ Google OAuth 集成（iOS、Android、Web）
- ✅ 获取用户的 ID Token
- ✅ 发送 ID Token 到后端验证
- ✅ 保存返回的 JWT 到 SecureStore
- ✅ 自动跳转到主应用界面
- ✅ 加载状态管理和错误处理
- ✅ 用户友好的 UI 和错误提示

### 3️⃣ SplashScreen (`src/screens/SplashScreen.tsx`)
- ✅ 应用启动时检查 JWT 有效性
- ✅ 已登录用户 → 跳转到 Main
- ✅ 未登录用户 → 跳转到 Login

### 4️⃣ API 客户端 (`src/services/apiClient.ts`)
- ✅ 自动在所有请求头中添加 `Authorization: Bearer {JWT}`
- ✅ JWT 过期时自动刷新（通过 Refresh Token）
- ✅ 401 错误时尝试刷新 Token 并重试请求

---

## 🔄 完整认证流程

```
┌─────────────────────────────────────────────────────────────┐
│                    应用启动 (App.tsx)                        │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ↓
         ┌─────────────────────┐
         │   SplashScreen      │
         │ (检查 JWT 有效性)    │
         └────┬────────┬───────┘
              │        │
         JWT存在?  JWT过期?
          /  \       /  \
         是   否     是   否
        /     \     /     \
       ↓      ↓    ↓      ↓
     Main  Login  Login  Main
     Screen Screen Screen Screen
           
              LoginScreen
              ════════════════════════════════════════
              1. 用户点击 "Sign in with Google"
              2. promptAsync() 打开 Google 登录
              3. Google 返回 ID Token
              4. 发送 ID Token 到后端
              5. 后端验证并返回 JWT
              6. saveJWT() 保存到 SecureStore
              7. navigation.reset() 跳转到 Main
              
              MainScreen 及其他页面
              ════════════════════════════════════════
              • apiClient 自动附带 JWT header
              • 所有 API 请求都包含认证信息
              • 若 JWT 过期，自动使用 Refresh Token 刷新
```

---

## 📁 文件结构

```
frontend/src/
├── screens/
│   ├── LoginScreen.tsx          ✨ Google OAuth 登录
│   ├── SplashScreen.tsx         ✨ 应用启动检查
│   └── ...其他屏幕
│
├── services/
│   ├── apiClient.ts            ✨ 自动 JWT 注入
│   └── ...其他 API 服务
│
├── utils/
│   ├── jwtStorage.ts           ✨ SecureStore JWT 管理
│   └── ...其他工具
│
├── App.tsx                       (导航栈配置)
└── package.json                  (依赖列表)
```

---

## 🔧 环境配置

### .env 文件

```bash
# Google OAuth Client IDs
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=YOUR_IOS_CLIENT.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=YOUR_ANDROID_CLIENT.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=YOUR_WEB_CLIENT.apps.googleusercontent.com

# API Configuration
API_BASE_URL=https://api.aurafitness.com
API_KEY=your_api_key_here
```

### 获取 Google OAuth 客户端 ID

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建或选择项目
3. 启用 "Google+ API"
4. 在凭证页面创建 OAuth 2.0 客户端 ID：
   - iOS: 选择 "iOS" 应用类型
   - Android: 选择 "Android" 应用类型
   - Web: 选择 "Web 应用" 类型
5. 复制客户端 ID 到 .env 文件

---

## 📱 使用示例

### 登录流程

```tsx
// LoginScreen.tsx - 用户点击登录按钮
<Button
  title="Sign in with Google"
  onPress={() => promptAsync()}  // 触发 Google OAuth
/>

// useEffect 自动监听响应
useEffect(() => {
  if (response?.type === 'success') {
    const { id_token } = response.params;
    sendTokenToBackend(id_token);  // 发送到后端
  }
}, [response]);

// 后端返回 JWT 后
const data = await res.json();
await saveJWT(data.token, data.refreshToken, data.email);
navigation.reset({ routes: [{ name: 'Main' }] });
```

### 发送认证请求

```tsx
// 任何屏幕或组件
import { apiClient } from '@/services/apiClient';

// apiClient 会自动添加 Authorization header
const response = await apiClient.request('/api/v1/nutrition/summary', {
  method: 'GET',
});
// 请求头自动包含: Authorization: Bearer {JWT}
```

### 登出

```tsx
import { clearJWT } from '@/utils/jwtStorage';

const handleLogout = async () => {
  await clearJWT();  // 清除 JWT
  navigation.reset({ routes: [{ name: 'Login' }] });
};
```

---

## 🔒 安全最佳实践

1. **使用 SecureStore 而非 AsyncStorage**
   - ✅ `expo-secure-store` 使用平台原生加密存储
   - ❌ 不要用 `AsyncStorage`（明文存储）

2. **Refresh Token 轮换**
   - 每次使用 Refresh Token 时，后端应返回新的 Refresh Token
   - 在 apiClient 的响应拦截器中保存新 token

3. **JWT 过期时间**
   - Access Token (JWT): 短期（15分钟 ~ 1小时）
   - Refresh Token: 长期（7天 ~ 30天）

4. **HTTPS 通信**
   - 生产环境必须使用 HTTPS
   - 防止 Token 在网络传输中被截获

5. **保护敏感端点**
   - 后端应该在关键操作前验证 JWT
   - 使用 `@Secured` 或 Spring Security Filter

---

## ⚠️ 常见问题

### Q1: 如何在 Expo Go 中测试 Google OAuth？
**A:** 
1. 在 Google Cloud Console 添加 Web 客户端 ID
2. 使用 `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
3. Expo Go 会使用 Web 流程完成登录

### Q2: 如何处理 Token 刷新？
**A:**
```tsx
// apiClient 中的响应拦截器自动处理
// 如果 401 错误，尝试使用 Refresh Token 获取新 JWT
// 成功后自动保存新 token，并重试原请求
```

### Q3: 如何在离线环境工作？
**A:**
```tsx
// 检查网络连接后再发送请求
const isOnline = await NetInfo.fetch();
if (!isOnline) {
  Alert.alert('Offline', 'Please check your internet connection');
  return;
}
```

### Q4: 用户登出后怎么办？
**A:**
```tsx
// 调用 clearJWT() 清除所有存储的凭证
// 导航回 Login 屏幕
// 下次启动 SplashScreen 会检测到未登录状态
```

---

## 🚀 部署检查清单

- [ ] Google OAuth 客户端 ID 已配置到 .env
- [ ] 后端 `/auth/login` 端点已实现并测试
- [ ] 后端 `/auth/refresh` 端点已实现（可选但推荐）
- [ ] SecureStore 在 iOS 和 Android 上都可用
- [ ] JWT 过期时间已定义
- [ ] CORS 配置允许前端请求
- [ ] HTTPS 在生产环境启用
- [ ] 后端使用 Spring Security 保护 API 端点
- [ ] 测试完整的登录 → 调用 API → 登出流程
- [ ] 测试 Token 刷新逻辑
- [ ] 测试离线情况下的优雅降级

---

## 📚 相关文档

- [Expo Auth Session](https://docs.expo.dev/build/authentication/#native-flow-without-server)
- [Expo Secure Store](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [Google OAuth 文档](https://developers.google.com/identity/protocols/oauth2)
- [Spring Security JWT](https://spring.io/guides/tutorials/spring-security-and-angular-js/)

---

## 💡 后续优化

1. **Biometric 认证**: 添加指纹/面容识别快速登录
2. **单点登录 (SSO)**: 与企业 LDAP/OAuth 集成
3. **社交登录**: 支持 Apple Sign In、WeChat 等
4. **权限管理**: 基于角色的访问控制 (RBAC)
5. **审计日志**: 记录所有身份认证事件

---

*最后更新: 2025-12-10*
*作者: Aura Fitness 开发团队*
