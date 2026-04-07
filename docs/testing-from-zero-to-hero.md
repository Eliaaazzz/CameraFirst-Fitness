# 软件测试：从零到精通 (Testing From Zero to Hero)

> 基于经典测试著作与现代工程实践的完整指南
>
> 参考书目：Kent Beck《TDD by Example》、Gerard Meszaros《xUnit Test Patterns》、Freeman & Pryce《GOOS》、Roy Osherove《The Art of Unit Testing》、Michael Feathers《Working Effectively with Legacy Code》、Google《Software Engineering at Google》、Martin Fowler 测试金字塔理论、Kent C. Dodds 测试奖杯模型

---

## 目录

- [第一章：为什么需要测试](#第一章为什么需要测试)
- [第二章：测试的分类体系](#第二章测试的分类体系)
- [第三章：单元测试 (Unit Test)](#第三章单元测试-unit-test)
- [第四章：测试替身 (Test Doubles)](#第四章测试替身-test-doubles)
- [第五章：集成测试 (Integration Test)](#第五章集成测试-integration-test)
- [第六章：端到端测试 (End-to-End Test)](#第六章端到端测试-end-to-end-test)
- [第七章：测试驱动开发 (TDD)](#第七章测试驱动开发-tdd)
- [第八章：行为驱动开发 (BDD)](#第八章行为驱动开发-bdd)
- [第九章：代码覆盖率与质量度量](#第九章代码覆盖率与质量度量)
- [第十章：测试反模式与代码异味](#第十章测试反模式与代码异味)
- [第十一章：遗留代码的测试策略](#第十一章遗留代码的测试策略)
- [第十二章：前端测试](#第十二章前端测试)
- [第十三章：后端与 API 测试](#第十三章后端与-api-测试)
- [第十四章：CI/CD 中的测试](#第十四章cicd-中的测试)
- [第十五章：高级测试技术](#第十五章高级测试技术)
- [第十六章：测试文化与团队实践](#第十六章测试文化与团队实践)
- [第十七章：测试数据管理](#第十七章测试数据管理)
- [第十八章：不同架构的测试策略](#第十八章不同架构的测试策略)
- [第十九章：测试中的设计模式](#第十九章测试中的设计模式)
- [第二十章：真实世界的测试案例研究](#第二十章真实世界的测试案例研究)
- [附录 A：各语言测试框架速查](#附录-a各语言测试框架速查)
- [附录 B：推荐阅读](#附录-b推荐阅读)

---

## 第一章：为什么需要测试

### 1.1 软件缺陷的代价

软件缺陷的修复成本随着发现时间的推移呈指数增长：

```
发现阶段        相对修复成本
─────────────────────────
编码时            1x
单元测试          5x
集成测试         10x
系统测试         20x
验收测试         50x
生产环境        100x+
```

IBM Systems Sciences Institute 的经典研究表明，在生产环境中修复一个 Bug 的成本是在设计阶段修复的 **100 倍**。这就是测试存在的经济学基础 —— **越早发现缺陷，修复成本越低**。

### 1.2 测试的核心价值

测试不仅仅是"找 Bug"。Kent Beck 在《TDD by Example》中提出，测试的真正价值是：

| 价值维度 | 说明 |
|---------|------|
| **信心** | 重构时不怕破坏已有功能 |
| **文档** | 测试即是可执行的规格说明 |
| **设计驱动** | 编写可测试的代码自然会得到更好的设计 |
| **回归保护** | 防止旧 Bug 复现 |
| **沟通** | 团队通过测试理解代码意图 |

> *"我不是一个伟大的程序员，我只是一个有着伟大习惯的好程序员。"*
> —— Kent Beck

### 1.3 测试的投资回报率 (ROI)

Google 在《Software Engineering at Google》中分享了一个关键洞察：

> **碧昂丝法则 (The Beyoncé Rule)："If you liked it, then you shoulda put a test on it."**
> 如果你喜欢某个行为，就应该为它写测试。

这意味着：不是所有代码都值得测试，但所有你**在乎**的行为都应该被测试覆盖。测试是一种投资 —— 你投入编写和维护测试的时间，换取的是长期的开发速度和代码信心。

### 1.4 不写测试的真正代价

很多团队以"赶工期"为由跳过测试。但 Michael Feathers 在《Working Effectively with Legacy Code》中指出：

> **"没有测试的代码就是遗留代码 (Legacy Code)。"**

没有测试的代码库会陷入恶性循环：

```
不写测试 → 害怕修改 → 代码腐化 → 更害怕修改 → 更不敢加测试 → ...
```

而有测试的代码库则形成良性循环：

```
写测试 → 敢于重构 → 代码健康 → 开发速度提升 → 更多时间写测试 → ...
```

---

## 第二章：测试的分类体系

### 2.1 Martin Fowler 的测试金字塔 (Test Pyramid)

Mike Cohn 最早提出、Martin Fowler 广泛推广的**测试金字塔**是最经典的测试分层模型：

```
        ╱  ╲
       ╱ E2E ╲          少量：慢、贵、但高度真实
      ╱────────╲
     ╱ 集成测试  ╲        适量：中等速度与成本
    ╱──────────────╲
   ╱    单元测试     ╲      大量：快、便宜、高度隔离
  ╱────────────────────╲
```

| 层级 | 数量 | 速度 | 维护成本 | 信心来源 |
|------|------|------|---------|---------|
| 单元测试 | 多 (70%) | 毫秒级 | 低 | 单个函数/类正确 |
| 集成测试 | 中 (20%) | 秒级 | 中 | 组件协作正确 |
| E2E 测试 | 少 (10%) | 分钟级 | 高 | 用户场景正确 |

**金字塔的核心思想：** 底层测试多而快，顶层测试少而慢。如果你的测试分布像"冰淇淋甜筒"（大量 E2E、少量单元测试），你的测试套件会又慢又脆弱。

### 2.2 Kent C. Dodds 的测试奖杯 (Testing Trophy)

Kent C. Dodds 在 2018 年提出了对测试金字塔的修正 —— **测试奖杯**模型，更适合现代前端开发：

```
          ╱╲
         ╱E2E╲
        ╱──────╲
       ╱        ╲
      ╱  集成测试  ╲        ← 最多的投入在这里
     ╱   (核心层)   ╲
    ╱────────────────╲
   ╱    单元测试       ╲
  ╱──────────────────────╲
  ┃    静态分析 (lint/ts)  ┃   ← 底座
  ╰────────────────────────╯
```

**奖杯 vs 金字塔的关键差异：**

| 维度 | 金字塔 | 奖杯 |
|------|--------|------|
| 最大投入 | 单元测试 | 集成测试 |
| 底座 | 无 | 静态分析 (TypeScript, ESLint) |
| 适用场景 | 后端/算法密集型 | 前端/UI 交互密集型 |
| 核心理念 | 隔离测试 | 测试行为，不测试实现 |

Dodds 的核心论点：

> *"Write tests. Not too many. Mostly integration."*
> 写测试。不要太多。主要写集成测试。

### 2.3 Google 的测试尺寸分类 (Test Sizes)

Google 不按"单元/集成/E2E"分类，而是按**测试尺寸**分类：

| 尺寸 | 定义 | 时间限制 | 网络访问 | 数据库 | 文件系统 |
|------|------|---------|---------|--------|---------|
| Small | 单进程 | < 60s | ❌ | ❌ | ❌ |
| Medium | 单机器 | < 300s | localhost | ✅ | ✅ |
| Large | 多机器 | < 900s | ✅ | ✅ | ✅ |

Google 的经验法则：**约 80% Small、15% Medium、5% Large**。

这种分类方式的优势在于它是**客观的**：不需要争论"这算不算集成测试"，只需要看它访问了什么资源。

### 2.4 各分类体系对比总结

```
金字塔            奖杯              Google
─────            ─────             ──────
E2E              E2E               Large
集成测试          集成测试(核心)      Medium
单元测试(核心)     单元测试           Small
                 静态分析
```

**我的建议：** 不必教条地遵循某一个模型。理解每个模型的原理，根据你的项目特点（前端/后端/全栈）和团队现状选择合适的测试策略。

---

## 第三章：单元测试 (Unit Test)

### 3.1 什么是单元测试？

关于"单元"的定义，业界有两大流派：

| 流派 | 代表人物 | "单元"的定义 | 对依赖的态度 |
|------|---------|-------------|-------------|
| **经典学派 (Classical/Detroit)** | Kent Beck, Martin Fowler | 一个行为单元（可能涉及多个类） | 只替换共享依赖（数据库、文件系统） |
| **伦敦学派 (London/Mockist)** | Freeman & Pryce (GOOS) | 一个类或方法 | 替换所有外部协作者 |

**经典学派示例（允许真实协作者）：**

```javascript
// 不 mock ShoppingCart，因为它是内部协作者
test('结算时应计算含税总价', () => {
  const cart = new ShoppingCart();
  cart.add(new Product('苹果', 10));
  cart.add(new Product('牛奶', 15));

  const total = cart.checkout(taxRate: 0.1);

  expect(total).toBe(27.5); // (10 + 15) * 1.1
});
```

**伦敦学派示例（mock 所有协作者）：**

```javascript
test('结算时应调用支付服务', () => {
  const paymentService = mock(PaymentService);
  const cart = new ShoppingCart(paymentService);
  cart.add(new Product('苹果', 10));

  cart.checkout();

  expect(paymentService.charge).toHaveBeenCalledWith(10);
});
```

### 3.2 FIRST 原则

好的单元测试应满足 **FIRST** 原则：

| 原则 | 英文 | 说明 | 反例 |
|------|------|------|------|
| **F** | Fast | 毫秒级完成 | 测试中访问真实数据库 |
| **I** | Isolated/Independent | 测试间互不依赖 | 测试 B 依赖测试 A 的输出 |
| **R** | Repeatable | 任何环境下结果一致 | 依赖当前时间或随机数 |
| **S** | Self-validating | 自动判定通过/失败 | 需要人工检查日志 |
| **T** | Timely | 与生产代码同步编写 | 项目结束才补测试 |

### 3.3 AAA 模式 (Arrange-Act-Assert)

AAA 是单元测试最广泛使用的结构化模式，由 Bill Wake 提出：

```javascript
test('用户注册成功后应返回用户对象', () => {
  // Arrange（准备）—— 设置测试前置条件
  const userService = new UserService(new InMemoryUserRepo());
  const request = { name: '张三', email: 'zhang@test.com' };

  // Act（执行）—— 调用被测行为
  const result = userService.register(request);

  // Assert（断言）—— 验证结果
  expect(result.id).toBeDefined();
  expect(result.name).toBe('张三');
  expect(result.email).toBe('zhang@test.com');
});
```

**AAA 的关键规则：**

1. **Act 只有一行** —— 如果需要多行才能触发行为，说明 API 设计有问题
2. **Assert 验证一个逻辑概念** —— 可以有多个 `expect`，但它们应该验证同一个行为的不同方面
3. **Arrange 可以提取到 `beforeEach`** —— 但只提取所有测试共享的部分

### 3.4 测试命名规范

Roy Osherove 在《The Art of Unit Testing》中推荐的命名模式：

```
[被测方法]_[场景]_[期望行为]
```

示例：

```javascript
// ✅ 好的命名
test('withdraw_InsufficientFunds_ThrowsException', ...)
test('calculate_NegativeInput_ReturnsZero', ...)
test('register_DuplicateEmail_ReturnsConflictError', ...)

// ✅ BDD 风格命名（同样优秀）
describe('提现', () => {
  it('余额不足时应抛出异常', ...)
  it('金额为负数时应返回零', ...)
});

// ❌ 差的命名
test('test1', ...)
test('it works', ...)
test('should work correctly', ...)
```

**好的测试名称是失败时最好的错误信息。** 当 CI 报红时，你应该能从测试名称直接判断哪个行为出了问题。

### 3.5 断言的最佳实践

```javascript
// ❌ 错误：使用布尔断言，失败信息没有意义
expect(user.age === 25).toBe(true);
// 失败信息: Expected true, received false （毫无帮助）

// ✅ 正确：使用语义化断言
expect(user.age).toBe(25);
// 失败信息: Expected 25, received 30 （一目了然）

// ❌ 错误：一个测试验证太多不相关的东西
test('用户系统', () => {
  expect(register()).toSucceed();
  expect(login()).toSucceed();
  expect(updateProfile()).toSucceed();
  expect(deleteAccount()).toSucceed();
});

// ✅ 正确：每个测试验证一个行为
test('注册成功后可以登录', () => { ... });
test('更新个人资料应保存新信息', () => { ... });
```

### 3.6 处理边界条件

优秀的单元测试应覆盖以下边界情况（助记符 **CORRECT**）：

| 字母 | 英文 | 说明 | 示例 |
|------|------|------|------|
| **C** | Conformance | 是否符合格式 | 邮箱格式、手机号格式 |
| **O** | Ordering | 顺序是否重要 | 排序结果、事件顺序 |
| **R** | Range | 范围边界 | 最大值、最小值、空集合 |
| **R** | Reference | 外部引用 | null、undefined、空字符串 |
| **E** | Existence | 是否存在 | 0个元素、1个元素 |
| **C** | Cardinality | 数量边界 | 恰好 0、1、n-1、n、n+1 |
| **T** | Time | 时间相关 | 超时、并发、时区 |

---

## 第四章：测试替身 (Test Doubles)

### 4.1 Gerard Meszaros 的分类法

Gerard Meszaros 在《xUnit Test Patterns》中定义了五种测试替身。这是业界最权威的分类：

```
                    Test Double（测试替身）
                          │
        ┌─────┬──────┬────┴────┬──────┐
      Dummy  Stub   Spy     Mock    Fake
      哑对象  桩件   间谍     模拟    伪件
```

| 类型 | 目的 | 行为 | 验证方式 |
|------|------|------|---------|
| **Dummy** | 填充参数列表 | 无行为，传入但不使用 | 不验证 |
| **Stub** | 提供预设返回值 | 返回固定数据 | 状态验证 |
| **Spy** | 记录调用信息 | 记录被调用的方法/参数 | 行为验证 |
| **Mock** | 验证交互行为 | 预设期望 + 自动验证 | 行为验证 |
| **Fake** | 轻量替代实现 | 有简化的业务逻辑 | 状态验证 |

### 4.2 每种替身的代码示例

#### Dummy（哑对象）

```javascript
// logger 参数是必须的，但在此测试中不会被使用
test('创建用户时应生成 UUID', () => {
  const dummyLogger = {} as Logger;  // Dummy：不会被调用
  const service = new UserService(dummyLogger);

  const user = service.create('张三');

  expect(user.id).toMatch(/^[0-9a-f-]{36}$/);
});
```

#### Stub（桩件）

```javascript
// stub 提供预设返回值，测试验证的是状态（返回值）
test('库存不足时应显示缺货标记', () => {
  const inventoryStub = {
    getStock: () => 0  // Stub：总是返回 0
  };
  const product = new ProductPage(inventoryStub);

  expect(product.getLabel()).toBe('缺货');
});
```

#### Spy（间谍）

```javascript
// spy 记录调用信息，测试后手动检查
test('下单时应发送确认邮件', () => {
  const emailSpy = {
    calls: [],
    send(to, subject) { this.calls.push({ to, subject }); }
  };
  const orderService = new OrderService(emailSpy);

  orderService.placeOrder({ userId: '123', item: '手机' });

  expect(emailSpy.calls).toHaveLength(1);
  expect(emailSpy.calls[0].subject).toContain('订单确认');
});
```

#### Mock（模拟对象）

```javascript
// mock 预设期望，框架自动验证
test('下单时应发送确认邮件', () => {
  const emailMock = jest.fn();  // Jest 自动创建 mock
  const orderService = new OrderService({ send: emailMock });

  orderService.placeOrder({ userId: '123', item: '手机' });

  expect(emailMock).toHaveBeenCalledTimes(1);
  expect(emailMock).toHaveBeenCalledWith(
    expect.stringContaining('@'),
    expect.stringContaining('订单确认')
  );
});
```

#### Fake（伪件）

```javascript
// fake 有真实的简化实现
class InMemoryUserRepository implements UserRepository {
  private users = new Map();

  async save(user) {
    this.users.set(user.id, { ...user });
  }

  async findById(id) {
    return this.users.get(id) || null;
  }

  async findByEmail(email) {
    return [...this.users.values()].find(u => u.email === email) || null;
  }
}

test('注册后应能通过邮箱找到用户', async () => {
  const repo = new InMemoryUserRepository();  // Fake：真实逻辑，内存存储
  const service = new UserService(repo);

  await service.register({ name: '张三', email: 'zhang@test.com' });
  const found = await service.findByEmail('zhang@test.com');

  expect(found.name).toBe('张三');
});
```

### 4.3 状态验证 vs 行为验证

这是理解测试替身最关键的概念区分：

```
状态验证 (State Verification)
  → 调用被测方法后，检查返回值或对象状态
  → 使用 Stub / Fake
  → "做完之后，结果对不对？"

行为验证 (Behavior Verification)
  → 调用被测方法后，检查是否正确调用了依赖
  → 使用 Mock / Spy
  → "做的过程中，有没有正确调用合作者？"
```

**Martin Fowler 的建议：** 优先使用状态验证。行为验证会让测试与实现细节耦合，导致重构时测试大量失败（即使行为没变）。

```javascript
// ❌ 过度行为验证（脆弱）
test('计算折扣', () => {
  const calculator = mock(PriceCalculator);
  when(calculator.getBasePrice()).thenReturn(100);
  when(calculator.getDiscount()).thenReturn(0.1);
  when(calculator.applyTax(90)).thenReturn(99);

  const result = orderService.calculateTotal(calculator);

  // 这些断言验证的是实现细节，而不是行为
  verify(calculator.getBasePrice()).calledOnce();
  verify(calculator.getDiscount()).calledOnce();
  verify(calculator.applyTax(90)).calledOnce();
});

// ✅ 状态验证（健壮）
test('计算折扣', () => {
  const order = new Order([
    { name: '手机', price: 100 }
  ]);

  const total = orderService.calculateTotal(order, { discount: 0.1, taxRate: 0.1 });

  expect(total).toBe(99); // 100 * 0.9 * 1.1 = 99
});
```

### 4.4 何时使用哪种替身

```
你需要...                      → 使用
─────────────────────────────────────────
填充参数，不使用              → Dummy
控制输入，验证输出            → Stub
验证是否调用了外部系统        → Mock/Spy
替代慢/贵的真实依赖          → Fake
模拟异常/边界情况             → Stub（返回错误）
```

**经验法则：**
- 数据库 → **Fake**（InMemoryRepository）或 **真实数据库**（集成测试）
- HTTP API → **Stub**（WireMock / MSW）
- 邮件/短信服务 → **Mock/Spy**（验证是否发送）
- 时间/随机数 → **Stub**（注入固定值）
- 日志 → **Dummy** 或 **Spy**

---

## 第五章：集成测试 (Integration Test)

### 5.1 定义与范围

集成测试验证**多个组件协同工作**的正确性。与单元测试的关键区别：

```
单元测试：  [组件A] → 结果正确？ ✓
集成测试：  [组件A] → [组件B] → [组件C] → 结果正确？ ✓
```

Martin Fowler 将集成测试分为两种：

| 类型 | 说明 | 示例 |
|------|------|------|
| **窄集成测试 (Narrow)** | 测试一个组件与其直接依赖 | Service + 真实 DB |
| **宽集成测试 (Broad)** | 测试多个组件的完整链路 | Controller → Service → DB |

### 5.2 数据库集成测试

这是最常见的集成测试场景。以下是最佳实践：

```javascript
// 使用测试容器（Testcontainers）启动真实数据库
describe('UserRepository 集成测试', () => {
  let db;
  let repo;

  beforeAll(async () => {
    // 启动一个临时 PostgreSQL 容器
    db = await new PostgreSqlContainer()
      .withDatabase('test_db')
      .start();

    repo = new UserRepository(db.getConnectionString());
    await repo.migrate();  // 运行数据库迁移
  });

  afterAll(async () => {
    await db.stop();
  });

  beforeEach(async () => {
    await db.query('TRUNCATE users CASCADE');  // 每个测试前清空数据
  });

  test('保存用户后应能通过 ID 查询', async () => {
    const user = { name: '张三', email: 'zhang@test.com' };

    const saved = await repo.save(user);
    const found = await repo.findById(saved.id);

    expect(found).toEqual(expect.objectContaining({
      name: '张三',
      email: 'zhang@test.com'
    }));
  });

  test('查询不存在的用户应返回 null', async () => {
    const found = await repo.findById('non-existent-id');

    expect(found).toBeNull();
  });
});
```

**关键原则：**

1. **使用真实数据库，而非内存替代品** —— SQLite 与 PostgreSQL 的行为差异会导致虚假通过
2. **每个测试独立** —— `beforeEach` 中清理数据，不依赖测试执行顺序
3. **使用 Testcontainers** —— 避免污染开发数据库，CI 中可重复运行

### 5.3 HTTP API 集成测试

测试你的服务与外部 API 的集成：

```javascript
// 使用 MSW (Mock Service Worker) 拦截 HTTP 请求
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
  // 模拟天气 API 的响应
  http.get('https://api.weather.com/current', () => {
    return HttpResponse.json({
      city: '北京',
      temperature: 22,
      condition: '晴'
    });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('获取天气信息应返回格式化结果', async () => {
  const weather = await weatherService.getCurrent('北京');

  expect(weather).toEqual({
    city: '北京',
    display: '22°C · 晴'
  });
});

test('API 超时时应返回缓存数据', async () => {
  // 模拟超时
  server.use(
    http.get('https://api.weather.com/current', () => {
      return new Promise(() => {});  // 永不响应
    })
  );

  const weather = await weatherService.getCurrent('北京');

  expect(weather.fromCache).toBe(true);
});
```

### 5.4 消息队列集成测试

```javascript
describe('订单事件处理', () => {
  let kafka;
  let producer;
  let consumer;

  beforeAll(async () => {
    kafka = new KafkaContainer().start();
    producer = kafka.createProducer();
    consumer = kafka.createConsumer({ groupId: 'test' });
    await consumer.subscribe({ topic: 'order-events' });
  });

  test('下单事件应触发库存扣减', async () => {
    const results = [];
    consumer.on('message', (msg) => results.push(msg));

    // 发送下单事件
    await producer.send({
      topic: 'order-events',
      messages: [{ value: JSON.stringify({ type: 'ORDER_PLACED', itemId: '123', qty: 2 }) }]
    });

    // 等待处理完成
    await waitFor(() => expect(results).toHaveLength(1));

    // 验证库存已扣减
    const stock = await inventoryService.getStock('123');
    expect(stock).toBe(initialStock - 2);
  });
});
```

### 5.5 集成测试的常见陷阱

| 陷阱 | 问题 | 解决方案 |
|------|------|---------|
| **测试间共享状态** | 测试顺序影响结果 | 每个测试前重置状态 |
| **等待硬编码时间** | `sleep(5000)` 既慢又不可靠 | 使用轮询 + 超时的 `waitFor` |
| **mock 过度** | 集成测试 mock 太多，失去价值 | 只 mock 不可控的外部边界 |
| **数据清理不彻底** | 前一个测试的数据影响后一个 | 使用事务回滚或 TRUNCATE |
| **环境依赖** | 只在某台机器上能跑 | 使用 Testcontainers / Docker |

### 5.6 契约测试 (Contract Testing)

当多个服务需要集成时，传统的集成测试变得困难（需要同时运行所有服务）。**契约测试**提供了一种轻量替代方案：

```
传统集成测试:
  [Consumer] ←→ [Provider]    需要同时运行两个服务

契约测试:
  [Consumer] → 生成契约文件 → [Provider] 验证契约
  两个服务可以独立测试！
```

使用 Pact 框架的示例：

```javascript
// Consumer 端：定义期望
const interaction = {
  state: '用户 123 存在',
  uponReceiving: '获取用户请求',
  withRequest: {
    method: 'GET',
    path: '/api/users/123'
  },
  willRespondWith: {
    status: 200,
    body: {
      id: '123',
      name: like('张三'),     // 匹配任意字符串
      age: like(25)            // 匹配任意数字
    }
  }
};

// Provider 端：验证契约
// Pact 会自动发送请求并验证响应是否匹配契约
```

---

## 第六章：端到端测试 (End-to-End Test)

### 6.1 定义与价值

端到端 (E2E) 测试从用户视角验证整个系统：

```
[用户操作] → [前端] → [API] → [后端] → [数据库] → 响应 → [前端渲染] → [用户看到结果]
```

E2E 测试是唯一能验证**所有组件在生产环境般条件下协同工作**的测试类型。

**E2E 测试的取舍：**

| 优势 | 劣势 |
|------|------|
| 最接近真实用户场景 | 运行速度慢（分钟级） |
| 能发现集成接缝处的 Bug | 维护成本高 |
| 给发布提供最高信心 | 容易出现 Flaky 测试 |
| 不依赖实现细节 | 失败时定位困难 |

### 6.2 E2E 测试策略

**不要试图 E2E 覆盖所有场景。** 遵循以下策略：

```
E2E 测试应覆盖:
  ✅ 关键用户旅程（注册 → 登录 → 核心操作 → 结果）
  ✅ 金钱相关流程（支付、退款）
  ✅ 跨系统的关键集成点

E2E 不应覆盖:
  ❌ 边界条件（用单元测试覆盖）
  ❌ 错误处理分支（用单元/集成测试覆盖）
  ❌ UI 样式细节（用视觉回归测试覆盖）
```

### 6.3 Web E2E 测试示例 (Playwright)

```javascript
import { test, expect } from '@playwright/test';

test.describe('用户注册流程', () => {
  test('新用户可以注册并登录', async ({ page }) => {
    // 1. 访问注册页面
    await page.goto('/register');

    // 2. 填写注册表单
    await page.fill('[data-testid="name-input"]', '张三');
    await page.fill('[data-testid="email-input"]', `test-${Date.now()}@example.com`);
    await page.fill('[data-testid="password-input"]', 'SecurePass123!');

    // 3. 提交表单
    await page.click('[data-testid="register-button"]');

    // 4. 验证跳转到仪表盘
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="welcome-message"]'))
      .toContainText('欢迎, 张三');
  });

  test('已存在的邮箱应显示错误提示', async ({ page }) => {
    await page.goto('/register');
    await page.fill('[data-testid="email-input"]', 'existing@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePass123!');
    await page.click('[data-testid="register-button"]');

    await expect(page.locator('[data-testid="error-message"]'))
      .toContainText('该邮箱已注册');
  });
});
```

### 6.4 移动端 E2E 测试 (Detox)

```javascript
describe('餐食记录流程', () => {
  beforeAll(async () => {
    await device.launchApp();
    await loginAsTestUser();
  });

  it('拍照记录一餐', async () => {
    // 点击相机按钮
    await element(by.id('camera-fab')).tap();

    // 模拟拍照
    await element(by.id('capture-button')).tap();

    // 等待 AI 分析完成
    await waitFor(element(by.id('analysis-result')))
      .toBeVisible()
      .withTimeout(10000);

    // 验证识别结果
    await expect(element(by.id('food-name'))).toHaveText('米饭');

    // 确认记录
    await element(by.id('confirm-button')).tap();

    // 验证回到首页并显示记录
    await expect(element(by.id('meal-list'))).toBeVisible();
    await expect(element(by.text('米饭'))).toBeVisible();
  });
});
```

### 6.5 对抗 Flaky 测试

Flaky 测试（时而通过时而失败的测试）是 E2E 测试最大的敌人。Google 的数据显示，约 **16%** 的测试存在不同程度的 flakiness。

**常见原因与对策：**

| 原因 | 症状 | 解决方案 |
|------|------|---------|
| **等待不足** | 元素还没渲染就断言 | 使用 `waitFor` / `expect.poll` |
| **测试间共享状态** | 单独运行通过，一起运行失败 | 每个测试完全独立 |
| **动画干扰** | 点击时元素在移动 | 测试环境禁用动画 |
| **时间依赖** | 跨天运行失败 | Mock 系统时间 |
| **网络波动** | 外部 API 偶尔超时 | E2E 只访问自有服务 |
| **并发竞争** | 数据库并发写入冲突 | 使用唯一测试数据 |

**Google 的 Flaky 测试管理策略：**

1. **自动检测** —— 同一测试运行 3 次，如果结果不一致则标记为 Flaky
2. **隔离** —— Flaky 测试自动从主流水线移除，避免阻塞其他开发者
3. **归档** —— 超过 N 天未修复的 Flaky 测试自动删除
4. **赏金** —— 修复 Flaky 测试被视为对团队的重要贡献

### 6.6 Page Object Model

Page Object 是 E2E 测试中最重要的设计模式，将页面交互封装为可复用的对象：

```javascript
// page-objects/LoginPage.js
class LoginPage {
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email, password) {
    await this.page.fill('[data-testid="email"]', email);
    await this.page.fill('[data-testid="password"]', password);
    await this.page.click('[data-testid="login-btn"]');
  }

  async getErrorMessage() {
    return this.page.textContent('[data-testid="error"]');
  }
}

// 测试中使用
test('登录成功', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('user@test.com', 'password123');

  await expect(page).toHaveURL('/dashboard');
});
```

**Page Object 的好处：**
- UI 变更时只需修改 Page Object，不需要修改所有测试
- 测试代码可读性大幅提升
- 常用操作可复用

---

## 第七章：测试驱动开发 (TDD)

### 7.1 TDD 的核心循环

Kent Beck 在《TDD by Example》中定义了 TDD 的三步循环，又称 **Red-Green-Refactor**：

```
        ┌──────────┐
   ┌────│  🔴 Red   │ 写一个失败的测试
   │    └─────┬────┘
   │          ↓
   │    ┌──────────┐
   │    │ 🟢 Green │ 用最少的代码让测试通过
   │    └─────┬────┘
   │          ↓
   │    ┌──────────────┐
   └────│ 🔵 Refactor  │ 重构代码，保持测试通过
        └──────────────┘
```

**三条核心规则（Uncle Bob's Three Laws of TDD）：**

1. **在编写一个失败的单元测试之前，不要编写任何生产代码**
2. **只编写刚好导致测试失败的测试代码（编译不通过也算失败）**
3. **只编写刚好让当前失败测试通过的生产代码**

### 7.2 TDD 实战示例：实现一个罗马数字转换器

让我们用 TDD 从零实现一个阿拉伯数字 → 罗马数字的转换器。

**第 1 轮：Red → Green → Refactor**

```javascript
// 🔴 Red：写第一个失败的测试
test('1 应该转换为 I', () => {
  expect(toRoman(1)).toBe('I');
});

// 🟢 Green：最简单的实现
function toRoman(num) {
  return 'I';
}

// 🔵 Refactor：暂时没什么可重构的
```

**第 2 轮：**

```javascript
// 🔴 Red
test('2 应该转换为 II', () => {
  expect(toRoman(2)).toBe('II');
});

// 🟢 Green
function toRoman(num) {
  return 'I'.repeat(num);
}
```

**第 3 轮：**

```javascript
// 🔴 Red
test('4 应该转换为 IV', () => {
  expect(toRoman(4)).toBe('IV');
});

// 🟢 Green：开始引入映射表
function toRoman(num) {
  const mappings = [
    [4, 'IV'],
    [1, 'I'],
  ];
  let result = '';
  for (const [value, symbol] of mappings) {
    while (num >= value) {
      result += symbol;
      num -= value;
    }
  }
  return result;
}
```

**第 N 轮（最终版本）：**

```javascript
// 经过多轮 TDD，最终的完整映射表
function toRoman(num) {
  const mappings = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'],  [90, 'XC'],  [50, 'L'],  [40, 'XL'],
    [10, 'X'],   [9, 'IX'],   [5, 'V'],   [4, 'IV'],
    [1, 'I'],
  ];
  let result = '';
  for (const [value, symbol] of mappings) {
    while (num >= value) {
      result += symbol;
      num -= value;
    }
  }
  return result;
}
```

**观察：** 通过 TDD，我们从一个极其简单的实现开始，逐步被测试"驱动"到了正确的通用解决方案。这就是 TDD 的魔力 —— **小步前进，每一步都有测试保护**。

### 7.3 TDD 的不同风格

| 风格 | 又称 | 方向 | 测试替身使用 | 代表 |
|------|------|------|-------------|------|
| **Inside-Out** | Classic TDD / Chicago School | 从内部（领域层）开始 | 较少使用 mock | Kent Beck |
| **Outside-In** | London School / Mockist TDD | 从外部（API/UI）开始 | 大量使用 mock | Freeman & Pryce |

**Inside-Out 流程：**
```
1. 先实现核心领域逻辑（如 Calculator）
2. 再实现服务层（如 OrderService）
3. 最后实现 Controller / UI
```

**Outside-In 流程：**
```
1. 先写 E2E 或 Controller 测试（失败）
2. mock 掉内层依赖，让外层通过
3. 进入内层，实现被 mock 的部分
4. 层层深入，直到所有层都有真实实现
```

### 7.4 TDD 的常见误解

| 误解 | 真相 |
|------|------|
| "TDD 会让开发变慢" | 短期编写时间增加 15-30%，但总交付时间（含调试/修复）通常减少 |
| "TDD 意味着 100% 覆盖率" | TDD 追求的是设计质量，不是覆盖率数字 |
| "所有代码都要 TDD" | 探索性代码、UI 样式代码可以不用 TDD |
| "测试先写等于需求先定" | TDD 中测试会随着理解加深而演化 |
| "TDD 等于单元测试" | TDD 可以在任何测试层级使用 |

### 7.5 何时使用 TDD，何时不使用

**适合 TDD 的场景：**
- 业务逻辑清晰的功能
- 算法实现
- API 设计
- Bug 修复（先写复现 Bug 的测试）

**不太适合 TDD 的场景：**
- 探索性原型（不确定要做什么）
- 纯 UI 布局（视觉效果难以用代码断言）
- 第三方 API 集成（先手动探索 API 行为）

---

## 第八章：行为驱动开发 (BDD)

### 8.1 从 TDD 到 BDD

BDD 由 Dan North 在 2003 年提出，是 TDD 的一种演化。核心理念：**用所有人都能理解的语言描述软件行为**。

```
TDD:  开发者写技术性测试
BDD:  业务人员、测试人员、开发者共同写行为规格
```

### 8.2 Gherkin 语言

BDD 使用 **Gherkin** 语言编写行为规格，这是一种接近自然语言的格式：

```gherkin
# 功能描述
Feature: 用户登录
  作为一名注册用户
  我想要登录系统
  以便访问我的个人数据

  # 场景 1
  Scenario: 使用正确的凭证登录
    Given 存在一个邮箱为 "zhang@test.com" 的注册用户
    And 该用户的密码是 "SecurePass123"
    When 用户输入邮箱 "zhang@test.com" 和密码 "SecurePass123"
    And 点击登录按钮
    Then 应该跳转到仪表盘页面
    And 显示欢迎信息 "欢迎回来, 张三"

  # 场景 2
  Scenario: 使用错误的密码登录
    Given 存在一个邮箱为 "zhang@test.com" 的注册用户
    When 用户输入邮箱 "zhang@test.com" 和密码 "WrongPassword"
    And 点击登录按钮
    Then 应该显示错误信息 "邮箱或密码不正确"
    And 不应该跳转到仪表盘页面

  # 场景大纲（参数化）
  Scenario Outline: 密码强度验证
    When 用户输入密码 "<password>"
    Then 密码强度应为 "<strength>"

    Examples:
      | password      | strength |
      | 123           | 弱       |
      | abc123        | 中       |
      | Abc123!@#xyz  | 强       |
```

### 8.3 Gherkin → 可执行测试

Gherkin 不只是文档 —— 它可以直接映射为可执行的测试代码：

```javascript
// step-definitions/login.steps.js
const { Given, When, Then } = require('@cucumber/cucumber');

Given('存在一个邮箱为 {string} 的注册用户', async function(email) {
  this.user = await createTestUser({ email });
});

When('用户输入邮箱 {string} 和密码 {string}', async function(email, password) {
  await this.loginPage.fill('email', email);
  await this.loginPage.fill('password', password);
});

When('点击登录按钮', async function() {
  this.response = await this.loginPage.clickLogin();
});

Then('应该跳转到仪表盘页面', async function() {
  expect(this.page.url()).toContain('/dashboard');
});

Then('显示欢迎信息 {string}', async function(message) {
  const welcome = await this.page.textContent('[data-testid="welcome"]');
  expect(welcome).toBe(message);
});
```

### 8.4 BDD 的价值与适用场景

**价值：**
- 业务人员可以阅读甚至编写测试
- 测试即是活的文档，永远与代码同步
- 减少需求理解偏差

**最适合：** 复杂的业务逻辑、多角色协作的项目、有 BA/QA 参与的团队

**不太适合：** 纯技术项目、个人开发、基础设施代码

---

## 第九章：代码覆盖率与质量度量

### 9.1 覆盖率的种类

| 类型 | 定义 | 严格度 | 示例 |
|------|------|--------|------|
| **行覆盖率 (Line)** | 执行过的代码行占比 | 最低 | 一行中的多个分支可能只走了一个 |
| **分支覆盖率 (Branch)** | 每个 if/else 分支是否都执行过 | 中等 | `if (a && b)` 需要测试 a=true/false, b=true/false |
| **路径覆盖率 (Path)** | 所有可能的执行路径 | 最高 | N 个 if 有 2^N 条路径 |
| **变异覆盖率 (Mutation)** | 修改代码后测试是否能检测到 | 最有意义 | 把 `>` 改成 `>=`，测试应该失败 |

### 9.2 覆盖率的陷阱

```javascript
// 这个测试有 100% 行覆盖率，但几乎没有验证任何东西
test('处理订单', () => {
  const result = processOrder(testOrder);
  // 没有断言！只是调用了一下函数
  // 覆盖率工具会显示所有行都被执行了
});
```

> *"覆盖率是一个有用的'负指标'：低覆盖率意味着测试不足，但高覆盖率不意味着测试充分。"*
> —— Martin Fowler

**Google 的覆盖率实践：**
- 没有强制的覆盖率阈值
- 在 Code Review 中显示变更的覆盖率（"这个新增的 if 分支有测试吗？"）
- 关注**增量覆盖率**（新代码的覆盖率），而非全局覆盖率

### 9.3 变异测试 (Mutation Testing)

变异测试是衡量测试质量最有效的方法。原理：

```
1. 工具自动修改源代码（创建"变异体"）
   - 把 > 改成 >=
   - 把 + 改成 -
   - 把 true 改成 false
   - 删除一行代码

2. 对每个变异体运行测试套件

3. 如果测试通过 → 变异体"存活" → 测试有漏洞！
   如果测试失败 → 变异体被"杀死" → 测试有效 ✓

4. 变异分数 = 被杀死的变异体 / 总变异体
```

```javascript
// 源代码
function isAdult(age) {
  return age >= 18;  // 原始代码
}

// 变异体 1: age > 18 （边界变异）
// 变异体 2: age >= 17 （常量变异）
// 变异体 3: age <= 18 （运算符变异）
// 变异体 4: return true （返回值变异）

// 如果你的测试只有：
test('成年人', () => expect(isAdult(25)).toBe(true));
test('未成年', () => expect(isAdult(10)).toBe(false));

// 变异体 1 (age > 18) 会存活！因为你没有测试 age = 18 的边界
// 好的测试应该加上：
test('刚好 18 岁', () => expect(isAdult(18)).toBe(true));
```

**常用变异测试工具：**
- JavaScript: **Stryker**
- Java: **PIT (pitest)**
- Python: **mutmut**

### 9.4 推荐的度量策略

| 度量 | 建议 | 原因 |
|------|------|------|
| 行覆盖率 | 作为参考，不作为门禁 | 容易游戏化 |
| 分支覆盖率 | 关键模块 > 80% | 比行覆盖率更有意义 |
| 变异分数 | 核心业务逻辑 > 70% | 真正衡量测试质量 |
| 增量覆盖率 | 新代码 > 80% | 防止覆盖率持续下降 |

---

## 第十章：测试反模式与代码异味

### 10.1 Gerard Meszaros 的测试异味分类

Meszaros 在《xUnit Test Patterns》中系统化地整理了测试代码中的"坏味道"：

### 10.2 行为异味 (Behavior Smells)

#### 脆弱测试 (Fragile Test)

```javascript
// ❌ 脆弱：依赖实现细节（HTML 结构）
test('显示用户名', () => {
  const { container } = render(<UserProfile />);
  expect(container.querySelector('div > span.name-label')).toHaveTextContent('张三');
});

// ✅ 健壮：依赖语义标记
test('显示用户名', () => {
  render(<UserProfile />);
  expect(screen.getByTestId('user-name')).toHaveTextContent('张三');
  // 更好：使用 accessible role
  expect(screen.getByRole('heading', { name: '张三' })).toBeVisible();
});
```

#### 缓慢测试 (Slow Test)

```javascript
// ❌ 每个测试都创建完整的数据库连接
describe('UserService', () => {
  test('test1', async () => {
    const db = await connectDatabase();  // 2秒
    // ... 测试逻辑
    await db.close();
  });
  test('test2', async () => {
    const db = await connectDatabase();  // 又 2秒
    // ... 测试逻辑
    await db.close();
  });
});

// ✅ 共享连接，只创建一次
describe('UserService', () => {
  let db;
  beforeAll(async () => { db = await connectDatabase(); });
  afterAll(async () => { await db.close(); });
  beforeEach(async () => { await db.truncateAll(); });

  test('test1', async () => { /* ... */ });
  test('test2', async () => { /* ... */ });
});
```

### 10.3 代码异味 (Code Smells)

#### 神秘的访客 (Mystery Guest)

```javascript
// ❌ 测试依赖外部文件，不知道文件里有什么
test('解析 CSV', () => {
  const result = parseCSV('./test-data/users.csv');
  expect(result).toHaveLength(3);  // 为什么是 3？不读文件不知道
});

// ✅ 测试数据内联，一目了然
test('解析 CSV', () => {
  const csv = 'name,age\n张三,25\n李四,30\n王五,35';
  const result = parseCSV(csv);
  expect(result).toHaveLength(3);
});
```

#### 过度设置 (Excessive Setup)

```javascript
// ❌ 20 行的 setup，测试本身只有 2 行
test('计算订单总价', () => {
  const address = new Address('北京', '朝阳区', '...', '100000');
  const customer = new Customer('张三', 'zhang@test.com', address);
  const category = new Category('电子产品', 0.13);
  const brand = new Brand('Apple', 'US');
  const product = new Product('iPhone', 9999, category, brand);
  const warehouse = new Warehouse('北京仓', address);
  const inventory = new Inventory(warehouse, product, 100);
  const coupon = new Coupon('SAVE10', 0.1, new Date('2025-12-31'));
  const order = new Order(customer, [{ product, qty: 1 }], coupon);
  const shippingCalc = new ShippingCalculator(address, warehouse);
  // ... 还有更多

  const total = order.calculateTotal();

  expect(total).toBe(9899);
});

// ✅ 使用 Builder 模式简化
test('计算订单总价', () => {
  const order = OrderBuilder
    .create()
    .withItem('iPhone', 9999)
    .withDiscount(0.1)
    .build();

  expect(order.calculateTotal()).toBe(8999.1);
});
```

#### 断言轮盘 (Assertion Roulette)

```javascript
// ❌ 多个没有消息的断言，失败时不知道哪个
test('用户属性', () => {
  const user = createUser();
  expect(user.name).toBe('张三');
  expect(user.age).toBe(25);        // 如果这个失败
  expect(user.email).toBeDefined();  // 不知道是这行还是上一行
  expect(user.role).toBe('user');
});

// ✅ 分开测试或添加明确消息
test('新建用户默认角色为 user', () => {
  const user = createUser();
  expect(user.role).toBe('user');
});

test('新建用户应包含完整信息', () => {
  const user = createUser({ name: '张三', age: 25 });
  expect(user).toMatchObject({
    name: '张三',
    age: 25,
    email: expect.any(String),
  });
});
```

### 10.4 反模式速查表

| 反模式 | 症状 | 解药 |
|--------|------|------|
| **冰淇淋甜筒** | E2E > 集成 > 单元 | 重建测试金字塔 |
| **测试间耦合** | 单独运行通过，一起运行失败 | 每个测试完全独立 |
| **过度 Mock** | 测试全是 mock 设置代码 | 减少 mock，用 Fake 或真实依赖 |
| **复制粘贴测试** | 大量重复的测试代码 | 提取 Helper / Builder |
| **测试私有方法** | 测试直接调用私有方法 | 通过公开接口间接测试 |
| **全局状态** | 测试修改全局变量 | 依赖注入 |
| **Sleep 等待** | `sleep(3000)` | 使用 `waitFor` + 超时 |
| **忽略失败测试** | `test.skip` 到处都是 | 修复或删除 |
| **过度断言** | 一个测试 50 个 expect | 每个测试一个逻辑断言 |

---

## 第十一章：遗留代码的测试策略

### 11.1 Michael Feathers 的遗留代码定义

> *"对我来说，遗留代码就是没有测试的代码。"*
> —— Michael Feathers,《Working Effectively with Legacy Code》

这个定义的深刻之处在于：不管代码多新、多"干净"，只要没有测试保护，修改它就是危险的。

### 11.2 依赖打破技术

Feathers 的核心洞察：**要给遗留代码加测试，首先要打破依赖**。但打破依赖需要修改代码，修改代码又需要测试保护 —— 这是一个 **先有鸡还是先有蛋** 的困境。

解决方案：使用**安全的、几乎不可能出错的重构手法**来打破依赖。

#### 接缝 (Seam)

Feathers 的核心概念 —— **接缝**：不修改代码的前提下可以改变行为的地方。

```java
// 原始代码：直接依赖 EmailService，无法测试
public class OrderProcessor {
    public void process(Order order) {
        // ... 处理逻辑
        EmailService.send(order.getCustomerEmail(), "订单确认");  // 静态调用！
    }
}

// 技术 1: 提取并重写 (Extract and Override)
public class OrderProcessor {
    public void process(Order order) {
        // ... 处理逻辑
        sendConfirmation(order.getCustomerEmail());
    }

    // 这是一个 "接缝" —— 测试中可以 override
    protected void sendConfirmation(String email) {
        EmailService.send(email, "订单确认");
    }
}

// 测试：
public class TestableOrderProcessor extends OrderProcessor {
    public List<String> sentEmails = new ArrayList<>();

    @Override
    protected void sendConfirmation(String email) {
        sentEmails.add(email);  // 不发真实邮件
    }
}
```

#### 其他依赖打破技术

| 技术 | 适用场景 | 风险级别 |
|------|---------|---------|
| **参数化构造函数** | 硬编码 `new` 的依赖 | 极低 |
| **提取接口** | 替换整个协作者 | 低 |
| **引入实例委托** | 替换静态方法调用 | 低 |
| **封装全局引用** | 全局变量依赖 | 中 |
| **子类化并重写** | 快速创建测试接缝 | 低 |

### 11.3 特征化测试 (Characterization Test)

面对不理解的遗留代码，先写**特征化测试**记录当前行为：

```javascript
// 步骤 1: 写一个你知道会失败的断言
test('理解 calculatePrice 的行为', () => {
  const result = calculatePrice(100, 'VIP', true);
  expect(result).toBe(0);  // 故意写错
});
// 失败信息: Expected 0, received 85

// 步骤 2: 用真实输出替换断言
test('calculatePrice: VIP 用户 + 促销 → 85', () => {
  const result = calculatePrice(100, 'VIP', true);
  expect(result).toBe(85);  // 记录当前行为
});

// 步骤 3: 多组输入，逐步理解逻辑
test('calculatePrice: 普通用户 + 促销 → 90', () => {
  expect(calculatePrice(100, 'NORMAL', true)).toBe(90);
});

test('calculatePrice: VIP 用户 + 无促销 → 90', () => {
  expect(calculatePrice(100, 'VIP', false)).toBe(90);
});

// 现在你理解了: VIP 打 9 折，促销打 9.5 折，叠加 = 0.9 * 0.95 ≈ 0.855 → 85.5 → 85（取整）
```

### 11.4 安全网策略

给遗留系统加测试的渐进式策略：

```
第 1 阶段：铺设安全网
  └── 对关键路径写特征化测试
  └── 对新增功能写 TDD 测试
  └── 目标：不追求覆盖率，只保护修改区域

第 2 阶段：扩大覆盖
  └── 每次改 Bug，先写复现测试
  └── 每次加功能，测试覆盖相邻代码
  └── "童子军原则"：离开时比来时更干净

第 3 阶段：重构基础设施
  └── 引入依赖注入
  └── 提取接口
  └── 用 Fake 替代难以测试的依赖

第 4 阶段：深度重构
  └── 在测试保护下大胆重构
  └── 逐步替换旧设计
```

---

## 第十二章：前端测试

### 12.1 前端测试的特殊挑战

| 挑战 | 说明 |
|------|------|
| **DOM 依赖** | 组件与浏览器环境紧密耦合 |
| **异步交互** | 用户事件、API 调用、动画 |
| **视觉正确性** | 功能正确但"看起来不对" |
| **状态管理** | 全局状态导致测试间耦合 |
| **第三方依赖** | 浏览器 API、SDK、iframe |

### 12.2 React 组件测试 (React Testing Library)

Kent C. Dodds 的 React Testing Library 体现了一个核心理念：

> *"你的测试越像用户使用软件的方式，它们能给你的信心就越多。"*

```javascript
// ❌ 错误：测试实现细节
test('点击按钮后 state.count 应为 1', () => {
  const wrapper = shallow(<Counter />);
  wrapper.find('button').simulate('click');
  expect(wrapper.state('count')).toBe(1);  // 耦合到 state 结构
});

// ✅ 正确：测试用户可见的行为
test('点击按钮后屏幕上应显示 1', () => {
  render(<Counter />);

  fireEvent.click(screen.getByRole('button', { name: '增加' }));

  expect(screen.getByText('1')).toBeVisible();
});
```

#### 测试异步行为

```javascript
test('搜索后应显示结果列表', async () => {
  // Mock API
  server.use(
    http.get('/api/search', () => {
      return HttpResponse.json([
        { id: 1, name: '苹果' },
        { id: 2, name: '苹果醋' },
      ]);
    })
  );

  render(<SearchPage />);

  // 用户输入搜索词
  await userEvent.type(screen.getByRole('searchbox'), '苹果');

  // 等待结果出现
  await waitFor(() => {
    expect(screen.getByText('苹果')).toBeVisible();
    expect(screen.getByText('苹果醋')).toBeVisible();
  });

  // 验证结果数量
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
});
```

#### 测试表单

```javascript
test('提交表单时应验证必填字段', async () => {
  const onSubmit = jest.fn();
  render(<RegistrationForm onSubmit={onSubmit} />);

  // 不填写任何字段，直接提交
  await userEvent.click(screen.getByRole('button', { name: '注册' }));

  // 应显示验证错误
  expect(screen.getByText('请输入姓名')).toBeVisible();
  expect(screen.getByText('请输入邮箱')).toBeVisible();
  expect(onSubmit).not.toHaveBeenCalled();

  // 填写字段后重新提交
  await userEvent.type(screen.getByLabelText('姓名'), '张三');
  await userEvent.type(screen.getByLabelText('邮箱'), 'zhang@test.com');
  await userEvent.click(screen.getByRole('button', { name: '注册' }));

  expect(onSubmit).toHaveBeenCalledWith({
    name: '张三',
    email: 'zhang@test.com'
  });
});
```

### 12.3 React Native 测试

```javascript
import { render, fireEvent } from '@testing-library/react-native';

test('营养环卡片应显示卡路里进度', () => {
  render(
    <NutritionRingsCard
      calories={{ current: 1500, target: 2000 }}
      protein={{ current: 80, target: 120 }}
    />
  );

  expect(screen.getByText('1500')).toBeTruthy();
  expect(screen.getByText('/ 2000 kcal')).toBeTruthy();
});
```

### 12.4 视觉回归测试

功能测试无法捕获"看起来不对"的问题。视觉回归测试通过**截图对比**来检测 UI 变化：

```javascript
// Playwright 视觉回归
test('首页截图对比', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('homepage.png', {
    maxDiffPixelRatio: 0.01,  // 允许 1% 像素差异
  });
});

// Storybook + Chromatic（组件级视觉测试）
// 每个 Story 自动截图并与基线对比
export const Primary = () => <Button variant="primary">点击</Button>;
export const Disabled = () => <Button disabled>不可用</Button>;
```

### 12.5 快照测试 (Snapshot Testing)

```javascript
test('UserProfile 渲染快照', () => {
  const tree = renderer.create(
    <UserProfile name="张三" avatar="/avatar.png" />
  ).toJSON();

  expect(tree).toMatchSnapshot();
});
```

**快照测试的争议：**

| 支持者 | 反对者 |
|--------|--------|
| 快速检测意外变化 | 太容易无脑 `--update` |
| 零成本 regression 检测 | 不清楚什么是"正确"的 |
| 适合大型组件 | 产生巨大的快照文件 |

**建议：** 对稳定的、纯展示性的组件使用快照测试。对交互复杂的组件使用行为测试。

---

## 第十三章：后端与 API 测试

### 13.1 API 测试的层次

```
┌─────────────────────────────────────┐
│  Controller 测试（HTTP 层）          │  验证路由、状态码、请求验证
├─────────────────────────────────────┤
│  Service 测试（业务逻辑层）          │  验证业务规则、边界条件
├─────────────────────────────────────┤
│  Repository 测试（数据访问层）        │  验证 SQL 查询、数据映射
└─────────────────────────────────────┘
```

### 13.2 Spring Boot 测试示例 (Java)

```java
// Controller 层测试（不启动完整应用）
@WebMvcTest(UserController.class)
class UserControllerTest {
    @Autowired MockMvc mockMvc;
    @MockBean UserService userService;

    @Test
    void getUser_ExistingId_Returns200() throws Exception {
        when(userService.findById("123"))
            .thenReturn(new User("123", "张三", "zhang@test.com"));

        mockMvc.perform(get("/api/users/123"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("张三"))
            .andExpect(jsonPath("$.email").value("zhang@test.com"));
    }

    @Test
    void getUser_NonExistingId_Returns404() throws Exception {
        when(userService.findById("999"))
            .thenThrow(new UserNotFoundException("999"));

        mockMvc.perform(get("/api/users/999"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.error").value("用户不存在"));
    }

    @Test
    void createUser_InvalidEmail_Returns400() throws Exception {
        String body = """
            {"name": "张三", "email": "not-an-email"}
            """;

        mockMvc.perform(post("/api/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errors[0].field").value("email"));
    }
}

// Service 层测试
class UserServiceTest {
    private UserService service;
    private UserRepository repo;

    @BeforeEach
    void setup() {
        repo = new InMemoryUserRepository();
        service = new UserService(repo);
    }

    @Test
    void register_DuplicateEmail_ThrowsConflict() {
        service.register("张三", "zhang@test.com");

        assertThatThrownBy(() ->
            service.register("李四", "zhang@test.com")
        ).isInstanceOf(DuplicateEmailException.class);
    }
}

// Repository 层测试（使用真实数据库）
@DataJpaTest
@Testcontainers
class UserRepositoryTest {
    @Container
    static PostgreSQLContainer<?> pg = new PostgreSQLContainer<>("postgres:16");

    @Autowired UserRepository repo;

    @Test
    void findByEmail_ShouldBeCaseInsensitive() {
        repo.save(new User("张三", "Zhang@Test.COM"));

        Optional<User> found = repo.findByEmail("zhang@test.com");

        assertThat(found).isPresent();
        assertThat(found.get().getName()).isEqualTo("张三");
    }
}
```

### 13.3 Node.js API 测试示例 (Express/Fastify)

```javascript
import request from 'supertest';
import { createApp } from '../app';

describe('POST /api/meals', () => {
  let app;
  let db;

  beforeAll(async () => {
    db = await createTestDatabase();
    app = createApp({ db });
  });

  afterEach(async () => {
    await db.query('TRUNCATE meals CASCADE');
  });

  test('记录一餐应返回 201 和营养数据', async () => {
    const response = await request(app)
      .post('/api/meals')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        name: '番茄炒蛋',
        calories: 250,
        protein: 15,
        carbs: 10,
        fat: 18,
      })
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      name: '番茄炒蛋',
      calories: 250,
    });

    // 验证数据库中确实存储了
    const meals = await db.query('SELECT * FROM meals');
    expect(meals.rows).toHaveLength(1);
  });

  test('未认证请求应返回 401', async () => {
    await request(app)
      .post('/api/meals')
      .send({ name: '测试' })
      .expect(401);
  });

  test('缺少必填字段应返回 400', async () => {
    const response = await request(app)
      .post('/api/meals')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ name: '测试' })  // 缺少 calories
      .expect(400);

    expect(response.body.errors).toContainEqual(
      expect.objectContaining({ field: 'calories' })
    );
  });
});
```

### 13.4 数据库测试策略

| 策略 | 优点 | 缺点 | 适用场景 |
|------|------|------|---------|
| **事务回滚** | 超快（不写入磁盘） | 无法测试事务行为本身 | 大量 CRUD 测试 |
| **TRUNCATE** | 简单可靠 | 比事务慢 | 中小数据量 |
| **独立数据库** | 完全隔离 | 资源消耗大 | 并行测试 |
| **Testcontainers** | 环境一致 | 首次启动慢 | CI/CD |

### 13.5 测试 AI/LLM 集成

对于 AuraFitness 这样依赖 AI 的应用，测试 AI 集成需要特殊策略：

```javascript
// 策略 1: 快照测试（固定输入 → 记录输出）
test('Gemini Vision 餐食识别 - 快照', async () => {
  const mockResponse = loadFixture('gemini-rice-response.json');
  geminiClient.analyze = jest.fn().mockResolvedValue(mockResponse);

  const result = await mealAnalyzer.analyze(testImage);

  expect(result.foods).toContainEqual(
    expect.objectContaining({ name: '米饭', confidence: expect.any(Number) })
  );
});

// 策略 2: 契约测试（验证响应结构）
test('AI 响应应符合预期结构', async () => {
  const result = await mealAnalyzer.analyze(testImage);

  // 不验证具体内容（AI 输出不确定），验证结构
  expect(result).toMatchObject({
    foods: expect.arrayContaining([
      expect.objectContaining({
        name: expect.any(String),
        calories: expect.any(Number),
        protein: expect.any(Number),
        carbs: expect.any(Number),
        fat: expect.any(Number),
        confidence: expect.any(Number),
      })
    ]),
    totalCalories: expect.any(Number),
  });

  // 验证合理性范围
  result.foods.forEach(food => {
    expect(food.calories).toBeGreaterThan(0);
    expect(food.calories).toBeLessThan(5000);
    expect(food.confidence).toBeGreaterThanOrEqual(0);
    expect(food.confidence).toBeLessThanOrEqual(1);
  });
});

// 策略 3: 黄金测试集（手工标注的测试数据）
const goldenTests = [
  { image: 'rice.jpg', expectedFoods: ['米饭'], minCalories: 200, maxCalories: 400 },
  { image: 'salad.jpg', expectedFoods: ['沙拉'], minCalories: 50, maxCalories: 200 },
];

goldenTests.forEach(({ image, expectedFoods, minCalories, maxCalories }) => {
  test(`识别 ${image}`, async () => {
    const result = await mealAnalyzer.analyze(loadImage(image));

    expectedFoods.forEach(food => {
      expect(result.foods.map(f => f.name)).toContain(food);
    });
    expect(result.totalCalories).toBeGreaterThanOrEqual(minCalories);
    expect(result.totalCalories).toBeLessThanOrEqual(maxCalories);
  });
});
```

---

## 第十四章：CI/CD 中的测试

### 14.1 测试流水线设计

```yaml
# .github/workflows/test.yml
name: Test Pipeline

on: [push, pull_request]

jobs:
  # 阶段 1: 静态分析（最快，先运行）
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run lint          # ESLint
      - run: npm run typecheck     # TypeScript

  # 阶段 2: 单元测试（快，并行运行）
  unit-test:
    runs-on: ubuntu-latest
    needs: lint
    strategy:
      matrix:
        shard: [1, 2, 3, 4]  # 4 个分片并行
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test -- --shard=${{ matrix.shard }}/4

  # 阶段 3: 集成测试（中等速度）
  integration-test:
    runs-on: ubuntu-latest
    needs: lint
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: test
          POSTGRES_PASSWORD: test
        ports: ['5432:5432']
      redis:
        image: redis:7
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test
          REDIS_URL: redis://localhost:6379

  # 阶段 4: E2E 测试（最慢，最后运行）
  e2e-test:
    runs-on: ubuntu-latest
    needs: [unit-test, integration-test]
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx playwright install
      - run: npm run build
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: e2e-traces
          path: test-results/
```

### 14.2 测试分片与并行化

```
顺序执行:  [────── 单元测试 (120s) ──────][── 集成 (60s) ──][── E2E (180s) ──]
                                                                    总计: 360s

并行执行:  [── 单元 1 (30s) ──]
           [── 单元 2 (30s) ──]
           [── 单元 3 (30s) ──]  [── E2E 1 (90s) ──]
           [── 单元 4 (30s) ──]  [── E2E 2 (90s) ──]
           [── 集成 (60s) ───]
                                          总计: ~150s (加速 2.4x)
```

### 14.3 测试环境管理

| 环境 | 用途 | 数据 | 生命周期 |
|------|------|------|---------|
| **本地开发** | 开发时快速反馈 | Testcontainers / Docker Compose | 手动启停 |
| **CI** | PR 合并门禁 | 临时容器，测试后销毁 | 每次 CI 创建/销毁 |
| **Staging** | E2E 和手动测试 | 生产数据子集（脱敏） | 持久运行 |
| **Production** | 金丝雀测试 | 真实数据 | 生产环境 |

### 14.4 测试报告与可观测性

```javascript
// Jest 配置多格式报告
module.exports = {
  reporters: [
    'default',                                   // 控制台输出
    ['jest-junit', { outputDirectory: 'reports' }],  // JUnit XML（CI 集成）
    ['jest-html-reporters', { publicPath: 'reports' }],  // HTML 报告
  ],
  coverageReporters: ['text', 'lcov', 'cobertura'],  // 覆盖率格式
};
```

### 14.5 合并门禁 (Merge Gates)

```yaml
# 分支保护规则
branch_protection:
  required_checks:
    - lint
    - unit-test
    - integration-test
    - e2e-test
  required_coverage:
    lines: 70          # 全局行覆盖率 > 70%
    new_code: 80       # 新增代码覆盖率 > 80%
  required_reviews: 1
```

**原则：**
- **单元测试失败 → 立即阻塞 PR**（快速反馈）
- **E2E 测试失败 → 阻塞 PR，但允许手动跳过**（可能是 Flaky）
- **覆盖率下降 → 警告但不阻塞**（避免"为了覆盖率写无意义的测试"）

---

## 第十五章：高级测试技术

### 15.1 属性基测试 (Property-Based Testing)

传统测试：你选择特定输入，验证特定输出。
属性基测试：你定义性质(Property)，框架自动生成大量随机输入来验证。

```javascript
import fc from 'fast-check';

// 传统测试：手动选择几个输入
test('排序后数组长度不变', () => {
  expect(sort([3, 1, 2])).toHaveLength(3);
  expect(sort([1])).toHaveLength(1);
  expect(sort([])).toHaveLength(0);
});

// 属性基测试：框架自动生成数百个随机数组
test('排序后数组长度不变（属性基）', () => {
  fc.assert(
    fc.property(
      fc.array(fc.integer()),  // 生成随机整数数组
      (arr) => {
        const sorted = sort(arr);
        return sorted.length === arr.length;  // 性质：长度不变
      }
    )
  );
});

// 更多排序的性质
test('排序后元素有序', () => {
  fc.assert(
    fc.property(fc.array(fc.integer()), (arr) => {
      const sorted = sort(arr);
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] < sorted[i - 1]) return false;
      }
      return true;
    })
  );
});

test('排序后包含所有原始元素', () => {
  fc.assert(
    fc.property(fc.array(fc.integer()), (arr) => {
      const sorted = sort(arr);
      return arr.every(x => sorted.includes(x));
    })
  );
});
```

**属性基测试特别擅长发现的 Bug：**
- 边界条件（空数组、单元素、超大数字）
- 整数溢出
- Unicode 字符处理问题
- 并发竞争条件

### 15.2 快照测试的高级用法

```javascript
// 内联快照：快照内容直接在测试文件中
test('API 错误响应格式', () => {
  const error = formatApiError(404, '用户不存在');

  expect(error).toMatchInlineSnapshot(`
    {
      "code": 404,
      "message": "用户不存在",
      "timestamp": "[any ISO string]",
    }
  `);
});

// 序列化器：自定义快照格式
expect.addSnapshotSerializer({
  test: (val) => val instanceof User,
  serialize: (val) => `User(${val.name}, ${val.email})`,
});
```

### 15.3 混沌工程 (Chaos Engineering)

Netflix 的 Chaos Monkey 开创了混沌工程 —— **主动注入故障来验证系统韧性**：

```javascript
// 在测试中模拟各种故障
describe('系统韧性测试', () => {
  test('数据库超时时应返回缓存数据', async () => {
    // 注入故障：数据库查询超时
    db.injectFault('timeout', { duration: 5000 });

    const response = await request(app).get('/api/dashboard');

    expect(response.status).toBe(200);
    expect(response.headers['x-data-source']).toBe('cache');
  });

  test('下游服务 500 时应优雅降级', async () => {
    // 注入故障：营养 API 返回 500
    nutritionApi.injectFault('error', { status: 500 });

    const response = await request(app).get('/api/meals/123');

    expect(response.status).toBe(200);
    expect(response.body.nutrition).toBeNull();  // 降级：不显示营养数据
    expect(response.body.name).toBe('番茄炒蛋');  // 基本信息仍然返回
  });

  test('内存压力下不应 OOM', async () => {
    // 注入故障：限制内存
    process.memoryLimit = 256 * 1024 * 1024;  // 256MB

    // 发送大量并发请求
    const requests = Array(100).fill().map(() =>
      request(app).get('/api/dashboard')
    );

    const responses = await Promise.all(requests);

    // 允许部分请求被拒绝（429），但不应崩溃
    responses.forEach(r => {
      expect([200, 429, 503]).toContain(r.status);
    });
  });
});
```

### 15.4 性能测试基础

```javascript
// 基准测试 (Benchmark)
test('排序 10000 个元素应在 50ms 内完成', () => {
  const data = Array.from({ length: 10000 }, () => Math.random());

  const start = performance.now();
  sort(data);
  const duration = performance.now() - start;

  expect(duration).toBeLessThan(50);
});

// 负载测试 (k6)
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },   // 预热：30秒内增加到 20 用户
    { duration: '1m', target: 100 },    // 压力：1分钟内增加到 100 用户
    { duration: '30s', target: 0 },     // 冷却：30秒内降到 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],   // 95% 请求 < 500ms
    http_req_failed: ['rate<0.01'],     // 失败率 < 1%
  },
};

export default function () {
  const res = http.get('https://api.example.com/meals');
  check(res, {
    '状态码 200': (r) => r.status === 200,
    '响应时间 < 200ms': (r) => r.timings.duration < 200,
  });
  sleep(1);
}
```

### 15.5 安全测试

```javascript
// SQL 注入测试
test('搜索接口应防御 SQL 注入', async () => {
  const maliciousInputs = [
    "'; DROP TABLE users; --",
    "1' OR '1'='1",
    "1; UPDATE users SET role='admin'",
  ];

  for (const input of maliciousInputs) {
    const response = await request(app)
      .get(`/api/search?q=${encodeURIComponent(input)}`)
      .set('Authorization', `Bearer ${token}`);

    // 不应报 500（说明 SQL 被执行了）
    expect(response.status).not.toBe(500);

    // 用户表应该还在
    const users = await db.query('SELECT count(*) FROM users');
    expect(parseInt(users.rows[0].count)).toBeGreaterThan(0);
  }
});

// XSS 测试
test('用户输入应被转义', async () => {
  await request(app).post('/api/meals').send({
    name: '<script>alert("xss")</script>',
  });

  const response = await request(app).get('/api/meals');
  const body = JSON.stringify(response.body);

  expect(body).not.toContain('<script>');
});
```

---

## 第十六章：测试文化与团队实践

### 16.1 建立测试文化

技术层面的测试知识只是基础。真正困难的是在团队中建立**测试文化**。

**Google 的测试文化经验：**

1. **测试认证项目 (Testing Certification)** —— 给团队设定测试成熟度等级
2. **测试厕所 (Testing on the Toilet)** —— 在厕所张贴测试技巧海报（真实存在！）
3. **测试英雄 (Test Champion)** —— 每个团队指定一个测试文化推广者
4. **代码审查中强制关注测试** —— 没有测试的 PR 不允许合并

### 16.2 测试成熟度模型

| 等级 | 名称 | 特征 |
|------|------|------|
| **L0** | 无测试 | 全靠手动验证 |
| **L1** | 被动测试 | Bug 修复后补测试 |
| **L2** | 主动测试 | 新功能有单元测试 |
| **L3** | 系统化测试 | 金字塔完善，CI 门禁 |
| **L4** | 测试驱动 | TDD 为默认实践 |
| **L5** | 持续质量 | 变异测试 + 混沌工程 + 自动化一切 |

**大多数团队处于 L1-L2。目标是达到 L3。**

### 16.3 Code Review 中的测试清单

Review 他人代码时，关注以下测试方面：

```markdown
## 测试 Review 清单

### 存在性
- [ ] 新增逻辑是否有对应的测试？
- [ ] Bug 修复是否有复现测试？
- [ ] 边界条件是否被覆盖？

### 质量
- [ ] 测试名称是否清晰描述了行为？
- [ ] 测试是否验证行为而非实现？
- [ ] 是否有不必要的 mock？
- [ ] 测试是否独立（不依赖执行顺序）？

### 可维护性
- [ ] 测试数据是否清晰（无 Mystery Guest）？
- [ ] 是否有合理的 Helper/Builder？
- [ ] 删除测试会丢失什么保护？
```

### 16.4 测试债务管理

| 债务类型 | 症状 | 偿还策略 |
|----------|------|---------|
| **覆盖率债务** | 大片代码没有测试 | 每个 Sprint 分配 10% 时间补测试 |
| **Flaky 债务** | CI 经常因为不稳定测试失败 | 专人负责 Flaky 测试看板 |
| **速度债务** | 测试套件运行太慢 | 分析慢测试，优化或降级 |
| **设计债务** | 代码不可测试 | 在功能开发中渐进式重构 |

### 16.5 度量与看板

```
团队测试健康看板

┌──────────────────────────────────────┐
│  测试数量  单元: 1,247 │ 集成: 89 │ E2E: 23     │
├──────────────────────────────────────┤
│  覆盖率    行: 78% │ 分支: 65% │ 变异: 62%     │
├──────────────────────────────────────┤
│  速度      单元: 45s │ 集成: 3m │ E2E: 12m      │
├──────────────────────────────────────┤
│  稳定性    Flaky 测试: 3 │ 最近修复: 2025-03-28  │
├──────────────────────────────────────┤
│  趋势      本月新增测试: +47 │ 删除: -5          │
└──────────────────────────────────────┘
```

---

---



## 第十七章：测试数据管理

> **本章导读**
> 测试数据是自动化测试中最容易被忽视、却最影响测试质量的因素之一。混乱的测试数据导致脆弱的测试、缓慢的执行、难以调试的失败。本章系统介绍测试数据的构建模式、管理策略和安全合规实践。

---

### 17.1 测试数据的挑战

| 挑战 | 症状 | 影响 | 解决方案 |
|------|------|------|---------|
| **数据膨胀** | 测试数据文件越来越大 | 测试变慢，Git 仓库臃肿 | Builder 模式 + 内联数据 |
| **环境隔离** | 开发/测试/staging 数据互相污染 | 测试结果不可靠 | Testcontainers + 事务回滚 |
| **敏感数据** | 生产数据包含 PII 被用于测试 | 合规风险 (GDPR) | 数据脱敏 + Faker 生成 |
| **数据一致性** | Schema 变更导致 Fixture 失效 | 测试大面积失败 | Fixture 版本化 + 迁移同步 |
| **共享冲突** | 多开发者同时修改测试数据库 | 互相覆盖数据 | 独立容器 / 事务隔离 |
| **真实性不足** | 测试数据过于简单 | 遗漏边界条件 | 属性基测试 + 真实数据采样 |

### 17.2 Test Data Builder 模式

Builder 模式是单元测试中构建测试数据的首选方案。它解决了两个核心问题：**伸缩构造函数** (Telescoping Constructor) 和**无关细节噪音**。

#### 问题：没有 Builder 时的痛苦

```typescript
// ❌ 不用 Builder：每个测试都要填写所有字段，即使大部分字段与测试无关
test('VIP 用户应享受免运费', () => {
  const user = {
    id: 'u-1',                    // 无关
    name: '张三',                  // 无关
    email: 'zhang@test.com',       // 无关
    phone: '13800138000',          // 无关
    avatar: '/avatar.png',         // 无关
    address: {                     // 无关
      street: '中关村大街1号',
      city: '北京',
      zipCode: '100080',
    },
    memberLevel: 'vip',            // ← 只有这个字段与测试相关！
    registeredAt: new Date(),      // 无关
    isActive: true,                // 无关
    points: 5000,                  // 无关
  };

  expect(calculateShipping(user, cart)).toBe(0);
});
```

#### 解决方案：TypeScript Builder

```typescript
// ✅ 使用 Builder：只设置与测试相关的字段
interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  address: Address;
  memberLevel: 'free' | 'pro' | 'vip';
  registeredAt: Date;
  isActive: boolean;
  points: number;
}

interface Address {
  street: string;
  city: string;
  zipCode: string;
}

class UserBuilder {
  private props: User = {
    id: 'user-default',
    name: '默认用户',
    email: 'default@test.com',
    phone: '13800000000',
    avatar: '/default-avatar.png',
    address: { street: '测试路1号', city: '测试市', zipCode: '000000' },
    memberLevel: 'free',
    registeredAt: new Date('2025-01-01'),
    isActive: true,
    points: 0,
  };

  static create(): UserBuilder {
    return new UserBuilder();
  }

  withId(id: string): this { this.props.id = id; return this; }
  withName(name: string): this { this.props.name = name; return this; }
  withEmail(email: string): this { this.props.email = email; return this; }
  withPhone(phone: string): this { this.props.phone = phone; return this; }
  withMemberLevel(level: User['memberLevel']): this { this.props.memberLevel = level; return this; }
  withPoints(points: number): this { this.props.points = points; return this; }
  withAddress(address: Partial<Address>): this {
    this.props.address = { ...this.props.address, ...address };
    return this;
  }
  asInactive(): this { this.props.isActive = false; return this; }

  // 语义化便捷方法
  asVip(): this { return this.withMemberLevel('vip').withPoints(10000); }
  asPro(): this { return this.withMemberLevel('pro').withPoints(3000); }
  asNewUser(): this {
    this.props.registeredAt = new Date();
    this.props.points = 0;
    return this;
  }

  build(): User {
    return { ...this.props, address: { ...this.props.address } };
  }
}

// ✅ 使用 Builder 的测试：清晰表达意图
test('VIP 用户应享受免运费', () => {
  const user = UserBuilder.create().asVip().build();
  expect(calculateShipping(user, cart)).toBe(0);
});

test('普通用户运费 10 元', () => {
  const user = UserBuilder.create().build(); // 使用默认值 = free 用户
  expect(calculateShipping(user, cart)).toBe(10);
});

test('积分超过 5000 的 Pro 用户可兑换优惠券', () => {
  const user = UserBuilder.create().asPro().withPoints(6000).build();
  expect(canRedeemCoupon(user)).toBe(true);
});
```

#### Java Builder 实现

```java
public class UserBuilder {
    private String id = "user-default";
    private String name = "默认用户";
    private String email = "default@test.com";
    private String memberLevel = "free";
    private int points = 0;
    private boolean isActive = true;
    private LocalDateTime registeredAt = LocalDateTime.of(2025, 1, 1, 0, 0);

    public static UserBuilder aUser() { return new UserBuilder(); }

    public UserBuilder withId(String id) { this.id = id; return this; }
    public UserBuilder withName(String name) { this.name = name; return this; }
    public UserBuilder withEmail(String email) { this.email = email; return this; }
    public UserBuilder withMemberLevel(String level) { this.memberLevel = level; return this; }
    public UserBuilder withPoints(int points) { this.points = points; return this; }

    // 语义化方法
    public UserBuilder asVip() { this.memberLevel = "vip"; this.points = 10000; return this; }
    public UserBuilder asPro() { this.memberLevel = "pro"; this.points = 3000; return this; }
    public UserBuilder asInactive() { this.isActive = false; return this; }

    public User build() {
        return new User(id, name, email, memberLevel, points, isActive, registeredAt);
    }
}

// 使用
User vip = aUser().asVip().withName("张三").build();
```

#### 嵌套 Builder

```typescript
class OrderBuilder {
  private props = {
    id: 'order-default',
    user: UserBuilder.create().build(),       // 嵌套 UserBuilder
    items: [OrderItemBuilder.create().build()], // 嵌套 OrderItemBuilder
    status: 'pending' as const,
    createdAt: new Date('2025-06-01'),
    totalAmount: 0,
  };

  static create(): OrderBuilder { return new OrderBuilder(); }

  forUser(builder: UserBuilder): this {
    this.props.user = builder.build();
    return this;
  }

  withItems(...builders: OrderItemBuilder[]): this {
    this.props.items = builders.map(b => b.build());
    this.props.totalAmount = this.props.items.reduce((sum, i) => sum + i.subtotal, 0);
    return this;
  }

  asCompleted(): this { this.props.status = 'completed'; return this; }
  asCancelled(): this { this.props.status = 'cancelled'; return this; }

  build() { return { ...this.props }; }
}

// 使用：嵌套 Builder 构建复杂对象图
test('VIP 用户的已完成订单应计入年度消费统计', () => {
  const order = OrderBuilder.create()
    .forUser(UserBuilder.create().asVip())
    .withItems(
      OrderItemBuilder.create().withProduct('iPhone', 9999),
      OrderItemBuilder.create().withProduct('AirPods', 1999),
    )
    .asCompleted()
    .build();

  expect(annualSpending(order)).toBe(11998);
});
```

### 17.3 Object Mother 模式

Object Mother 是一个包含静态工厂方法的类，返回预配置的测试对象。

```typescript
class UserMother {
  static vipUser(): User {
    return UserBuilder.create()
      .withId('vip-user-1')
      .withName('VIP张三')
      .asVip()
      .build();
  }

  static inactiveUser(): User {
    return UserBuilder.create()
      .withName('已停用用户')
      .asInactive()
      .build();
  }

  static newRegisteredUser(): User {
    return UserBuilder.create()
      .withName('新用户')
      .asNewUser()
      .build();
  }

  static adminUser(): User {
    return UserBuilder.create()
      .withName('管理员')
      .withEmail('admin@company.com')
      .asVip()
      .withPoints(999999)
      .build();
  }
}

// 使用
test('停用用户无法下单', () => {
  const user = UserMother.inactiveUser();
  expect(() => createOrder(user, cart)).toThrow('用户已停用');
});
```

#### Builder vs Object Mother 对比

| 维度 | Builder | Object Mother |
|------|---------|--------------|
| **灵活性** | 高 — 可任意组合字段 | 低 — 固定的预设组合 |
| **代码量** | 多 — 需要每个字段的方法 | 少 — 只有几个工厂方法 |
| **可读性** | 好 — 链式调用清晰 | 更好 — 一个方法名说明一切 |
| **适合场景** | 需要精细控制 | 常用场景复用 |
| **最佳实践** | Object Mother 内部使用 Builder | 两者组合使用 |

### 17.4 Factory 模式 (Fishery)

Fishery 是 TypeScript 生态中最流行的测试数据工厂库，灵感来自 Ruby 的 FactoryBot。

```typescript
import { Factory } from 'fishery';
import { faker } from '@faker-js/faker/locale/zh_CN';

// 定义工厂
const userFactory = Factory.define<User>(({ sequence, params }) => ({
  id: `user-${sequence}`,                          // 自动递增序列
  name: params.name ?? faker.person.fullName(),     // 支持覆盖
  email: `user-${sequence}@test.com`,               // 序列保证唯一
  phone: faker.phone.number('1##########'),
  avatar: faker.image.avatar(),
  address: {
    street: faker.location.streetAddress(),
    city: faker.location.city(),
    zipCode: faker.location.zipCode(),
  },
  memberLevel: 'free',
  registeredAt: faker.date.past({ years: 2 }),
  isActive: true,
  points: faker.number.int({ min: 0, max: 10000 }),
}));

// Trait（特征）
const vipUserFactory = userFactory.params({
  memberLevel: 'vip',
  points: 50000,
});

const inactiveUserFactory = userFactory.params({
  isActive: false,
});

// Association（关联）
const orderFactory = Factory.define<Order>(({ sequence, associations }) => ({
  id: `order-${sequence}`,
  user: associations.user ?? userFactory.build(),   // 自动创建关联用户
  items: associations.items ?? [orderItemFactory.build()],
  status: 'pending',
  totalAmount: 0,
  createdAt: faker.date.recent({ days: 30 }),
}));

// 使用
const user = userFactory.build();                    // 普通用户
const vip = vipUserFactory.build();                   // VIP 用户
const order = orderFactory.build({ user: vip });      // VIP 的订单
const users = userFactory.buildList(10);              // 批量生成 10 个
```

### 17.5 Fixture 管理策略

```
┌─────────────────────────────────────────────────────────────────┐
│                    Fixture 生命周期图                             │
│                                                                 │
│  Suite 开始                                                     │
│    │                                                            │
│    ├── beforeAll: 启动 DB 容器、运行迁移、加载种子数据             │
│    │                                                            │
│    ├── Test File 1                                              │
│    │   ├── beforeEach: 开启事务                                  │
│    │   ├── test('用例A'): 运行 → 断言                            │
│    │   ├── afterEach: 回滚事务 ← 数据恢复原状                    │
│    │   ├── beforeEach: 开启事务                                  │
│    │   ├── test('用例B'): 运行 → 断言                            │
│    │   └── afterEach: 回滚事务                                   │
│    │                                                            │
│    ├── Test File 2                                              │
│    │   └── (同上)                                               │
│    │                                                            │
│    └── afterAll: 停止 DB 容器                                    │
│                                                                 │
│  策略        速度    隔离性   真实性   维护成本                     │
│  ──────────────────────────────────────────                      │
│  事务回滚    ★★★★★  ★★★★    ★★★★    ★★★★                       │
│  TRUNCATE   ★★★★   ★★★★★  ★★★★    ★★★                         │
│  容器重建    ★★     ★★★★★  ★★★★★  ★★                           │
│  内存数据库   ★★★★★  ★★★★   ★★      ★★★★★                      │
└─────────────────────────────────────────────────────────────────┘
```

#### pytest Fixture Scope 示例

```python
import pytest
from testcontainers.postgres import PostgresContainer

# session 级别：整个测试会话只创建一次 DB 容器
@pytest.fixture(scope="session")
def postgres_container():
    with PostgresContainer("postgres:16") as pg:
        yield pg

# session 级别：数据库连接池
@pytest.fixture(scope="session")
def db_pool(postgres_container):
    pool = create_pool(postgres_container.get_connection_url())
    run_migrations(pool)
    yield pool
    pool.close()

# function 级别：每个测试一个事务（自动回滚）
@pytest.fixture(autouse=True)
def db_transaction(db_pool):
    conn = db_pool.getconn()
    conn.autocommit = False
    yield conn
    conn.rollback()     # ← 测试结束自动回滚
    db_pool.putconn(conn)
```

### 17.6 数据库测试数据策略对比

| 策略 | 速度 | 隔离性 | 真实性 | 维护成本 | 最佳场景 |
|------|------|--------|--------|---------|---------|
| **Seed SQL 文件** | ★★★ | ★★ | ★★★★ | ★★ | 小型项目初始数据 |
| **Migration-based** | ★★★ | ★★★ | ★★★★ | ★★★★ | Schema 与数据同步演化 |
| **Snapshot 恢复** | ★★ | ★★★★ | ★★★★★ | ★★ | 大量复杂关联数据 |
| **事务回滚** | ★★★★★ | ★★★★ | ★★★★ | ★★★★ | 中大型项目默认策略 |
| **Testcontainers** | ★★ | ★★★★★ | ★★★★★ | ★★★ | CI/CD 环境 |
| **内存数据库** | ★★★★★ | ★★★★ | ★★ | ★★★★★ | 快速原型/简单查询 |

```
决策流程图：

你的测试需要真实数据库行为吗？
├── 否 → 内存数据库 (H2/SQLite) 或 InMemoryRepository
└── 是 → 你在 CI 环境中吗？
         ├── 是 → Testcontainers + 事务回滚
         └── 否 → 本地 Docker Compose + 事务回滚
```

### 17.7 敏感数据脱敏

#### PII 类型与脱敏策略

| PII 类型 | 风险等级 | 脱敏策略 | 示例 |
|---------|---------|---------|------|
| 姓名 | 中 | Faker 替换 | 张三 → 李四（随机） |
| 邮箱 | 高 | 部分掩码 | zhang@gmail.com → z\*\*\*g@g\*\*\*l.com |
| 手机号 | 高 | 中间掩码 | 13812345678 → 138\*\*\*\*5678 |
| 身份证 | 极高 | 中间掩码 | 310101199001011234 → 310101\*\*\*\*\*\*\*\*1234 |
| 地址 | 中 | 泛化 | 浦东新区张江路200号 → 浦东新区（详细地址已脱敏） |
| 银行卡 | 极高 | 首尾保留 | 6222021234567890 → 6222\*\*\*\*\*\*\*\*7890 |
| IP 地址 | 低 | 末位置零 | 192.168.1.100 → 192.168.1.0 |
| 出生日期 | 中 | 泛化 | 1990-03-15 → 1990 年（只保留年份） |

#### 脱敏器实现

```typescript
class DataSanitizer {
  /** 邮箱脱敏：保留首尾字符，中间用 * 替代 */
  static maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return '***@***.com';
    const maskedLocal = local[0] + '*'.repeat(Math.max(local.length - 2, 3)) + local[local.length - 1];
    const [domainName, tld] = domain.split('.');
    const maskedDomain = domainName[0] + '*'.repeat(Math.max(domainName.length - 2, 2)) + domainName[domainName.length - 1];
    return `${maskedLocal}@${maskedDomain}.${tld}`;
  }

  /** 手机号脱敏：保留前3后4 */
  static maskPhone(phone: string): string {
    if (phone.length < 7) return '****';
    return phone.slice(0, 3) + '****' + phone.slice(-4);
  }

  /** 身份证脱敏：保留前6后4 */
  static maskIdCard(id: string): string {
    if (id.length < 10) return '****';
    return id.slice(0, 6) + '*'.repeat(id.length - 10) + id.slice(-4);
  }

  /** 地址泛化：只保留到区级 */
  static generalizeAddress(address: string): string {
    // 简化逻辑：保留到"区"或"县"
    const match = address.match(/^(.+?[区县市])/);
    return match ? match[1] + '（详细地址已脱敏）' : '（地址已脱敏）';
  }
}

// 使用
console.log(DataSanitizer.maskEmail('zhangsan@gmail.com'));   // z*****n@g***l.com
console.log(DataSanitizer.maskPhone('13812345678'));           // 138****5678
console.log(DataSanitizer.maskIdCard('310101199001011234'));   // 310101********1234
```

### 17.8 大规模测试数据生成

#### Faker.js 中文数据生成

```typescript
import { faker } from '@faker-js/faker/locale/zh_CN';

// 固定种子 → 可复现
faker.seed(42);

// 人名
faker.person.fullName();         // '王芳'
faker.person.lastName();         // '王'

// 手机号
faker.phone.number('1##########'); // '13845678901'

// 地址
faker.location.city();            // '深圳市'
faker.location.streetAddress();   // '北京路123号'

// 日期
faker.date.past({ years: 2 });    // 过去2年内随机日期
faker.date.birthdate({ min: 18, max: 65, mode: 'age' });
```

#### 三种插入策略性能对比

| 策略 | 10,000 条耗时 | 每条耗时 | 适用场景 |
|------|-------------|---------|---------|
| 逐条 INSERT | ~45s | 4.5ms | 测试代码中少量数据 |
| 批量 INSERT (500/批) | ~3s | 0.3ms | 中等数据量 |
| COPY 协议 | ~0.8s | 0.08ms | 大规模数据 (10K+) |

#### 流式生成器（不占内存）

```typescript
function* generateUsers(count: number): Generator<User> {
  faker.seed(42);
  for (let i = 1; i <= count; i++) {
    yield {
      id: `user-${i}`,
      name: faker.person.fullName(),
      email: `user-${i}@test.com`,
      phone: faker.phone.number('1##########'),
      memberLevel: faker.helpers.weightedArrayElement([
        { value: 'free', weight: 70 },
        { value: 'pro', weight: 20 },
        { value: 'vip', weight: 10 },
      ]),
      isActive: true,
      points: faker.number.int({ min: 0, max: 100000 }),
      createdAt: faker.date.past({ years: 2 }),
    };
    if (i % 10000 === 0) console.log(`  生成进度: ${i}/${count}`);
  }
}

// 流式消费 — 内存始终稳定
for (const user of generateUsers(1_000_000)) {
  await batchInsert(user);  // 攒满 500 条批量插入
}
```

### 17.9 测试数据的版本控制

**原则：** Fixture 文件必须与数据库 Schema 版本同步。

```
fixtures/
├── v1/
│   ├── users.json          # Schema v1 的测试数据
│   └── orders.json
├── v2/                      # Schema v2 新增了 preferences 字段
│   ├── users.json          # 更新后的测试数据
│   └── orders.json
└── migrations/
    └── v1_to_v2.js         # Fixture 迁移脚本
```

### 17.10 实战练习

1. **Builder 练习：** 为博客系统实现 `PostBuilder`（含嵌套 `AuthorBuilder` 和 `CommentBuilder`），编写 5 个使用 Builder 的测试
2. **Factory 练习：** 用 Fishery 实现电商系统工厂集合（User/Product/Cart/CartItem），包含 Trait 和 Association
3. **脱敏练习：** 构建 `SanitizationPipeline`，支持 5 种脱敏策略，处理 1000 条模拟用户记录
4. **数据库 Fixture 练习：** 用 Testcontainers + 事务回滚实现完整的 Fixture 生命周期管理
5. **大规模生成练习：** 构建流式生成器，生成 10 万用户 + 25 万订单，内存不超过 100MB


---

## 第十八章：不同架构的测试策略

> **本章导读**
> 软件架构决定了测试策略的形态。一个单体应用的测试方法与微服务系统截然不同，而事件驱动架构又带来了全新的挑战。本章将深入探讨三种主流架构下的测试策略，帮助读者根据实际项目的架构特征，选择最合适的测试方法。

---

### 18.1 单体应用测试策略

#### 18.1.1 单体架构概述

单体应用（Monolithic Application）是最经典的软件架构形式。所有功能模块——从用户界面到数据访问——都部署在同一个进程中，共享同一个数据库。尽管近年来微服务架构风靡业界，但单体架构在中小型项目中仍然是最务实的选择，也是理解其他架构测试策略的基础。

```
┌─────────────────────────────────────────────────────────────┐
│                    单体应用架构全景图                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │              Presentation Layer (表现层)              │   │
│   │  ┌───────────┐ ┌───────────┐ ┌───────────────────┐  │   │
│   │  │ Controller│ │ Controller│ │    Controller      │  │   │
│   │  │  (User)   │ │  (Order)  │ │    (Product)       │  │   │
│   │  └─────┬─────┘ └─────┬─────┘ └────────┬──────────┘  │   │
│   └────────┼──────────────┼────────────────┼─────────────┘   │
│            │              │                │                  │
│   ┌────────┼──────────────┼────────────────┼─────────────┐   │
│   │        ▼     Service Layer (服务层)     ▼             │   │
│   │  ┌───────────┐ ┌───────────┐ ┌───────────────────┐  │   │
│   │  │  Service  │ │  Service  │ │     Service        │  │   │
│   │  │  (User)   │←→│  (Order)  │←→│   (Product)       │  │   │
│   │  └─────┬─────┘ └─────┬─────┘ └────────┬──────────┘  │   │
│   │        │              │                │              │   │
│   │        │   ┌──────────┴──────────┐     │              │   │
│   │        │   │  Domain Model (领域) │     │              │   │
│   │        │   │  Entities / VOs     │     │              │   │
│   │        │   └──────────┬──────────┘     │              │   │
│   └────────┼──────────────┼────────────────┼─────────────┘   │
│            │              │                │                  │
│   ┌────────┼──────────────┼────────────────┼─────────────┐   │
│   │        ▼  Repository Layer (数据层)    ▼             │   │
│   │  ┌───────────┐ ┌───────────┐ ┌───────────────────┐  │   │
│   │  │Repository │ │Repository │ │   Repository      │  │   │
│   │  │  (User)   │ │  (Order)  │ │   (Product)       │  │   │
│   │  └─────┬─────┘ └─────┬─────┘ └────────┬──────────┘  │   │
│   └────────┼──────────────┼────────────────┼─────────────┘   │
│            │              │                │                  │
│            ▼              ▼                ▼                  │
│   ┌─────────────────────────────────────────────────────┐   │
│   │              Database (共享数据库)                     │   │
│   │          PostgreSQL / MySQL / Oracle                  │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │          Cross-Cutting Concerns (横切关注点)          │   │
│   │    认证/授权 │ 日志 │ 异常处理 │ 参数校验 │ 缓存      │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

单体架构的分层结构为我们提供了清晰的测试边界。每一层都有其独特的职责和对应的测试策略。下面我们逐层剖析。

---

#### 18.1.2 Controller 层测试策略

Controller 层是应用的入口，负责接收 HTTP 请求、参数校验、调用 Service 层并返回响应。测试该层时，我们关注的核心问题是：

- 路由映射是否正确？
- 请求参数校验是否生效？
- 响应状态码和格式是否符合预期？
- 异常情况下是否返回恰当的错误信息？

**关键原则：Controller 层测试应当隔离 Service 层，使用 Mock 替代真实的业务逻辑。**

##### Spring Boot 中使用 @WebMvcTest

`@WebMvcTest` 是 Spring Boot 提供的切片测试注解，它只加载 Web 层的组件（Controller、ControllerAdvice、Filter 等），不加载 Service 和 Repository，因此启动速度快，测试聚焦。

```java
// ========================================
// ProductController.java — 被测控制器
// ========================================
@RestController
@RequestMapping("/api/v1/products")
@Validated
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping
    public ResponseEntity<Page<ProductDTO>> listProducts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") @Max(100) int size,
            @RequestParam(required = false) String category) {
        Page<ProductDTO> products = productService.findProducts(page, size, category);
        return ResponseEntity.ok(products);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductDTO> getProduct(
            @PathVariable @Min(1) Long id) {
        ProductDTO product = productService.findById(id);
        return ResponseEntity.ok(product);
    }

    @PostMapping
    public ResponseEntity<ProductDTO> createProduct(
            @RequestBody @Valid CreateProductRequest request) {
        ProductDTO created = productService.create(request);
        URI location = URI.create("/api/v1/products/" + created.getId());
        return ResponseEntity.created(location).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProductDTO> updateProduct(
            @PathVariable @Min(1) Long id,
            @RequestBody @Valid UpdateProductRequest request) {
        ProductDTO updated = productService.update(id, request);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProduct(
            @PathVariable @Min(1) Long id) {
        productService.delete(id);
        return ResponseEntity.noContent().build();
    }
}

// ========================================
// CreateProductRequest.java — 请求对象
// ========================================
public record CreateProductRequest(
    @NotBlank(message = "商品名称不能为空")
    @Size(max = 200, message = "商品名称不能超过200个字符")
    String name,

    @NotNull(message = "价格不能为空")
    @DecimalMin(value = "0.01", message = "价格必须大于0")
    @Digits(integer = 8, fraction = 2, message = "价格格式不正确")
    BigDecimal price,

    @Size(max = 2000, message = "描述不能超过2000个字符")
    String description,

    @NotBlank(message = "分类不能为空")
    String category
) {}
```

```java
// ========================================
// ProductControllerTest.java — Controller 层测试
// ========================================
@WebMvcTest(ProductController.class)
class ProductControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProductService productService;

    @Autowired
    private ObjectMapper objectMapper;

    // ----- 查询测试 -----

    @Test
    @DisplayName("GET /products — 成功返回分页列表")
    void listProducts_ReturnsPagedResults() throws Exception {
        // Arrange
        List<ProductDTO> products = List.of(
            new ProductDTO(1L, "iPhone 16", new BigDecimal("7999.00"), "手机"),
            new ProductDTO(2L, "MacBook Pro", new BigDecimal("14999.00"), "电脑")
        );
        Page<ProductDTO> page = new PageImpl<>(products, PageRequest.of(0, 20), 2);
        when(productService.findProducts(0, 20, null)).thenReturn(page);

        // Act & Assert
        mockMvc.perform(get("/api/v1/products")
                .contentType(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content").isArray())
            .andExpect(jsonPath("$.content.length()").value(2))
            .andExpect(jsonPath("$.content[0].name").value("iPhone 16"))
            .andExpect(jsonPath("$.totalElements").value(2));
    }

    @Test
    @DisplayName("GET /products?size=200 — size 超过上限返回 400")
    void listProducts_SizeExceedsMax_Returns400() throws Exception {
        mockMvc.perform(get("/api/v1/products")
                .param("size", "200"))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("GET /products/{id} — 商品存在时返回 200")
    void getProduct_Exists_Returns200() throws Exception {
        ProductDTO product = new ProductDTO(
            1L, "iPhone 16", new BigDecimal("7999.00"), "手机");
        when(productService.findById(1L)).thenReturn(product);

        mockMvc.perform(get("/api/v1/products/1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(1))
            .andExpect(jsonPath("$.name").value("iPhone 16"))
            .andExpect(jsonPath("$.price").value(7999.00));
    }

    @Test
    @DisplayName("GET /products/{id} — 商品不存在时返回 404")
    void getProduct_NotFound_Returns404() throws Exception {
        when(productService.findById(999L))
            .thenThrow(new ResourceNotFoundException("商品不存在: 999"));

        mockMvc.perform(get("/api/v1/products/999"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.message").value("商品不存在: 999"));
    }

    @Test
    @DisplayName("GET /products/{id} — id 为负数时返回 400")
    void getProduct_NegativeId_Returns400() throws Exception {
        mockMvc.perform(get("/api/v1/products/-1"))
            .andExpect(status().isBadRequest());
    }

    // ----- 创建测试 -----

    @Test
    @DisplayName("POST /products — 合法请求返回 201 + Location")
    void createProduct_ValidRequest_Returns201() throws Exception {
        CreateProductRequest request = new CreateProductRequest(
            "AirPods Pro", new BigDecimal("1999.00"), "无线耳机", "配件");
        ProductDTO created = new ProductDTO(
            3L, "AirPods Pro", new BigDecimal("1999.00"), "配件");
        when(productService.create(any(CreateProductRequest.class)))
            .thenReturn(created);

        mockMvc.perform(post("/api/v1/products")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(header().string("Location", "/api/v1/products/3"))
            .andExpect(jsonPath("$.id").value(3))
            .andExpect(jsonPath("$.name").value("AirPods Pro"));
    }

    @Test
    @DisplayName("POST /products — 名称为空时返回 400 + 校验信息")
    void createProduct_BlankName_Returns400() throws Exception {
        CreateProductRequest request = new CreateProductRequest(
            "", new BigDecimal("1999.00"), null, "配件");

        mockMvc.perform(post("/api/v1/products")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errors[?(@.field=='name')]").exists());
    }

    @Test
    @DisplayName("POST /products — 价格为 0 时返回 400")
    void createProduct_ZeroPrice_Returns400() throws Exception {
        CreateProductRequest request = new CreateProductRequest(
            "Test Product", BigDecimal.ZERO, null, "配件");

        mockMvc.perform(post("/api/v1/products")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errors[?(@.field=='price')]").exists());
    }

    @Test
    @DisplayName("POST /products — 缺少必填字段时返回所有校验错误")
    void createProduct_MultipleViolations_ReturnsAllErrors() throws Exception {
        // 所有字段都为 null
        String emptyRequest = "{}";

        mockMvc.perform(post("/api/v1/products")
                .contentType(MediaType.APPLICATION_JSON)
                .content(emptyRequest))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errors.length()").value(
                greaterThanOrEqualTo(3)));  // name, price, category
    }

    // ----- 更新与删除测试 -----

    @Test
    @DisplayName("DELETE /products/{id} — 成功删除返回 204")
    void deleteProduct_Exists_Returns204() throws Exception {
        doNothing().when(productService).delete(1L);

        mockMvc.perform(delete("/api/v1/products/1"))
            .andExpect(status().isNoContent());

        verify(productService).delete(1L);
    }
}
```

##### Express.js 中使用 supertest

对于 Node.js 生态，`supertest` 是测试 HTTP 层的标准工具。它可以在不启动真实服务器的情况下发送请求。

```javascript
// ========================================
// product.controller.js — Express 控制器
// ========================================
const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');

const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

router.get('/',
    query('page').optional().isInt({ min: 0 }),
    query('size').optional().isInt({ min: 1, max: 100 }),
    validateRequest,
    async (req, res, next) => {
        try {
            const { page = 0, size = 20, category } = req.query;
            const result = await req.productService.findProducts(
                parseInt(page), parseInt(size), category);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }
);

router.get('/:id',
    param('id').isInt({ min: 1 }),
    validateRequest,
    async (req, res, next) => {
        try {
            const product = await req.productService.findById(
                parseInt(req.params.id));
            if (!product) {
                return res.status(404).json({
                    message: `商品不存在: ${req.params.id}`
                });
            }
            res.json(product);
        } catch (error) {
            next(error);
        }
    }
);

router.post('/',
    body('name').notEmpty().withMessage('商品名称不能为空')
        .isLength({ max: 200 }).withMessage('商品名称不能超过200个字符'),
    body('price').isFloat({ gt: 0 }).withMessage('价格必须大于0'),
    body('category').notEmpty().withMessage('分类不能为空'),
    validateRequest,
    async (req, res, next) => {
        try {
            const created = await req.productService.create(req.body);
            res.status(201)
               .location(`/api/v1/products/${created.id}`)
               .json(created);
        } catch (error) {
            next(error);
        }
    }
);

module.exports = router;
```

```javascript
// ========================================
// product.controller.test.js — supertest 测试
// ========================================
const request = require('supertest');
const express = require('express');
const productRouter = require('./product.controller');

describe('ProductController', () => {
    let app;
    let mockProductService;

    beforeEach(() => {
        // 创建一个独立的 Express 实例，注入 Mock Service
        mockProductService = {
            findProducts: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
        };

        app = express();
        app.use(express.json());
        // 中间件注入 mock service
        app.use((req, res, next) => {
            req.productService = mockProductService;
            next();
        });
        app.use('/api/v1/products', productRouter);
        // 全局错误处理
        app.use((err, req, res, next) => {
            res.status(500).json({ message: err.message });
        });
    });

    describe('GET /api/v1/products', () => {
        it('成功返回分页列表', async () => {
            const mockData = {
                content: [
                    { id: 1, name: 'iPhone 16', price: 7999 },
                    { id: 2, name: 'MacBook Pro', price: 14999 },
                ],
                totalElements: 2,
                page: 0,
            };
            mockProductService.findProducts.mockResolvedValue(mockData);

            const response = await request(app)
                .get('/api/v1/products')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body.content).toHaveLength(2);
            expect(response.body.content[0].name).toBe('iPhone 16');
            expect(mockProductService.findProducts)
                .toHaveBeenCalledWith(0, 20, undefined);
        });

        it('支持按分类筛选', async () => {
            mockProductService.findProducts.mockResolvedValue({
                content: [], totalElements: 0, page: 0 });

            await request(app)
                .get('/api/v1/products?category=手机')
                .expect(200);

            expect(mockProductService.findProducts)
                .toHaveBeenCalledWith(0, 20, '手机');
        });

        it('size 超过 100 时返回 400', async () => {
            await request(app)
                .get('/api/v1/products?size=200')
                .expect(400);
        });
    });

    describe('GET /api/v1/products/:id', () => {
        it('商品存在时返回 200', async () => {
            mockProductService.findById.mockResolvedValue({
                id: 1, name: 'iPhone 16', price: 7999 });

            const response = await request(app)
                .get('/api/v1/products/1')
                .expect(200);

            expect(response.body.name).toBe('iPhone 16');
        });

        it('商品不存在时返回 404', async () => {
            mockProductService.findById.mockResolvedValue(null);

            await request(app)
                .get('/api/v1/products/999')
                .expect(404);
        });

        it('id 格式错误时返回 400', async () => {
            await request(app)
                .get('/api/v1/products/abc')
                .expect(400);
        });
    });

    describe('POST /api/v1/products', () => {
        const validProduct = {
            name: 'AirPods Pro',
            price: 1999,
            category: '配件',
        };

        it('合法请求返回 201 + Location', async () => {
            mockProductService.create.mockResolvedValue({
                id: 3, ...validProduct });

            const response = await request(app)
                .post('/api/v1/products')
                .send(validProduct)
                .expect(201);

            expect(response.headers.location)
                .toBe('/api/v1/products/3');
            expect(response.body.id).toBe(3);
        });

        it('名称为空时返回 400', async () => {
            await request(app)
                .post('/api/v1/products')
                .send({ ...validProduct, name: '' })
                .expect(400);
        });

        it('价格为负数时返回 400', async () => {
            await request(app)
                .post('/api/v1/products')
                .send({ ...validProduct, price: -100 })
                .expect(400);
        });

        it('缺少分类时返回 400', async () => {
            const { category, ...noCategory } = validProduct;
            await request(app)
                .post('/api/v1/products')
                .send(noCategory)
                .expect(400);
        });
    });
});
```

---

#### 18.1.3 Service 层测试策略

Service 层是单体应用的核心，承载着全部业务逻辑。测试该层时遵循一条黄金法则：**尽可能测试真实的业务行为，而非实现细节。**

```
┌──────────────────────────────────────────────────────┐
│               Service 层测试决策树                     │
├──────────────────────────────────────────────────────┤
│                                                      │
│  被测 Service 方法是否包含纯业务逻辑（计算、规则）？   │
│      │                                               │
│      ├── 是 ──→ 不使用 Mock，直接测试输入/输出         │
│      │         （测试真实行为，最有价值）               │
│      │                                               │
│      └── 否 ──→ 是否依赖外部系统？                    │
│                  │                                   │
│                  ├── Repository ──→ Mock 数据层       │
│                  │   (大多数场景)    或用内存数据库     │
│                  │                                   │
│                  ├── 第三方 API ──→ 必须 Mock          │
│                  │   (支付/短信)                      │
│                  │                                   │
│                  └── 其他 Service ──→ 视复杂度决定     │
│                      (内部调用)       简单→真实       │
│                                      复杂→Mock       │
│                                                      │
└──────────────────────────────────────────────────────┘
```

##### 场景一：纯业务逻辑 — 不需要 Mock

```java
// ========================================
// PricingService.java — 纯业务逻辑
// ========================================
@Service
public class PricingService {

    /**
     * 根据订单计算最终价格。规则：
     * 1. 满 300 减 30
     * 2. VIP 用户额外 9 折
     * 3. 两个优惠可叠加
     * 4. 最终价格不低于 0
     */
    public OrderPricing calculateFinalPrice(
            BigDecimal subtotal,
            boolean isVip,
            String couponCode) {

        BigDecimal discount = BigDecimal.ZERO;

        // 满减规则
        if (subtotal.compareTo(new BigDecimal("300")) >= 0) {
            discount = discount.add(new BigDecimal("30"));
        }

        BigDecimal afterDiscount = subtotal.subtract(discount);

        // VIP 折扣
        if (isVip) {
            afterDiscount = afterDiscount.multiply(new BigDecimal("0.9"))
                .setScale(2, RoundingMode.HALF_UP);
        }

        // 保底 0 元
        BigDecimal finalPrice = afterDiscount.max(BigDecimal.ZERO);

        return new OrderPricing(subtotal, discount, isVip, finalPrice);
    }
}
```

```java
// ========================================
// PricingServiceTest.java — 无 Mock 的纯逻辑测试
// ========================================
class PricingServiceTest {

    private final PricingService pricingService = new PricingService();

    @ParameterizedTest(name = "原价{0}, VIP={1} → 应付{2}")
    @CsvSource({
        // 原价,    VIP,   预期最终价格
        "100.00,  false,  100.00",    // 不满 300，无折扣
        "300.00,  false,  270.00",    // 刚好满 300，减 30
        "500.00,  false,  470.00",    // 满 300，减 30
        "100.00,  true,   90.00",     // 不满 300，VIP 9 折
        "300.00,  true,   243.00",    // 满减 + VIP: (300-30)*0.9
        "500.00,  true,   423.00",    // 满减 + VIP: (500-30)*0.9
        "20.00,   true,   18.00",     // 小金额 VIP
    })
    void calculateFinalPrice_VariousScenarios(
            String subtotal, boolean isVip, String expected) {
        OrderPricing result = pricingService.calculateFinalPrice(
            new BigDecimal(subtotal), isVip, null);

        assertThat(result.getFinalPrice())
            .isEqualByComparingTo(new BigDecimal(expected));
    }

    @Test
    @DisplayName("最终价格不会低于 0")
    void calculateFinalPrice_NeverNegative() {
        // 即使折扣后为负数（理论上不应发生但需要防御）
        OrderPricing result = pricingService.calculateFinalPrice(
            new BigDecimal("10.00"), false, null);

        assertThat(result.getFinalPrice())
            .isGreaterThanOrEqualTo(BigDecimal.ZERO);
    }
}
```

##### 场景二：依赖 Repository — 使用 Mock

```java
// ========================================
// OrderService.java — 依赖 Repository 的业务逻辑
// ========================================
@Service
@Transactional
public class OrderService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final PricingService pricingService;
    private final InventoryService inventoryService;

    public OrderService(OrderRepository orderRepository,
                        ProductRepository productRepository,
                        PricingService pricingService,
                        InventoryService inventoryService) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.pricingService = pricingService;
        this.inventoryService = inventoryService;
    }

    public OrderDTO createOrder(Long userId, CreateOrderRequest request) {
        // 1. 查询商品信息
        List<Product> products = productRepository
            .findAllById(request.getProductIds());

        if (products.size() != request.getProductIds().size()) {
            throw new BusinessException("部分商品不存在");
        }

        // 2. 检查库存
        for (OrderItem item : request.getItems()) {
            if (!inventoryService.checkStock(
                    item.getProductId(), item.getQuantity())) {
                throw new InsufficientStockException(
                    "商品库存不足: " + item.getProductId());
            }
        }

        // 3. 计算价格
        BigDecimal subtotal = calculateSubtotal(products, request.getItems());
        boolean isVip = request.isVipUser();
        OrderPricing pricing = pricingService.calculateFinalPrice(
            subtotal, isVip, request.getCouponCode());

        // 4. 创建订单
        Order order = Order.builder()
            .userId(userId)
            .subtotal(pricing.getSubtotal())
            .discount(pricing.getDiscount())
            .finalPrice(pricing.getFinalPrice())
            .status(OrderStatus.PENDING)
            .build();

        Order saved = orderRepository.save(order);

        // 5. 扣减库存
        for (OrderItem item : request.getItems()) {
            inventoryService.deductStock(
                item.getProductId(), item.getQuantity());
        }

        return OrderDTO.from(saved);
    }

    private BigDecimal calculateSubtotal(
            List<Product> products, List<OrderItem> items) {
        Map<Long, BigDecimal> priceMap = products.stream()
            .collect(Collectors.toMap(Product::getId, Product::getPrice));

        return items.stream()
            .map(item -> priceMap.get(item.getProductId())
                .multiply(BigDecimal.valueOf(item.getQuantity())))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
```

```java
// ========================================
// OrderServiceTest.java — 使用 Mock 的 Service 测试
// ========================================
@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock private OrderRepository orderRepository;
    @Mock private ProductRepository productRepository;
    @Mock private InventoryService inventoryService;

    // 注意：PricingService 是纯逻辑，使用真实实例而非 Mock
    private final PricingService pricingService = new PricingService();

    @InjectMocks
    private OrderService orderService;

    @BeforeEach
    void setUp() {
        // 手动注入真实的 PricingService
        orderService = new OrderService(
            orderRepository, productRepository,
            pricingService, inventoryService);
    }

    @Test
    @DisplayName("正常下单 — 创建订单并扣减库存")
    void createOrder_HappyPath() {
        // Arrange
        Long userId = 1L;
        Product phone = new Product(101L, "iPhone", new BigDecimal("7999.00"));
        Product case_ = new Product(102L, "手机壳", new BigDecimal("99.00"));

        when(productRepository.findAllById(List.of(101L, 102L)))
            .thenReturn(List.of(phone, case_));
        when(inventoryService.checkStock(anyLong(), anyInt()))
            .thenReturn(true);
        when(orderRepository.save(any(Order.class)))
            .thenAnswer(invocation -> {
                Order order = invocation.getArgument(0);
                order.setId(1001L);
                return order;
            });

        CreateOrderRequest request = CreateOrderRequest.builder()
            .productIds(List.of(101L, 102L))
            .items(List.of(
                new OrderItem(101L, 1),  // 1 部手机
                new OrderItem(102L, 2)   // 2 个手机壳
            ))
            .vipUser(false)
            .build();

        // Act
        OrderDTO result = orderService.createOrder(userId, request);

        // Assert
        // 小计 = 7999 + 99*2 = 8197，满 300 减 30 → 8167
        assertThat(result.getFinalPrice())
            .isEqualByComparingTo(new BigDecimal("8167.00"));
        assertThat(result.getStatus()).isEqualTo(OrderStatus.PENDING);

        // 验证库存被扣减
        verify(inventoryService).deductStock(101L, 1);
        verify(inventoryService).deductStock(102L, 2);
        verify(orderRepository).save(any(Order.class));
    }

    @Test
    @DisplayName("部分商品不存在 — 抛出 BusinessException")
    void createOrder_ProductNotFound_ThrowsException() {
        when(productRepository.findAllById(List.of(101L, 999L)))
            .thenReturn(List.of(new Product(101L, "iPhone",
                new BigDecimal("7999.00"))));

        CreateOrderRequest request = CreateOrderRequest.builder()
            .productIds(List.of(101L, 999L))
            .items(List.of(new OrderItem(101L, 1), new OrderItem(999L, 1)))
            .build();

        assertThatThrownBy(() -> orderService.createOrder(1L, request))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("部分商品不存在");

        // 验证未执行库存扣减和订单保存
        verify(inventoryService, never()).deductStock(anyLong(), anyInt());
        verify(orderRepository, never()).save(any());
    }

    @Test
    @DisplayName("库存不足 — 抛出 InsufficientStockException")
    void createOrder_InsufficientStock_ThrowsException() {
        Product phone = new Product(101L, "iPhone", new BigDecimal("7999.00"));
        when(productRepository.findAllById(List.of(101L)))
            .thenReturn(List.of(phone));
        when(inventoryService.checkStock(101L, 100))
            .thenReturn(false);

        CreateOrderRequest request = CreateOrderRequest.builder()
            .productIds(List.of(101L))
            .items(List.of(new OrderItem(101L, 100)))
            .build();

        assertThatThrownBy(() -> orderService.createOrder(1L, request))
            .isInstanceOf(InsufficientStockException.class)
            .hasMessageContaining("库存不足");
    }
}
```

---

#### 18.1.4 Repository 层测试策略

Repository 层测试的核心目标是验证数据访问逻辑的正确性——包括自定义查询、级联操作、分页排序等。**这一层不应使用 Mock，而应连接真实数据库。**

使用 Testcontainers 可以在测试中启动一个与生产环境一致的数据库容器，避免了 H2 等内存数据库与生产数据库之间的方言差异。

```
┌──────────────────────────────────────────────────────┐
│           Repository 测试方案对比                      │
├──────────────┬───────────────┬────────────────────────┤
│    方案       │     优点       │       缺点             │
├──────────────┼───────────────┼────────────────────────┤
│ H2 内存数据库  │ 速度快         │ SQL 方言不一致          │
│              │ 零配置         │ 不支持部分生产特性       │
│              │ CI 友好        │ 可能掩盖真实 bug        │
├──────────────┼───────────────┼────────────────────────┤
│ Testcontainers│ 与生产一致     │ 需要 Docker            │
│ (推荐)       │ 支持所有特性    │ 启动稍慢（首次约 10s）  │
│              │ 可复现 bug     │ CI 需要 Docker 支持     │
├──────────────┼───────────────┼────────────────────────┤
│ 共享测试数据库 │ 完全真实       │ 测试间数据污染          │
│              │               │ 并行执行困难            │
│              │               │ 需要手动清理             │
└──────────────┴───────────────┴────────────────────────┘
```

##### Spring Boot + Testcontainers 示例

```java
// ========================================
// ProductRepository.java — 自定义查询的 Repository
// ========================================
public interface ProductRepository extends JpaRepository<Product, Long> {

    @Query("SELECT p FROM Product p WHERE p.category = :category " +
           "AND p.price BETWEEN :minPrice AND :maxPrice " +
           "ORDER BY p.price ASC")
    Page<Product> findByCategoryAndPriceRange(
        @Param("category") String category,
        @Param("minPrice") BigDecimal minPrice,
        @Param("maxPrice") BigDecimal maxPrice,
        Pageable pageable);

    @Query(value = "SELECT category, COUNT(*) as count, " +
           "AVG(price) as avg_price " +
           "FROM products GROUP BY category " +
           "HAVING COUNT(*) >= :minCount",
           nativeQuery = true)
    List<CategoryStatsProjection> findCategoryStats(
        @Param("minCount") int minCount);

    List<Product> findByNameContainingIgnoreCase(String keyword);

    @Modifying
    @Query("UPDATE Product p SET p.price = p.price * :factor " +
           "WHERE p.category = :category")
    int bulkUpdatePriceByCategory(
        @Param("category") String category,
        @Param("factor") BigDecimal factor);
}
```

```java
// ========================================
// ProductRepositoryTest.java — Testcontainers 集成测试
// ========================================
@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class ProductRepositoryTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(
            DockerImageName.parse("postgres:16-alpine"))
        .withDatabaseName("testdb")
        .withUsername("test")
        .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private TestEntityManager entityManager;

    @BeforeEach
    void setUp() {
        // 插入测试数据
        entityManager.persist(new Product(null, "iPhone 16",
            new BigDecimal("7999.00"), "手机", "苹果旗舰手机"));
        entityManager.persist(new Product(null, "iPhone 16 Pro",
            new BigDecimal("9999.00"), "手机", "苹果旗舰Pro"));
        entityManager.persist(new Product(null, "Pixel 9",
            new BigDecimal("4999.00"), "手机", "谷歌旗舰手机"));
        entityManager.persist(new Product(null, "MacBook Pro",
            new BigDecimal("14999.00"), "电脑", "苹果笔记本"));
        entityManager.persist(new Product(null, "ThinkPad X1",
            new BigDecimal("9999.00"), "电脑", "联想商务本"));
        entityManager.persist(new Product(null, "AirPods Pro",
            new BigDecimal("1799.00"), "配件", "无线耳机"));
        entityManager.flush();
    }

    @Test
    @DisplayName("按分类和价格区间查询 — 结果正确且排序")
    void findByCategoryAndPriceRange_ReturnsFilteredSorted() {
        Page<Product> result = productRepository.findByCategoryAndPriceRange(
            "手机",
            new BigDecimal("5000"),
            new BigDecimal("10000"),
            PageRequest.of(0, 10));

        assertThat(result.getContent())
            .hasSize(2)
            .extracting(Product::getName)
            .containsExactly("iPhone 16", "iPhone 16 Pro");  // 按价格升序
    }

    @Test
    @DisplayName("分类统计 — 返回达到最小数量的分类")
    void findCategoryStats_ReturnsQualifiedCategories() {
        List<CategoryStatsProjection> stats =
            productRepository.findCategoryStats(2);

        assertThat(stats).hasSize(2);  // 手机(3) 和 电脑(2)
        // 配件(1) 不满足 minCount=2
    }

    @Test
    @DisplayName("模糊搜索 — 忽略大小写")
    void findByNameContaining_CaseInsensitive() {
        List<Product> result = productRepository
            .findByNameContainingIgnoreCase("iphone");

        assertThat(result).hasSize(2);
        assertThat(result).extracting(Product::getName)
            .allMatch(name -> name.toLowerCase().contains("iphone"));
    }

    @Test
    @DisplayName("批量更新价格 — 影响正确数量的记录")
    void bulkUpdatePrice_AffectsCorrectRows() {
        int updatedCount = productRepository.bulkUpdatePriceByCategory(
            "手机", new BigDecimal("0.9"));  // 手机全部打 9 折

        assertThat(updatedCount).isEqualTo(3);

        entityManager.clear();  // 清除一级缓存

        Product iphone = productRepository.findByNameContainingIgnoreCase(
            "iPhone 16").stream()
            .filter(p -> p.getName().equals("iPhone 16"))
            .findFirst()
            .orElseThrow();

        // 7999.00 * 0.9 = 7199.10
        assertThat(iphone.getPrice())
            .isEqualByComparingTo(new BigDecimal("7199.10"));
    }

    @Test
    @DisplayName("分页查询 — 返回正确的分页元数据")
    void findByCategoryAndPriceRange_PaginationMetadata() {
        Page<Product> page = productRepository.findByCategoryAndPriceRange(
            "手机",
            BigDecimal.ZERO,
            new BigDecimal("99999"),
            PageRequest.of(0, 2));  // 每页 2 条

        assertThat(page.getContent()).hasSize(2);
        assertThat(page.getTotalElements()).isEqualTo(3);
        assertThat(page.getTotalPages()).isEqualTo(2);
        assertThat(page.isFirst()).isTrue();
        assertThat(page.hasNext()).isTrue();
    }
}
```

---

#### 18.1.5 横切关注点测试

横切关注点（Cross-Cutting Concerns）渗透到应用的每一层，包括认证授权、全局异常处理、请求日志、参数校验等。这些逻辑往往通过过滤器（Filter）、拦截器（Interceptor）或切面（AOP）实现，需要专门的测试策略。

##### 认证与授权测试

```java
// ========================================
// SecurityIntegrationTest.java — 认证与授权测试
// ========================================
@WebMvcTest(ProductController.class)
@Import(SecurityConfig.class)
class SecurityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProductService productService;

    @Test
    @DisplayName("未认证用户访问受保护端点 — 返回 401")
    void unauthenticated_Returns401() throws Exception {
        mockMvc.perform(get("/api/v1/products"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "USER")
    @DisplayName("普通用户可以查看商品列表")
    void authenticatedUser_CanListProducts() throws Exception {
        when(productService.findProducts(anyInt(), anyInt(), any()))
            .thenReturn(Page.empty());

        mockMvc.perform(get("/api/v1/products"))
            .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "USER")
    @DisplayName("普通用户不能创建商品 — 返回 403")
    void regularUser_CannotCreateProduct() throws Exception {
        mockMvc.perform(post("/api/v1/products")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"test\",\"price\":100,\"category\":\"test\"}"))
            .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("管理员可以创建商品")
    void adminUser_CanCreateProduct() throws Exception {
        when(productService.create(any()))
            .thenReturn(new ProductDTO(1L, "test", BigDecimal.TEN, "test"));

        mockMvc.perform(post("/api/v1/products")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"test\",\"price\":100,\"category\":\"test\"}"))
            .andExpect(status().isCreated());
    }

    @Test
    @DisplayName("JWT Token 过期 — 返回 401 及明确错误信息")
    void expiredToken_Returns401WithMessage() throws Exception {
        String expiredToken = generateExpiredJwt();

        mockMvc.perform(get("/api/v1/products")
                .header("Authorization", "Bearer " + expiredToken))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.error").value("token_expired"))
            .andExpect(jsonPath("$.message").exists());
    }
}
```

##### 全局异常处理测试

```java
// ========================================
// GlobalExceptionHandlerTest.java
// ========================================
@WebMvcTest(ProductController.class)
class GlobalExceptionHandlerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProductService productService;

    @Test
    @DisplayName("业务异常 — 返回 400 + 结构化错误体")
    void businessException_Returns400() throws Exception {
        when(productService.findById(1L))
            .thenThrow(new BusinessException("INVALID_STATE", "订单已取消"));

        mockMvc.perform(get("/api/v1/products/1"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_STATE"))
            .andExpect(jsonPath("$.message").value("订单已取消"))
            .andExpect(jsonPath("$.timestamp").exists());
    }

    @Test
    @DisplayName("未知异常 — 返回 500 且不泄露堆栈")
    void unexpectedException_Returns500_NoStackTrace() throws Exception {
        when(productService.findById(1L))
            .thenThrow(new RuntimeException("数据库连接失败"));

        mockMvc.perform(get("/api/v1/products/1"))
            .andExpect(status().isInternalServerError())
            .andExpect(jsonPath("$.message").value("服务器内部错误"))
            // 不应泄露具体异常信息
            .andExpect(jsonPath("$.message").value(
                not(containsString("数据库连接失败"))))
            .andExpect(jsonPath("$.stackTrace").doesNotExist());
    }
}
```

---

#### 18.1.6 各层测试对照表

| 维度 | Controller 层 | Service 层 | Repository 层 | 横切关注点 |
|------|--------------|-----------|--------------|-----------|
| **测试类型** | 切片集成测试 | 单元测试 | 集成测试 | 切片集成测试 |
| **Spring 注解** | `@WebMvcTest` | 无（或 `@ExtendWith`） | `@DataJpaTest` | `@WebMvcTest` + `@Import` |
| **Mock 范围** | Mock Service 层 | Mock Repository 和外部依赖 | 不 Mock | Mock Service 层 |
| **数据库** | 不需要 | 不需要 | 真实 DB (Testcontainers) | 不需要 |
| **网络** | MockMvc 模拟 HTTP | 无 | 无 | MockMvc 模拟 HTTP |
| **关注点** | 路由、参数校验、序列化、状态码 | 业务规则、异常流程、状态变化 | SQL 正确性、分页、事务 | 认证、授权、异常映射 |
| **执行速度** | 快（<2s） | 极快（<0.5s） | 中等（5-15s 首次） | 快（<2s） |
| **覆盖率贡献** | HTTP 入口路径 | 核心业务逻辑 | 数据访问路径 | 安全与异常路径 |
| **Mock 工具** | `@MockBean` | `@Mock` + `@InjectMocks` | 无 | `@MockBean` + `@WithMockUser` |

---

#### 18.1.7 单体应用测试反模式

在实践中，以下反模式频繁出现。识别并避免它们是编写有效测试的关键。

```
┌──────────────────────────────────────────────────────────────┐
│                    单体测试反模式清单                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ❌ 反模式 1：全量 @SpringBootTest 跑所有测试                  │
│  ┌─────────────────────────────────────────────────┐         │
│  │ @SpringBootTest     ← 加载整个 Spring 上下文      │         │
│  │ class UserControllerTest {                       │         │
│  │     // 只测了一个 Controller，却启动了整个应用    │         │
│  │ }                                                │         │
│  └─────────────────────────────────────────────────┘         │
│  ✅ 正确做法：Controller 测试用 @WebMvcTest，                  │
│              Repository 测试用 @DataJpaTest                   │
│                                                              │
│  ❌ 反模式 2：Mock 一切，包括被测对象自身的方法                 │
│  ┌─────────────────────────────────────────────────┐         │
│  │ // 这段测试毫无价值 — 你在测试 Mockito 而非业务  │         │
│  │ when(orderService.createOrder(any()))            │         │
│  │     .thenReturn(mockOrder);                      │         │
│  │ assertThat(orderService.createOrder(request))    │         │
│  │     .isEqualTo(mockOrder);  // 当然相等！        │         │
│  └─────────────────────────────────────────────────┘         │
│  ✅ 正确做法：只 Mock 被测对象的外部依赖，不 Mock 自身         │
│                                                              │
│  ❌ 反模式 3：用 H2 代替 PostgreSQL 做 Repository 测试        │
│  ┌─────────────────────────────────────────────────┐         │
│  │ 问题场景：                                       │         │
│  │ - JSONB 字段在 H2 中不支持                       │         │
│  │ - PostgreSQL 特有函数（array_agg）在 H2 报错     │         │
│  │ - 窗口函数行为差异导致测试通过但生产失败          │         │
│  └─────────────────────────────────────────────────┘         │
│  ✅ 正确做法：使用 Testcontainers 启动同版本数据库             │
│                                                              │
│  ❌ 反模式 4：测试中硬编码时间和随机值                         │
│  ┌─────────────────────────────────────────────────┐         │
│  │ // 每年跨年时这个测试就会失败                    │         │
│  │ assertThat(order.getCreatedAt().getYear())       │         │
│  │     .isEqualTo(2026);                            │         │
│  └─────────────────────────────────────────────────┘         │
│  ✅ 正确做法：注入 Clock 对象，测试中使用固定时钟              │
│                                                              │
│  ❌ 反模式 5：测试之间共享状态                                 │
│  ┌─────────────────────────────────────────────────┐         │
│  │ static List<Order> testOrders = new ArrayList<>();│        │
│  │ // 测试 A 向列表添加数据，测试 B 依赖这些数据    │         │
│  │ // 测试 B 单独运行时失败                         │         │
│  └─────────────────────────────────────────────────┘         │
│  ✅ 正确做法：每个测试独立 setUp，使用 @BeforeEach 初始化      │
│                                                              │
│  ❌ 反模式 6：只测 Happy Path，忽略异常路径                    │
│  ┌─────────────────────────────────────────────────┐         │
│  │ // 只有一个测试："正常创建订单成功"               │         │
│  │ // 缺失：库存不足、价格变动、并发下单、           │         │
│  │ //        参数校验失败、权限不足...               │         │
│  └─────────────────────────────────────────────────┘         │
│  ✅ 正确做法：异常路径测试数量应 ≥ 正常路径的 2 倍             │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

### 18.2 微服务测试策略

微服务架构将单体应用拆分为多个独立部署的服务，每个服务拥有自己的数据库和生命周期。这种架构带来了巨大的灵活性，但也让测试变得异常复杂。本节将深入探讨微服务特有的测试挑战与应对策略。

#### 18.2.1 微服务测试的独特挑战

单体应用的测试主要在进程内完成——调用一个方法、检查返回值。而微服务测试必须面对分布式系统的固有复杂性。

```
┌──────────────────────────────────────────────────────────────┐
│              微服务系统示例拓扑                                │
│                                                              │
│    ┌──────────┐     HTTP      ┌──────────┐                   │
│    │ API      │──────────────→│  Order   │                   │
│    │ Gateway  │               │  Service │                   │
│    └──────────┘               └────┬─────┘                   │
│         │                          │                         │
│         │ HTTP                     │ gRPC                    │
│         ▼                          ▼                         │
│    ┌──────────┐              ┌──────────┐    Kafka           │
│    │  User    │              │ Inventory│───────────┐        │
│    │ Service  │              │  Service │           │        │
│    └────┬─────┘              └────┬─────┘           ▼        │
│         │                         │           ┌──────────┐   │
│         ▼                         ▼           │Notification│  │
│    ┌─────────┐              ┌─────────┐      │  Service  │   │
│    │ User DB │              │ Inv DB  │      └──────────┘   │
│    │(Postgres)│             │ (MySQL) │                      │
│    └─────────┘              └─────────┘                      │
│                                                              │
│    每个服务独立部署、独立扩缩、独立演进                        │
│    ↓ 这意味着测试面临以下挑战 ↓                               │
└──────────────────────────────────────────────────────────────┘
```

##### 挑战一：网络不确定性

在单体中，方法调用是确定性的——要么成功，要么抛出异常。但在微服务中，任何一次服务间调用都可能遭遇：

- **超时**：网络延迟导致请求超时
- **部分失败**：请求到达对方但响应丢失
- **连接拒绝**：目标服务正在重启或已崩溃
- **DNS 解析失败**：服务发现出现问题

```java
// 网络不确定性的测试示例 — 使用 WireMock 模拟网络故障
@WireMockTest(httpPort = 8089)
class OrderServiceNetworkResilienceTest {

    private OrderServiceClient client;

    @BeforeEach
    void setUp() {
        client = new OrderServiceClient("http://localhost:8089");
    }

    @Test
    @DisplayName("目标服务超时 — 触发降级策略")
    void targetServiceTimeout_FallbackActivated() {
        // 模拟 Inventory Service 响应延迟 5 秒
        stubFor(get(urlPathEqualTo("/api/inventory/check"))
            .willReturn(aResponse()
                .withFixedDelay(5000)  // 超过客户端 2s 超时
                .withStatus(200)
                .withBody("{\"available\": true}")));

        // 预期：客户端超时后使用降级值，而非崩溃
        InventoryResponse response = client.checkInventory("SKU-001", 1);

        assertThat(response.isAvailable()).isFalse();  // 降级为"不可用"
        assertThat(response.isFallback()).isTrue();
    }

    @Test
    @DisplayName("目标服务返回 503 — 触发重试 + 熔断")
    void targetService503_RetryThenCircuitBreak() {
        // 前 3 次返回 503，第 4 次返回 200
        stubFor(get(urlPathEqualTo("/api/inventory/check"))
            .inScenario("retry-scenario")
            .whenScenarioStateIs(Scenario.STARTED)
            .willReturn(aResponse().withStatus(503))
            .willSetStateTo("attempt-2"));

        stubFor(get(urlPathEqualTo("/api/inventory/check"))
            .inScenario("retry-scenario")
            .whenScenarioStateIs("attempt-2")
            .willReturn(aResponse().withStatus(503))
            .willSetStateTo("attempt-3"));

        stubFor(get(urlPathEqualTo("/api/inventory/check"))
            .inScenario("retry-scenario")
            .whenScenarioStateIs("attempt-3")
            .willReturn(aResponse()
                .withStatus(200)
                .withBody("{\"available\": true}")));

        InventoryResponse response = client.checkInventory("SKU-001", 1);

        // 经过 2 次重试后成功
        assertThat(response.isAvailable()).isTrue();
        verify(3, getRequestedFor(
            urlPathEqualTo("/api/inventory/check")));
    }

    @Test
    @DisplayName("目标服务连接拒绝 — 熔断器打开后快速失败")
    void connectionRefused_CircuitBreakerOpens() {
        // 模拟服务完全不可用（连接拒绝）
        stubFor(get(urlPathEqualTo("/api/inventory/check"))
            .willReturn(aResponse().withFault(Fault.CONNECTION_RESET_BY_PEER)));

        // 连续请求 10 次，触发熔断器
        for (int i = 0; i < 10; i++) {
            client.checkInventory("SKU-001", 1);
        }

        // 熔断器打开后，请求不再发出，直接返回降级值
        long startTime = System.currentTimeMillis();
        InventoryResponse response = client.checkInventory("SKU-001", 1);
        long elapsed = System.currentTimeMillis() - startTime;

        assertThat(response.isFallback()).isTrue();
        assertThat(elapsed).isLessThan(50);  // 快速失败，无需等待超时
    }
}
```

##### 挑战二：服务版本不匹配

在微服务环境中，服务独立部署意味着任何时刻都可能存在接口版本不一致的情况。

```
┌──────────────────────────────────────────────────────────┐
│                版本不匹配的典型场景                        │
│                                                          │
│  时间线：                                                │
│                                                          │
│  T1: Order Service v2.1 ───→ Inventory Service v1.3     │
│      请求: GET /api/inventory/{sku}                      │
│      响应: { "sku": "...", "quantity": 100 }   ✅ 正常   │
│                                                          │
│  T2: Inventory Service 升级到 v1.4                       │
│      响应字段改名: quantity → availableQuantity           │
│      { "sku": "...", "availableQuantity": 100 }          │
│                                                          │
│  T3: Order Service v2.1 ───→ Inventory Service v1.4     │
│      Order Service 仍然读取 "quantity" 字段               │
│      结果: quantity = null → NullPointerException  ❌     │
│                                                          │
│  根因：两个服务的部署没有协调，接口变更没有同步             │
│  防御：契约测试（详见 18.2.4）                            │
└──────────────────────────────────────────────────────────┘
```

```java
// 防御性反序列化 — 处理未知字段和字段重命名
@JsonIgnoreProperties(ignoreUnknown = true)  // 忽略未知字段，避免反序列化异常
public class InventoryResponse {

    // 同时兼容旧字段名和新字段名
    @JsonAlias({"quantity", "availableQuantity"})
    private Integer availableQuantity;

    @JsonProperty("sku")
    private String sku;

    // 使用 Optional 表达可能缺失的新增字段
    @JsonProperty("warehouse")
    private String warehouse;  // v1.4 新增，v1.3 没有

    public int getAvailableQuantityOrDefault() {
        return availableQuantity != null ? availableQuantity : 0;
    }
}

// 对应的测试
class InventoryResponseDeserializationTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    @DisplayName("兼容 v1.3 响应格式 — quantity 字段")
    void deserialize_V13Format() throws Exception {
        String json = """
            {"sku": "SKU-001", "quantity": 50}
            """;

        InventoryResponse response = mapper.readValue(
            json, InventoryResponse.class);

        assertThat(response.getAvailableQuantityOrDefault()).isEqualTo(50);
    }

    @Test
    @DisplayName("兼容 v1.4 响应格式 — availableQuantity 字段")
    void deserialize_V14Format() throws Exception {
        String json = """
            {"sku": "SKU-001", "availableQuantity": 50,
             "warehouse": "华东仓"}
            """;

        InventoryResponse response = mapper.readValue(
            json, InventoryResponse.class);

        assertThat(response.getAvailableQuantityOrDefault()).isEqualTo(50);
        assertThat(response.getWarehouse()).isEqualTo("华东仓");
    }

    @Test
    @DisplayName("未知字段不导致反序列化失败")
    void deserialize_UnknownFields_NoError() throws Exception {
        String json = """
            {"sku": "SKU-001", "quantity": 50,
             "newFieldInV15": "some_value"}
            """;

        assertThatNoException().isThrownBy(() ->
            mapper.readValue(json, InventoryResponse.class));
    }
}
```

##### 挑战三：数据最终一致性

微服务中每个服务拥有独立数据库，跨服务数据不保证强一致性，而是通过事件驱动实现最终一致。

```
┌──────────────────────────────────────────────────────────────┐
│               最终一致性示例：下单流程                         │
│                                                              │
│   Order Service          Kafka           Inventory Service   │
│        │                   │                    │            │
│   1.创建订单(PENDING)      │                    │            │
│        │──── OrderCreated ─→│                    │            │
│        │                   │──── OrderCreated ──→│            │
│        │                   │                    │ 2.扣减库存  │
│        │                   │                    │            │
│        │                   │←─ StockDeducted ───│            │
│        │←─ StockDeducted ──│                    │            │
│   3.更新订单(CONFIRMED)    │                    │            │
│        │                   │                    │            │
│  ┌─────┴──────┐     ┌─────┴──────┐      ┌─────┴──────┐     │
│  │ 时间窗口内  │     │ 消息可能    │      │ 扣减可能    │     │
│  │ 订单状态为  │     │ 延迟/重复   │      │ 部分失败    │     │
│  │ PENDING    │     │ /乱序      │      │            │     │
│  └────────────┘     └────────────┘      └────────────┘     │
│                                                              │
│  测试必须覆盖：                                               │
│  - 正常流程：事件按序处理                                     │
│  - 消息重复：幂等性保证                                       │
│  - 消息乱序：StockDeducted 先于 OrderCreated 到达            │
│  - 处理失败：DLQ（死信队列）兜底                              │
│  - 超时：长时间未收到响应的补偿机制                           │
└──────────────────────────────────────────────────────────────┘
```

```java
// 测试事件驱动的最终一致性
@SpringBootTest
@EmbeddedKafka(partitions = 1,
    topics = {"order-events", "inventory-events"})
class OrderEventualConsistencyTest {

    @Autowired
    private KafkaTemplate<String, String> kafkaTemplate;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("正常流程 — 收到 StockDeducted 后订单变为 CONFIRMED")
    void happyPath_OrderConfirmedAfterStockDeducted() throws Exception {
        // 1. 创建 PENDING 订单
        Order order = orderRepository.save(
            Order.builder()
                .orderId("ORD-001")
                .status(OrderStatus.PENDING)
                .build());

        // 2. 模拟 Inventory Service 发出 StockDeducted 事件
        StockDeductedEvent event = new StockDeductedEvent(
            "ORD-001", true, Instant.now());
        kafkaTemplate.send("inventory-events",
            objectMapper.writeValueAsString(event));

        // 3. 等待异步处理完成（最终一致性需要等待）
        Awaitility.await()
            .atMost(Duration.ofSeconds(10))
            .pollInterval(Duration.ofMillis(500))
            .untilAsserted(() -> {
                Order updated = orderRepository
                    .findByOrderId("ORD-001").orElseThrow();
                assertThat(updated.getStatus())
                    .isEqualTo(OrderStatus.CONFIRMED);
            });
    }

    @Test
    @DisplayName("消息重复 — 幂等处理，订单状态不变")
    void duplicateEvent_IdempotentProcessing() throws Exception {
        Order order = orderRepository.save(
            Order.builder()
                .orderId("ORD-002")
                .status(OrderStatus.PENDING)
                .build());

        StockDeductedEvent event = new StockDeductedEvent(
            "ORD-002", true, Instant.now());
        String eventJson = objectMapper.writeValueAsString(event);

        // 发送同一事件 3 次
        kafkaTemplate.send("inventory-events", eventJson);
        kafkaTemplate.send("inventory-events", eventJson);
        kafkaTemplate.send("inventory-events", eventJson);

        Awaitility.await()
            .atMost(Duration.ofSeconds(10))
            .untilAsserted(() -> {
                Order updated = orderRepository
                    .findByOrderId("ORD-002").orElseThrow();
                assertThat(updated.getStatus())
                    .isEqualTo(OrderStatus.CONFIRMED);
                // 确认只处理了一次（通过审计日志或版本号验证）
                assertThat(updated.getVersion()).isEqualTo(1);
            });
    }

    @Test
    @DisplayName("库存不足 — 收到 StockFailed 后订单变为 CANCELLED")
    void stockInsufficient_OrderCancelled() throws Exception {
        Order order = orderRepository.save(
            Order.builder()
                .orderId("ORD-003")
                .status(OrderStatus.PENDING)
                .build());

        StockDeductedEvent event = new StockDeductedEvent(
            "ORD-003", false, Instant.now());  // success = false
        kafkaTemplate.send("inventory-events",
            objectMapper.writeValueAsString(event));

        Awaitility.await()
            .atMost(Duration.ofSeconds(10))
            .untilAsserted(() -> {
                Order updated = orderRepository
                    .findByOrderId("ORD-003").orElseThrow();
                assertThat(updated.getStatus())
                    .isEqualTo(OrderStatus.CANCELLED);
            });
    }
}
```

##### 挑战四：分布式事务

与单体应用的本地事务不同，微服务中的跨服务操作无法使用传统的 ACID 事务。常用的替代方案是 Saga 模式。

```
┌──────────────────────────────────────────────────────────────┐
│                    Saga 模式：下单流程                        │
│                                                              │
│  正向流程（所有步骤成功）：                                    │
│                                                              │
│  [创建订单] ──→ [扣减库存] ──→ [扣减余额] ──→ [发送通知]     │
│    Step 1         Step 2        Step 3        Step 4         │
│                                                              │
│  补偿流程（Step 3 失败）：                                    │
│                                                              │
│  [创建订单] ──→ [扣减库存] ──→ [扣减余额] ✗                  │
│                                      │                       │
│                                      ▼                       │
│                              [回滚库存] ←── [取消订单]       │
│                              Compensate    Compensate        │
│                               Step 2        Step 1           │
│                                                              │
│  测试要点：                                                   │
│  ① 正向流程所有步骤均成功完成                                 │
│  ② 任意步骤失败时，已完成的步骤正确补偿                       │
│  ③ 补偿操作本身的幂等性                                       │
│  ④ 补偿操作失败时的告警和人工介入机制                         │
└──────────────────────────────────────────────────────────────┘
```

```java
// Saga 编排器测试
@ExtendWith(MockitoExtension.class)
class CreateOrderSagaTest {

    @Mock private OrderService orderService;
    @Mock private InventoryService inventoryService;
    @Mock private PaymentService paymentService;
    @Mock private NotificationService notificationService;

    @InjectMocks
    private CreateOrderSaga saga;

    @Test
    @DisplayName("正向流程 — 所有步骤成功")
    void happyPath_AllStepsSucceed() {
        when(orderService.createPendingOrder(any()))
            .thenReturn(new OrderResult("ORD-001", true));
        when(inventoryService.deductStock(any()))
            .thenReturn(new InventoryResult(true));
        when(paymentService.charge(any()))
            .thenReturn(new PaymentResult("PAY-001", true));
        doNothing().when(notificationService).sendOrderConfirmation(any());

        SagaResult result = saga.execute(new CreateOrderCommand(
            "USER-001", List.of(new OrderItem("SKU-001", 2)),
            new BigDecimal("199.00")));

        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getOrderId()).isEqualTo("ORD-001");

        // 验证所有步骤按序执行
        InOrder inOrder = inOrder(
            orderService, inventoryService,
            paymentService, notificationService);
        inOrder.verify(orderService).createPendingOrder(any());
        inOrder.verify(inventoryService).deductStock(any());
        inOrder.verify(paymentService).charge(any());
        inOrder.verify(notificationService)
            .sendOrderConfirmation(any());
    }

    @Test
    @DisplayName("支付失败 — 触发库存回滚和订单取消")
    void paymentFails_CompensationTriggered() {
        when(orderService.createPendingOrder(any()))
            .thenReturn(new OrderResult("ORD-002", true));
        when(inventoryService.deductStock(any()))
            .thenReturn(new InventoryResult(true));
        when(paymentService.charge(any()))
            .thenReturn(new PaymentResult(null, false));  // 支付失败

        SagaResult result = saga.execute(new CreateOrderCommand(
            "USER-001", List.of(new OrderItem("SKU-001", 2)),
            new BigDecimal("199.00")));

        assertThat(result.isSuccess()).isFalse();
        assertThat(result.getFailureReason()).contains("支付失败");

        // 验证补偿操作被执行
        verify(inventoryService).restoreStock(any());  // 回滚库存
        verify(orderService).cancelOrder("ORD-002");   // 取消订单
        // 不应发送通知
        verify(notificationService, never())
            .sendOrderConfirmation(any());
    }

    @Test
    @DisplayName("库存扣减失败 — 只需取消订单，无需回滚支付")
    void inventoryFails_OnlyOrderCancelled() {
        when(orderService.createPendingOrder(any()))
            .thenReturn(new OrderResult("ORD-003", true));
        when(inventoryService.deductStock(any()))
            .thenReturn(new InventoryResult(false));  // 库存不足

        SagaResult result = saga.execute(new CreateOrderCommand(
            "USER-001", List.of(new OrderItem("SKU-001", 2)),
            new BigDecimal("199.00")));

        assertThat(result.isSuccess()).isFalse();

        // 仅补偿已完成的步骤（Step 1: 创建订单）
        verify(orderService).cancelOrder("ORD-003");
        // 支付和通知不应被调用
        verify(paymentService, never()).charge(any());
        verify(paymentService, never()).refund(any());
        verify(notificationService, never())
            .sendOrderConfirmation(any());
    }
}
```

##### 挑战五：服务发现与健康检查

微服务依赖服务发现机制来定位其他服务。测试必须覆盖服务注册、发现和健康检查的正确性。

```java
// 服务健康检查端点测试
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class HealthCheckTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    @DisplayName("健康检查 — 所有依赖就绪时返回 UP")
    void healthCheck_AllDependenciesUp() {
        ResponseEntity<Map> response = restTemplate
            .getForEntity("/actuator/health", Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().get("status")).isEqualTo("UP");
    }

    @Test
    @DisplayName("就绪检查 — 数据库连接正常")
    void readinessCheck_DatabaseConnected() {
        ResponseEntity<Map> response = restTemplate
            .getForEntity("/actuator/health/readiness", Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("存活检查 — 即使外部依赖不可用也返回 UP")
    void livenessCheck_IndependentOfDependencies() {
        // 存活检查不应因为下游服务不可用而报告 DOWN
        // 否则 Kubernetes 会不断重启 Pod
        ResponseEntity<Map> response = restTemplate
            .getForEntity("/actuator/health/liveness", Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }
}
```

---

#### 18.2.2 微服务测试金字塔 vs 测试蜂巢

在单体应用中，经典的测试金字塔（大量单元测试 + 适量集成测试 + 少量端到端测试）是公认的最佳实践。但微服务架构下，这一模型是否仍然适用？业界存在两种主要观点。

##### Sam Newman 的微服务测试金字塔

Sam Newman 在《Building Microservices》中对经典金字塔进行了微服务适配：

```
┌───────────────────────────────────────────────────────┐
│       Sam Newman 微服务测试金字塔                      │
│                                                       │
│                        /\                             │
│                       /  \                            │
│                      / E2E\        ← 端到端测试       │
│                     / Test  \        极少量            │
│                    /──────────\       (跨多服务)       │
│                   /  Contract  \   ← 契约测试          │
│                  /    Tests     \     中等数量          │
│                 /────────────────\    (服务间接口)      │
│                / Component Tests  \ ← 组件测试         │
│               /  (Service-Level)   \   较多             │
│              /──────────────────────\  (单个服务完整性)  │
│             /    Integration Tests    \ ← 集成测试      │
│            / (DB, Message Queue, etc)  \  较多          │
│           /──────────────────────────────\              │
│          /        Unit Tests              \ ← 单元测试  │
│         /   (Domain Logic, Pure Funcs)     \  大量       │
│        /────────────────────────────────────\           │
│                                                       │
│  从下到上：速度递减，信心递增，成本递增                 │
└───────────────────────────────────────────────────────┘
```

##### Spotify 的测试蜂巢（Testing Honeycomb）

Spotify 工程团队提出了不同看法：在微服务中，单个服务的业务逻辑通常很薄（很多只是CRUD + 转发），真正的复杂性在于服务间的集成。因此，测试重心应当从单元测试转移到集成测试。

```
┌───────────────────────────────────────────────────────┐
│       Spotify 测试蜂巢 (Testing Honeycomb)             │
│                                                       │
│           ┌──────────────────────────┐                │
│           │     Integrated Tests     │  ← 少量        │
│           │    (真实的端到端流程)      │    成本高      │
│           └───────────┬──────────────┘                │
│                       │                               │
│        ┌──────────────┴──────────────────┐            │
│       /                                    \          │
│      /     Integration Tests                \  ← 重点 │
│     /   (服务间交互、数据库、消息队列)        \   最多  │
│    /     这里是微服务 bug 最多的地方           \        │
│   /                                            \      │
│  └──────────────────┬───────────────────────────┘     │
│                     │                                 │
│          ┌──────────┴──────────────┐                  │
│          │    Implementation       │  ← 适量          │
│          │    Detail Tests         │    仅测有价值的   │
│          │   (纯逻辑单元测试)       │    业务逻辑      │
│          └─────────────────────────┘                  │
│                                                       │
│  核心思想：微服务的 bug 大多出现在边界                  │
│           而非内部逻辑                                 │
└───────────────────────────────────────────────────────┘
```

##### 两种模型的详细对比

| 维度 | 微服务测试金字塔 (Newman) | 测试蜂巢 (Spotify) |
|------|--------------------------|-------------------|
| **单元测试比重** | 高（底座最宽） | 低（底部窄） |
| **集成测试比重** | 中等 | **最高（中间最宽）** |
| **E2E 测试比重** | 极少 | 少 |
| **新增层级** | 契约测试 + 组件测试 | 无明确新层级 |
| **哲学** | 分层覆盖，各层各司其职 | 把资源集中在 bug 密度最高的边界 |
| **适合场景** | 服务内部逻辑复杂（如订单服务有复杂定价规则） | 服务内部逻辑简单（CRUD 为主），复杂性在集成 |
| **反对的做法** | 过多 E2E 测试（冰淇淋锥反模式） | 过多单元测试（测了很多 getter/setter，没测真正的边界） |
| **执行速度偏好** | 快速反馈优先（大量秒级测试） | 可靠反馈优先（宁可慢一点但更真实） |
| **提出者背景** | 咨询（ThoughtWorks / 多行业） | 产品公司（Spotify 内部实践） |
| **典型支持者** | Martin Fowler, Sam Newman | Spotify, Honeycomb.io |

##### 如何选择？

```
┌──────────────────────────────────────────────────────────┐
│                  选择决策流程                              │
│                                                          │
│  问题：你的微服务内部逻辑复杂度如何？                      │
│                                                          │
│  ┌─────────────────────────┐                             │
│  │ 服务内部有复杂业务规则？  │                             │
│  │ (定价引擎/风控/推荐算法)  │                             │
│  └──────┬─────────┬────────┘                             │
│     是  │         │ 否                                   │
│         ▼         ▼                                      │
│  ┌──────────┐ ┌──────────────────────────────┐           │
│  │ 测试金字塔│ │ 服务主要是 CRUD + 转发 +     │           │
│  │ (Newman) │ │ 事件编排？                    │           │
│  │          │ └──────┬─────────┬──────────────┘           │
│  │ 大量单元  │    是  │         │ 否（混合型）             │
│  │ 测试覆盖  │        ▼         ▼                         │
│  │ 业务规则  │ ┌──────────┐ ┌──────────────┐             │
│  └──────────┘ │ 测试蜂巢  │ │ 混合策略：    │             │
│               │ (Spotify)│ │ 复杂模块→金字塔│             │
│               │          │ │ 简单模块→蜂巢  │             │
│               │ 集成测试  │ └──────────────┘             │
│               │ 占大头    │                               │
│               └──────────┘                               │
│                                                          │
│  实践建议：大多数团队采用混合策略。                         │
│  不必教条式地遵循某一模型，                                │
│  关键是将测试资源分配到 bug 最可能出现的地方。             │
└──────────────────────────────────────────────────────────┘
```

---

#### 18.2.3 Service Component Test（组件测试）

组件测试是微服务测试中最具价值的一层。它验证单个微服务作为一个整体的行为——从 HTTP 入口到数据库交互——同时将外部依赖（其他微服务、第三方 API）替换为 Mock 或 Stub。

```
┌──────────────────────────────────────────────────────────────┐
│                  组件测试的测试边界                            │
│                                                              │
│  ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐    │
│  │         组件测试边界 (System Under Test)             │    │
│  │                                                      │    │
│  │  ┌──────────┐   ┌──────────┐   ┌──────────────┐    │    │
│  │  │Controller│──→│ Service  │──→│  Repository  │    │    │
│  │  └──────────┘   └────┬─────┘   └──────┬───────┘    │    │
│  │                      │                 │            │    │
│  │                      │                 ▼            │    │
│  │                      │          ┌────────────┐     │    │
│  │                      │          │  真实数据库  │     │    │
│  │                      │          │(Testcontainer)│   │    │
│  │                      │          └────────────┘     │    │
│  │                      ▼                              │    │
│  │               ┌──────────────┐                     │    │
│  │               │ 外部服务 Stub │ ← WireMock          │    │
│  │               │ (Inventory)  │                     │    │
│  │               └──────────────┘                     │    │
│  │                                                      │    │
│  └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘    │
│                                                              │
│  真实的部分：Controller → Service → Repository → Database    │
│  Mock 的部分：其他微服务、外部 API                            │
│  目标：验证本服务从请求到数据库的完整链路是否正确              │
└──────────────────────────────────────────────────────────────┘
```

##### 定义与范围

组件测试的核心特征：

| 特征 | 说明 |
|------|------|
| **测试粒度** | 单个微服务（一个可部署单元） |
| **入口** | HTTP 请求（通过 MockMvc 或真实端口） |
| **内部组件** | 全部真实（Controller、Service、Repository） |
| **数据库** | 真实的（Testcontainers 或嵌入式） |
| **外部服务** | Mock（WireMock、MockServer 等） |
| **消息队列** | 嵌入式（EmbeddedKafka、内存 RabbitMQ） |
| **启动方式** | `@SpringBootTest` 完整加载上下文 |
| **执行时间** | 10-30 秒/测试类（含容器启动） |

##### Spring Boot 完整组件测试示例

以下是一个完整的订单服务组件测试。该服务接收 HTTP 请求，查询本地数据库，调用 Inventory Service（外部微服务）确认库存，最终创建订单。

```java
// ========================================
// 基础配置：可复用的测试基类
// ========================================
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@ActiveProfiles("test")
@AutoConfigureWireMock(port = 0)  // 随机端口启动 WireMock
abstract class ComponentTestBase {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(
            "postgres:16-alpine")
        .withDatabaseName("order_service_test")
        .withUsername("test")
        .withPassword("test");

    @Container
    static KafkaContainer kafka = new KafkaContainer(
        DockerImageName.parse("confluentinc/cp-kafka:7.5.0"));

    @DynamicPropertySource
    static void overrideProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.kafka.bootstrap-servers",
            kafka::getBootstrapServers);
        // 将外部服务指向 WireMock
        registry.add("services.inventory.base-url",
            () -> "http://localhost:${wiremock.server.port}");
    }

    @Autowired
    protected TestRestTemplate restTemplate;

    @Autowired
    protected OrderRepository orderRepository;

    @BeforeEach
    void cleanUp() {
        orderRepository.deleteAll();
        WireMock.reset();
    }
}
```

```java
// ========================================
// OrderComponentTest.java — 完整组件测试
// ========================================
class OrderComponentTest extends ComponentTestBase {

    @Test
    @DisplayName("完整下单流程 — 库存充足时创建订单")
    void createOrder_InventoryAvailable_OrderCreated() {
        // 1. Stub 外部 Inventory Service 返回有库存
        stubFor(post(urlPathEqualTo("/api/inventory/reserve"))
            .withRequestBody(matchingJsonPath("$.sku", equalTo("SKU-001")))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("""
                    {
                        "reservationId": "RES-001",
                        "sku": "SKU-001",
                        "quantity": 2,
                        "reserved": true
                    }
                    """)));

        // 2. 发送真实的 HTTP 请求
        CreateOrderRequest request = new CreateOrderRequest(
            "USER-001",
            List.of(new OrderItemRequest("SKU-001", 2, new BigDecimal("99.00"))),
            "标准配送"
        );

        ResponseEntity<OrderResponse> response = restTemplate.postForEntity(
            "/api/v1/orders", request, OrderResponse.class);

        // 3. 验证 HTTP 响应
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getStatus()).isEqualTo("PENDING");
        assertThat(response.getBody().getTotalAmount())
            .isEqualByComparingTo(new BigDecimal("198.00"));

        // 4. 验证数据库状态（真实数据库）
        List<Order> orders = orderRepository.findByUserId("USER-001");
        assertThat(orders).hasSize(1);
        assertThat(orders.get(0).getStatus()).isEqualTo(OrderStatus.PENDING);
        assertThat(orders.get(0).getItems()).hasSize(1);

        // 5. 验证对外部服务的调用
        verify(postRequestedFor(urlPathEqualTo("/api/inventory/reserve"))
            .withRequestBody(matchingJsonPath("$.quantity", equalTo("2"))));
    }

    @Test
    @DisplayName("下单时库存不足 — 返回 409 且不创建订单")
    void createOrder_InventoryInsufficient_Returns409() {
        // Stub: 库存不足
        stubFor(post(urlPathEqualTo("/api/inventory/reserve"))
            .willReturn(aResponse()
                .withStatus(200)
                .withBody("""
                    {
                        "reservationId": null,
                        "sku": "SKU-001",
                        "quantity": 100,
                        "reserved": false,
                        "reason": "库存不足，当前库存: 5"
                    }
                    """)));

        CreateOrderRequest request = new CreateOrderRequest(
            "USER-001",
            List.of(new OrderItemRequest("SKU-001", 100,
                new BigDecimal("99.00"))),
            "标准配送"
        );

        ResponseEntity<ErrorResponse> response = restTemplate.postForEntity(
            "/api/v1/orders", request, ErrorResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody().getMessage()).contains("库存不足");

        // 数据库中不应有订单
        assertThat(orderRepository.findByUserId("USER-001")).isEmpty();
    }

    @Test
    @DisplayName("Inventory Service 不可用 — 返回 503 + 降级信息")
    void createOrder_InventoryServiceDown_Returns503() {
        // Stub: Inventory Service 超时
        stubFor(post(urlPathEqualTo("/api/inventory/reserve"))
            .willReturn(aResponse()
                .withFixedDelay(10000)  // 10 秒延迟
                .withStatus(200)));

        CreateOrderRequest request = new CreateOrderRequest(
            "USER-001",
            List.of(new OrderItemRequest("SKU-001", 1,
                new BigDecimal("99.00"))),
            "标准配送"
        );

        ResponseEntity<ErrorResponse> response = restTemplate.postForEntity(
            "/api/v1/orders", request, ErrorResponse.class);

        assertThat(response.getStatusCode())
            .isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
    }

    @Test
    @DisplayName("查询订单详情 — 返回完整订单信息")
    void getOrder_Exists_ReturnsFullDetails() {
        // 先在数据库中插入一条订单
        Order order = Order.builder()
            .orderId("ORD-TEST-001")
            .userId("USER-001")
            .status(OrderStatus.CONFIRMED)
            .totalAmount(new BigDecimal("198.00"))
            .items(List.of(OrderItem.builder()
                .sku("SKU-001")
                .quantity(2)
                .unitPrice(new BigDecimal("99.00"))
                .build()))
            .build();
        orderRepository.save(order);

        // 发送 GET 请求
        ResponseEntity<OrderResponse> response = restTemplate.getForEntity(
            "/api/v1/orders/ORD-TEST-001", OrderResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getOrderId()).isEqualTo("ORD-TEST-001");
        assertThat(response.getBody().getItems()).hasSize(1);
    }

    @Test
    @DisplayName("查询不存在的订单 — 返回 404")
    void getOrder_NotFound_Returns404() {
        ResponseEntity<ErrorResponse> response = restTemplate.getForEntity(
            "/api/v1/orders/NON-EXISTENT", ErrorResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    @DisplayName("请求体校验 — 缺少必填字段返回 400")
    void createOrder_InvalidRequest_Returns400() {
        // userId 为空
        String invalidRequest = """
            {
                "userId": "",
                "items": [],
                "shippingMethod": "标准配送"
            }
            """;

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<String> entity = new HttpEntity<>(invalidRequest, headers);

        ResponseEntity<ErrorResponse> response = restTemplate.postForEntity(
            "/api/v1/orders", entity, ErrorResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }
}
```

##### Node.js 完整组件测试示例

```javascript
// ========================================
// order-service.component.test.js
// 使用 Jest + Supertest + Testcontainers + Nock
// ========================================
const { GenericContainer } = require('testcontainers');
const { Client } = require('pg');
const request = require('supertest');
const nock = require('nock');
const { createApp } = require('../src/app');

describe('Order Service — 组件测试', () => {
    let postgresContainer;
    let pgClient;
    let app;

    // 启动 PostgreSQL 容器（整个测试套件只启动一次）
    beforeAll(async () => {
        postgresContainer = await new GenericContainer('postgres:16-alpine')
            .withEnvironment({
                POSTGRES_DB: 'order_test',
                POSTGRES_USER: 'test',
                POSTGRES_PASSWORD: 'test',
            })
            .withExposedPorts(5432)
            .start();

        const dbConfig = {
            host: postgresContainer.getHost(),
            port: postgresContainer.getMappedPort(5432),
            database: 'order_test',
            user: 'test',
            password: 'test',
        };

        // 运行数据库迁移
        pgClient = new Client(dbConfig);
        await pgClient.connect();
        await runMigrations(pgClient);

        // 创建 Express 应用，注入真实数据库配置
        app = createApp({
            database: dbConfig,
            inventoryServiceUrl: 'http://inventory-service.mock',
        });
    }, 60000);  // 容器启动可能需要较长时间

    afterAll(async () => {
        await pgClient.end();
        await postgresContainer.stop();
    });

    beforeEach(async () => {
        // 清理测试数据
        await pgClient.query('DELETE FROM order_items');
        await pgClient.query('DELETE FROM orders');
        // 清理所有 HTTP Mock
        nock.cleanAll();
    });

    describe('POST /api/v1/orders', () => {
        it('库存充足时成功创建订单', async () => {
            // Mock Inventory Service
            nock('http://inventory-service.mock')
                .post('/api/inventory/reserve')
                .reply(200, {
                    reservationId: 'RES-001',
                    sku: 'SKU-001',
                    quantity: 2,
                    reserved: true,
                });

            const response = await request(app)
                .post('/api/v1/orders')
                .send({
                    userId: 'USER-001',
                    items: [
                        { sku: 'SKU-001', quantity: 2, unitPrice: 99.00 },
                    ],
                    shippingMethod: '标准配送',
                })
                .expect(201);

            // 验证响应
            expect(response.body.orderId).toBeDefined();
            expect(response.body.status).toBe('PENDING');
            expect(response.body.totalAmount).toBe(198.00);

            // 验证数据库
            const dbResult = await pgClient.query(
                'SELECT * FROM orders WHERE user_id = $1',
                ['USER-001']
            );
            expect(dbResult.rows).toHaveLength(1);
            expect(dbResult.rows[0].status).toBe('PENDING');
        });

        it('库存不足时返回 409', async () => {
            nock('http://inventory-service.mock')
                .post('/api/inventory/reserve')
                .reply(200, {
                    reserved: false,
                    reason: '库存不足，当前库存: 5',
                });

            await request(app)
                .post('/api/v1/orders')
                .send({
                    userId: 'USER-001',
                    items: [
                        { sku: 'SKU-001', quantity: 100, unitPrice: 99.00 },
                    ],
                    shippingMethod: '标准配送',
                })
                .expect(409);

            // 数据库中不应有订单
            const dbResult = await pgClient.query(
                'SELECT * FROM orders WHERE user_id = $1',
                ['USER-001']
            );
            expect(dbResult.rows).toHaveLength(0);
        });

        it('Inventory Service 返回 500 — 服务降级', async () => {
            nock('http://inventory-service.mock')
                .post('/api/inventory/reserve')
                .reply(500, { error: 'Internal Server Error' });

            const response = await request(app)
                .post('/api/v1/orders')
                .send({
                    userId: 'USER-001',
                    items: [
                        { sku: 'SKU-001', quantity: 1, unitPrice: 99.00 },
                    ],
                    shippingMethod: '标准配送',
                })
                .expect(503);

            expect(response.body.message).toContain('库存服务暂不可用');
        });

        it('请求体缺少必填字段 — 返回 400', async () => {
            const response = await request(app)
                .post('/api/v1/orders')
                .send({ userId: '' })  // 缺少 items
                .expect(400);

            expect(response.body.errors).toBeDefined();
            expect(response.body.errors.length).toBeGreaterThan(0);
        });
    });

    describe('GET /api/v1/orders/:orderId', () => {
        it('订单存在时返回详情', async () => {
            // 先插入测试数据
            await pgClient.query(
                `INSERT INTO orders (order_id, user_id, status, total_amount)
                 VALUES ($1, $2, $3, $4)`,
                ['ORD-001', 'USER-001', 'CONFIRMED', 198.00]
            );
            await pgClient.query(
                `INSERT INTO order_items (order_id, sku, quantity, unit_price)
                 VALUES ($1, $2, $3, $4)`,
                ['ORD-001', 'SKU-001', 2, 99.00]
            );

            const response = await request(app)
                .get('/api/v1/orders/ORD-001')
                .expect(200);

            expect(response.body.orderId).toBe('ORD-001');
            expect(response.body.status).toBe('CONFIRMED');
            expect(response.body.items).toHaveLength(1);
            expect(response.body.items[0].sku).toBe('SKU-001');
        });

        it('订单不存在时返回 404', async () => {
            await request(app)
                .get('/api/v1/orders/NON-EXISTENT')
                .expect(404);
        });
    });
});

// 辅助函数：运行数据库迁移
async function runMigrations(client) {
    await client.query(`
        CREATE TABLE IF NOT EXISTS orders (
            id SERIAL PRIMARY KEY,
            order_id VARCHAR(50) UNIQUE NOT NULL,
            user_id VARCHAR(50) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
            total_amount DECIMAL(10, 2) NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS order_items (
            id SERIAL PRIMARY KEY,
            order_id VARCHAR(50) REFERENCES orders(order_id),
            sku VARCHAR(50) NOT NULL,
            quantity INT NOT NULL,
            unit_price DECIMAL(10, 2) NOT NULL
        );
    `);
}
```

##### Mock vs 真实依赖决策树

何时使用 Mock，何时使用真实依赖，是组件测试中最关键的设计决策。

```
┌──────────────────────────────────────────────────────────────┐
│            组件测试中的 Mock vs 真实依赖 决策树               │
│                                                              │
│  ┌────────────────────────────────────────────┐              │
│  │ 这个依赖是本服务拥有的吗？                   │              │
│  └─────────┬──────────────────────┬───────────┘              │
│       是   │                      │ 否                       │
│            ▼                      ▼                          │
│  ┌──────────────────┐   ┌──────────────────────────┐        │
│  │ 使用真实依赖       │   │ 这是另一个微服务吗？      │        │
│  │                   │   └────┬──────────────┬──────┘        │
│  │ 例：               │   是  │              │ 否            │
│  │ • 本服务的数据库    │       ▼              ▼              │
│  │   (Testcontainers)│ ┌──────────┐  ┌────────────────┐    │
│  │ • 本服务的缓存     │ │ 使用 Mock │  │ 这是第三方 API？│    │
│  │   (嵌入式 Redis)  │ │ (WireMock)│  └───┬──────┬─────┘    │
│  │ • 本服务的消息     │ │          │  是  │      │ 否       │
│  │   队列 (嵌入式    │ │ 例：      │      ▼      ▼          │
│  │   Kafka)          │ │ •Inventory│ ┌────────┐┌─────────┐ │
│  └──────────────────┘ │  Service  │ │使用 Mock││使用真实  │ │
│                       │ •Payment  │ │(Sandbox ││依赖     │ │
│                       │  Service  │ │ 或 Stub)││         │ │
│                       │ •User     │ │        ││例：      │ │
│                       │  Service  │ │例：     ││•文件系统 │ │
│                       └──────────┘ │•Stripe  ││•时钟     │ │
│                                    │•Twilio  ││         │ │
│                                    └────────┘└─────────┘ │
│                                                            │
│  ═══════════════════════════════════════════════════════    │
│  总结：                                                     │
│  ┌─────────────────────────┬──────────────────────────┐    │
│  │      使用真实依赖        │       使用 Mock           │    │
│  ├─────────────────────────┼──────────────────────────┤    │
│  │ 本服务拥有的数据库       │ 其他微服务                │    │
│  │ 本服务的消息队列         │ 第三方付费 API            │    │
│  │ 本服务的缓存(Redis)      │ 不确定/不稳定的外部系统  │    │
│  │ 文件系统操作             │ 需要模拟异常场景的依赖    │    │
│  └─────────────────────────┴──────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

##### In-Process vs Out-of-Process 组件测试

组件测试有两种执行模式，适用于不同场景：

| 维度 | In-Process（进程内） | Out-of-Process（进程外） |
|------|---------------------|------------------------|
| **启动方式** | `@SpringBootTest` 嵌入测试 JVM | 启动真实的 Docker 容器 |
| **HTTP 访问** | `MockMvc` 或 `TestRestTemplate` | 真实 HTTP 客户端 |
| **测试速度** | 较快（共享 JVM） | 较慢（容器启动） |
| **真实度** | 高（但跳过了网络栈的一部分） | 最高（与生产完全一致） |
| **调试** | 容易（可打断点） | 较难（需要看容器日志） |
| **适用场景** | 日常开发、CI 快速反馈 | 发布前验证、复杂网络场景 |
| **示例工具** | Spring Boot Test, Jest + supertest | Docker Compose, Testcontainers (compose模式) |

**In-Process 示例**（前文的 Spring Boot 和 Node.js 示例均为此模式）。

**Out-of-Process 示例**——使用 Docker Compose 启动整个服务：

```yaml
# docker-compose.test.yml — 组件测试环境
version: '3.8'
services:
  # 被测服务
  order-service:
    build: .
    ports:
      - "8080:8080"
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/order_test
      SPRING_DATASOURCE_USERNAME: test
      SPRING_DATASOURCE_PASSWORD: test
      SERVICES_INVENTORY_BASE_URL: http://wiremock:8080
    depends_on:
      postgres:
        condition: service_healthy

  # 真实数据库
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: order_test
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U test"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Mock 外部服务
  wiremock:
    image: wiremock/wiremock:3.3.1
    ports:
      - "8081:8080"
    volumes:
      - ./wiremock-stubs:/home/wiremock/mappings
```

```bash
# 运行 Out-of-Process 组件测试的典型流程
#!/bin/bash

# 1. 启动测试环境
docker-compose -f docker-compose.test.yml up -d

# 2. 等待服务就绪
until curl -sf http://localhost:8080/actuator/health; do
    echo "等待 Order Service 启动..."
    sleep 2
done

# 3. 运行测试（使用真实 HTTP 请求）
npm run test:component -- --baseUrl=http://localhost:8080

# 4. 清理
docker-compose -f docker-compose.test.yml down -v
```

```javascript
// out-of-process-component.test.js
// 测试代码通过真实 HTTP 请求访问容器中的服务
const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

describe('Order Service — Out-of-Process 组件测试', () => {

    it('健康检查通过', async () => {
        const response = await axios.get(`${BASE_URL}/actuator/health`);
        expect(response.status).toBe(200);
        expect(response.data.status).toBe('UP');
    });

    it('创建订单完整流程', async () => {
        // 此时 WireMock 已通过文件配置好了 Stub
        const response = await axios.post(`${BASE_URL}/api/v1/orders`, {
            userId: 'USER-001',
            items: [{ sku: 'SKU-001', quantity: 1, unitPrice: 99.00 }],
            shippingMethod: '标准配送',
        });

        expect(response.status).toBe(201);
        expect(response.data.status).toBe('PENDING');

        // 验证可以查询到刚创建的订单
        const orderId = response.data.orderId;
        const getResponse = await axios.get(
            `${BASE_URL}/api/v1/orders/${orderId}`);
        expect(getResponse.status).toBe(200);
        expect(getResponse.data.orderId).toBe(orderId);
    });
});
```

### 18.2.4 契约测试（Consumer-Driven Contract）

```
┌──────────────────────────────────────────────────────────────────────┐
│                    契约测试工作流程                                    │
│                                                                      │
│  Consumer（消费者）              Provider（提供者）                   │
│  ┌──────────────────┐           ┌──────────────────┐                │
│  │  Order Service    │           │  User Service     │               │
│  │  (调用用户服务)   │           │  (被调用方)       │                │
│  └────────┬─────────┘           └────────┬─────────┘                │
│           │                              │                           │
│           │  1. Consumer 编写             │                          │
│           │     Pact 契约文件             │                          │
│           ▼                              │                           │
│  ┌──────────────────┐                    │                          │
│  │  Pact 契约文件    │ ── 2. 共享 ──→    │                          │
│  │  (JSON格式)       │     (Pact Broker) │                          │
│  └──────────────────┘                    ▼                          │
│                              ┌──────────────────┐                   │
│                              │ 3. Provider 验证  │                  │
│                              │    契约是否满足   │                   │
│                              └──────────────────┘                   │
│                                                                      │
│  核心思想：                                                          │
│  · Consumer 定义 "我期望你返回什么"                                  │
│  · Provider 验证 "我确实能返回这个"                                  │
│  · 不需要同时运行两个服务                                            │
│  · 契约变更会立即暴露兼容性问题                                      │
└──────────────────────────────────────────────────────────────────────┘
```

```java
/**
 * Consumer 端：Order Service 定义对 User Service 的期望
 */
@ExtendWith(PactConsumerTestExt.class)
@PactTestFor(providerName = "UserService", port = "8081")
class OrderServicePactConsumerTest {

    @Pact(consumer = "OrderService", provider = "UserService")
    V4Pact 获取用户信息的契约(PactDslWithProvider builder) {
        return builder
            .given("用户 ID=1 存在")
            .uponReceiving("获取用户 1 的请求")
                .path("/api/users/1")
                .method("GET")
                .headers("Accept", "application/json")
            .willRespondWith()
                .status(200)
                .headers(Map.of("Content-Type", "application/json"))
                .body(new PactDslJsonBody()
                    .integerType("id", 1)
                    .stringType("username", "zhangsan")
                    .stringMatcher("email", ".*@.*\\..*", "zhang@example.com")
                    .stringType("status", "ACTIVE")
                )
            .toPact(V4Pact.class);
    }

    @Pact(consumer = "OrderService", provider = "UserService")
    V4Pact 用户不存在的契约(PactDslWithProvider builder) {
        return builder
            .given("用户 ID=999 不存在")
            .uponReceiving("获取不存在的用户")
                .path("/api/users/999")
                .method("GET")
            .willRespondWith()
                .status(404)
                .body(new PactDslJsonBody()
                    .stringType("error", "用户不存在")
                )
            .toPact(V4Pact.class);
    }

    @Test
    @PactTestFor(pactMethod = "获取用户信息的契约")
    void 验证获取用户成功(MockServer mockServer) {
        // 使用真实的 HTTP 客户端调用 Mock Server
        UserServiceClient client = new UserServiceClient(mockServer.getUrl());
        UserDTO user = client.getUser(1L);

        assertThat(user.getId()).isEqualTo(1L);
        assertThat(user.getUsername()).isEqualTo("zhangsan");
        assertThat(user.getStatus()).isEqualTo("ACTIVE");
    }

    @Test
    @PactTestFor(pactMethod = "用户不存在的契约")
    void 验证用户不存在场景(MockServer mockServer) {
        UserServiceClient client = new UserServiceClient(mockServer.getUrl());

        assertThrows(UserNotFoundException.class,
            () -> client.getUser(999L));
    }
}

/**
 * Provider 端：User Service 验证自己满足契约
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Provider("UserService")
@PactBroker(url = "https://pact-broker.example.com")
class UserServicePactProviderTest {

    @Autowired
    private UserRepository userRepository;

    @TestTemplate
    @ExtendWith(PactVerificationInvocationContextProvider.class)
    void 验证所有契约(PactVerificationContext context) {
        context.verifyInteraction();
    }

    @State("用户 ID=1 存在")
    void 准备用户1() {
        User user = UserBuilder.aUser()
            .withId(1L)
            .withUsername("zhangsan")
            .withEmail("zhang@example.com")
            .build();
        userRepository.save(user);
    }

    @State("用户 ID=999 不存在")
    void 确保用户999不存在() {
        userRepository.deleteById(999L);
    }
}
```

---

## 18.3 Serverless/FaaS 测试

Serverless 架构（如 AWS Lambda、Google Cloud Functions）的"无服务器"特性给测试带来了独特挑战。

### 18.3.1 Serverless 测试挑战

```
┌────────────────────────────────────────────────────────────────┐
│                Serverless 特有的测试挑战                        │
│                                                                │
│  1. 冷启动（Cold Start）                                      │
│     · 函数首次调用或长时间未调用后有延迟                       │
│     · 冷启动时间可能从 100ms 到 10s 不等                      │
│     · 测试必须区分冷启动 vs 热启动的性能                      │
│                                                                │
│  2. 事件驱动                                                   │
│     · 函数由事件触发（HTTP、SQS、S3、DynamoDB Stream...）     │
│     · 每种事件源的数据格式不同                                 │
│     · 需要模拟各种事件格式                                     │
│                                                                │
│  3. 执行限制                                                   │
│     · 内存限制（128MB - 10GB）                                │
│     · 执行时间限制（Lambda 最长 15 分钟）                     │
│     · 并发限制                                                 │
│                                                                │
│  4. 本地环境与云端差异                                         │
│     · IAM 权限在本地无法完全模拟                               │
│     · VPC 网络配置影响性能                                     │
│     · 云服务 SDK 行为可能不同                                  │
│                                                                │
│  5. 状态管理                                                   │
│     · 函数本身是无状态的                                       │
│     · 状态存在外部服务（DynamoDB、S3、Redis）                  │
│     · 测试需要 setup/teardown 外部状态                         │
└────────────────────────────────────────────────────────────────┘
```

### 18.3.2 AWS Lambda 本地测试

```python
"""
AWS Lambda 函数示例及测试
"""
import json
import boto3
from datetime import datetime


# ========== Lambda Handler ==========

def order_handler(event, context):
    """
    处理订单创建的 Lambda 函数
    触发源：API Gateway (HTTP POST /orders)
    """
    try:
        # 解析请求体
        body = json.loads(event.get('body', '{}'))
        user_id = body.get('userId')
        items = body.get('items', [])

        if not user_id or not items:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': '缺少必填参数'})
            }

        # 业务逻辑
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table('Orders')

        order = {
            'orderId': f"ORD-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            'userId': user_id,
            'items': items,
            'status': 'CREATED',
            'createdAt': datetime.now().isoformat(),
        }

        table.put_item(Item=order)

        return {
            'statusCode': 201,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps(order)
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }


# ========== 单元测试 ==========

class TestOrderHandler:
    """Lambda 函数单元测试"""

    def test_成功创建订单(self, mocker):
        # Mock DynamoDB
        mock_table = mocker.MagicMock()
        mock_dynamodb = mocker.MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mocker.patch('boto3.resource', return_value=mock_dynamodb)

        # 构造 API Gateway 事件
        event = {
            'httpMethod': 'POST',
            'path': '/orders',
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'userId': 'user_001',
                'items': [
                    {'productId': 'PROD-001', 'quantity': 2, 'price': 99.0}
                ]
            }),
            'requestContext': {
                'stage': 'test',
                'requestId': 'test-request-id',
            }
        }

        # 构造 Lambda Context
        context = type('Context', (), {
            'function_name': 'order-handler',
            'memory_limit_in_mb': 256,
            'invoked_function_arn': 'arn:aws:lambda:ap-southeast-2:123:function:order-handler',
            'get_remaining_time_in_millis': lambda self: 30000,
        })()

        # 执行
        result = order_handler(event, context)

        # 验证
        assert result['statusCode'] == 201
        body = json.loads(result['body'])
        assert body['userId'] == 'user_001'
        assert body['status'] == 'CREATED'
        assert len(body['items']) == 1

        # 验证 DynamoDB 调用
        mock_table.put_item.assert_called_once()

    def test_缺少参数_返回400(self):
        event = {
            'body': json.dumps({})  # 空请求体
        }
        context = mocker.MagicMock()

        result = order_handler(event, context)

        assert result['statusCode'] == 400
        body = json.loads(result['body'])
        assert '缺少必填参数' in body['error']


# ========== SAM Local 集成测试 ==========
"""
使用 AWS SAM CLI 进行本地集成测试:

# 启动本地 API
$ sam local start-api --template template.yaml

# 调用单个函数
$ sam local invoke OrderFunction --event events/create_order.json

# 使用 Docker 网络连接本地 DynamoDB
$ docker run -d --name dynamodb-local -p 8000:8000 amazon/dynamodb-local
$ sam local invoke OrderFunction \
    --event events/create_order.json \
    --docker-network host \
    --env-vars env.json
"""
```

### 18.3.3 事件格式模板

```typescript
/**
 * 各种 AWS 事件源的测试事件模板
 */

// API Gateway 事件
const apiGatewayEvent = {
  httpMethod: 'POST',
  path: '/orders',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer test-token',
  },
  queryStringParameters: { page: '1', size: '10' },
  pathParameters: { id: '123' },
  body: JSON.stringify({ userId: 'user_001' }),
  isBase64Encoded: false,
  requestContext: {
    stage: 'test',
    requestId: 'test-id',
    identity: { sourceIp: '127.0.0.1' },
  },
};

// SQS 事件
const sqsEvent = {
  Records: [
    {
      messageId: 'msg-001',
      receiptHandle: 'handle-001',
      body: JSON.stringify({
        orderId: 'ORD-001',
        action: 'PROCESS_PAYMENT',
      }),
      attributes: {
        ApproximateReceiveCount: '1',
        SentTimestamp: '1634567890000',
      },
      messageAttributes: {},
      md5OfBody: 'abc123',
      eventSource: 'aws:sqs',
      eventSourceARN: 'arn:aws:sqs:ap-southeast-2:123:order-queue',
      awsRegion: 'ap-southeast-2',
    },
  ],
};

// S3 事件（文件上传触发）
const s3Event = {
  Records: [
    {
      eventVersion: '2.1',
      eventSource: 'aws:s3',
      eventName: 'ObjectCreated:Put',
      s3: {
        bucket: { name: 'meal-photos' },
        object: {
          key: 'uploads/user_001/photo_001.jpg',
          size: 1024000,
        },
      },
    },
  ],
};

// DynamoDB Stream 事件
const dynamoDBEvent = {
  Records: [
    {
      eventID: '1',
      eventName: 'INSERT',
      dynamodb: {
        Keys: { orderId: { S: 'ORD-001' } },
        NewImage: {
          orderId: { S: 'ORD-001' },
          userId: { S: 'user_001' },
          status: { S: 'CREATED' },
        },
        StreamViewType: 'NEW_AND_OLD_IMAGES',
      },
    },
  ],
};
```

---

## 18.4 事件驱动架构测试

事件驱动架构（EDA）以消息/事件作为服务间通信的核心机制，其异步特性给测试带来了显著挑战。

### 18.4.1 事件驱动架构概览

```
┌────────────────────────────────────────────────────────────────────┐
│                   事件驱动架构的测试维度                             │
│                                                                    │
│  Producer               Broker              Consumer               │
│  (生产者)               (消息代理)          (消费者)                │
│  ┌──────────┐       ┌──────────┐       ┌──────────┐              │
│  │ Order    │──────▶│ Kafka /  │──────▶│ Payment  │              │
│  │ Service  │  事件  │ RabbitMQ │  事件  │ Service  │              │
│  └──────────┘       │ / SQS    │       └──────────┘              │
│                     └──────────┘       ┌──────────┐              │
│                          │────────────▶│ Inventory│              │
│                          │             │ Service  │              │
│                          │             └──────────┘              │
│                          │────────────▶┌──────────┐              │
│                                        │ Notify   │              │
│                                        │ Service  │              │
│                                        └──────────┘              │
│                                                                    │
│  测试维度:                                                         │
│  ① 生产者测试: 事件格式正确、事件在正确时机发出                    │
│  ② 消费者测试: 正确处理事件、幂等性、错误处理                      │
│  ③ 端到端测试: 事件从生产到消费的完整流程                          │
│  ④ 最终一致性测试: 异步处理后数据最终一致                          │
│  ⑤ 顺序性测试: 事件处理顺序是否影响结果                           │
└────────────────────────────────────────────────────────────────────┘
```

### 18.4.2 Kafka 生产者测试

```java
/**
 * Kafka 生产者测试
 */
@SpringBootTest
@EmbeddedKafka(
    partitions = 1,
    topics = {"order-events"},
    brokerProperties = {"listeners=PLAINTEXT://localhost:9092"}
)
class OrderEventProducerTest {

    @Autowired
    private OrderEventProducer producer;

    @Autowired
    private EmbeddedKafkaBroker embeddedKafka;

    private Consumer<String, String> consumer;

    @BeforeEach
    void setupConsumer() {
        Map<String, Object> configs = new HashMap<>(
            KafkaTestUtils.consumerProps("test-group", "true", embeddedKafka)
        );
        configs.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        ConsumerFactory<String, String> cf = new DefaultKafkaConsumerFactory<>(configs);
        consumer = cf.createConsumer();
        embeddedKafka.consumeFromAllEmbeddedTopics(consumer);
    }

    @AfterEach
    void teardown() {
        consumer.close();
    }

    @Test
    void 订单创建后应发送OrderCreated事件() {
        // Arrange
        Order order = OrderBuilder.anOrder()
            .withId(1L)
            .withBuyer(UserBuilder.aUser().withId(100L).build())
            .build();

        // Act
        producer.sendOrderCreatedEvent(order);

        // Assert: 从 Kafka 读取消息验证
        ConsumerRecord<String, String> record =
            KafkaTestUtils.getSingleRecord(consumer, "order-events", 5000);

        assertThat(record.key()).isEqualTo("order-1");

        OrderCreatedEvent event = objectMapper.readValue(
            record.value(), OrderCreatedEvent.class
        );
        assertThat(event.getOrderId()).isEqualTo(1L);
        assertThat(event.getUserId()).isEqualTo(100L);
        assertThat(event.getEventType()).isEqualTo("ORDER_CREATED");
        assertThat(event.getTimestamp()).isNotNull();
    }

    @Test
    void 事件应包含所有必要字段() {
        Order order = OrderBuilder.anOrder()
            .withItem(ProductBuilder.aProduct().withPrice(new BigDecimal("99.00")).build(), 2)
            .paid()
            .build();

        producer.sendOrderPaidEvent(order);

        ConsumerRecord<String, String> record =
            KafkaTestUtils.getSingleRecord(consumer, "order-events", 5000);

        // 使用 JSON Schema 验证事件格式
        JsonNode eventJson = objectMapper.readTree(record.value());
        assertThat(eventJson.has("orderId")).isTrue();
        assertThat(eventJson.has("totalAmount")).isTrue();
        assertThat(eventJson.has("paymentId")).isTrue();
        assertThat(eventJson.has("eventType")).isTrue();
        assertThat(eventJson.get("eventType").asText()).isEqualTo("ORDER_PAID");
    }
}
```

### 18.4.3 Kafka 消费者测试

```java
/**
 * Kafka 消费者测试
 */
@SpringBootTest
@EmbeddedKafka(partitions = 1, topics = {"order-events"})
class PaymentEventConsumerTest {

    @Autowired
    private EmbeddedKafkaBroker embeddedKafka;

    @Autowired
    private KafkaTemplate<String, String> kafkaTemplate;

    @Autowired
    private PaymentRepository paymentRepository;

    @MockBean
    private PaymentGateway paymentGateway;

    @Test
    void 收到OrderCreated事件后_应该创建支付记录() throws Exception {
        // Arrange
        when(paymentGateway.createPaymentIntent(any()))
            .thenReturn(new PaymentIntent("pi_123", "pending"));

        OrderCreatedEvent event = new OrderCreatedEvent();
        event.setOrderId(1L);
        event.setUserId(100L);
        event.setTotalAmount(new BigDecimal("198.00"));
        event.setEventType("ORDER_CREATED");
        event.setTimestamp(Instant.now());

        // Act: 发送事件到 Kafka
        kafkaTemplate.send("order-events", "order-1",
            objectMapper.writeValueAsString(event)).get();

        // Assert: 等待消费者处理（异步！）
        await().atMost(Duration.ofSeconds(10))
            .pollInterval(Duration.ofMillis(500))
            .untilAsserted(() -> {
                Optional<Payment> payment = paymentRepository
                    .findByOrderId(1L);
                assertThat(payment).isPresent();
                assertThat(payment.get().getAmount())
                    .isEqualByComparingTo(new BigDecimal("198.00"));
                assertThat(payment.get().getStatus()).isEqualTo("PENDING");
            });

        verify(paymentGateway).createPaymentIntent(any());
    }

    @Test
    void 重复消费相同事件_应该保证幂等() throws Exception {
        when(paymentGateway.createPaymentIntent(any()))
            .thenReturn(new PaymentIntent("pi_123", "pending"));

        String eventJson = objectMapper.writeValueAsString(
            new OrderCreatedEvent(1L, 100L, new BigDecimal("198.00"))
        );

        // 发送两次相同的事件
        kafkaTemplate.send("order-events", "order-1", eventJson).get();
        kafkaTemplate.send("order-events", "order-1", eventJson).get();

        // 等待处理完成
        await().atMost(Duration.ofSeconds(10)).untilAsserted(() -> {
            List<Payment> payments = paymentRepository.findAllByOrderId(1L);
            // 幂等保证：只创建一条支付记录
            assertThat(payments).hasSize(1);
        });

        // 支付网关也只调用一次
        verify(paymentGateway, times(1)).createPaymentIntent(any());
    }

    @Test
    void 消费者处理失败_应该进入死信队列() throws Exception {
        // 模拟支付网关异常
        when(paymentGateway.createPaymentIntent(any()))
            .thenThrow(new PaymentGatewayException("网关超时"));

        String eventJson = objectMapper.writeValueAsString(
            new OrderCreatedEvent(2L, 200L, new BigDecimal("50.00"))
        );

        kafkaTemplate.send("order-events", "order-2", eventJson).get();

        // 验证重试后进入死信队列
        await().atMost(Duration.ofSeconds(30)).untilAsserted(() -> {
            // 验证重试了 3 次
            verify(paymentGateway, atLeast(3)).createPaymentIntent(any());
        });
    }
}
```

### 18.4.4 最终一致性测试

```java
/**
 * 最终一致性测试 —— 验证异步处理后数据最终一致
 */
@SpringBootTest
@Testcontainers
class EventualConsistencyTest {

    // ... 容器配置省略 ...

    @Autowired
    private OrderService orderService;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private InventoryRepository inventoryRepository;

    @Test
    void 下单后_库存和支付最终一致() {
        // Arrange
        Product product = ProductBuilder.aProduct()
            .withId("PROD-001")
            .withStock(100)
            .build();
        inventoryRepository.save(product);

        // Act: 创建订单（触发一系列异步事件）
        Order order = orderService.createOrder(
            new CreateOrderRequest("user_001",
                List.of(new OrderItemRequest("PROD-001", 3)))
        );

        // Assert: 使用 Awaitility 等待最终一致
        await()
            .atMost(Duration.ofSeconds(30))     // 最多等 30 秒
            .pollInterval(Duration.ofSeconds(1)) // 每秒检查一次
            .untilAsserted(() -> {
                // 验证1: 订单状态
                Order refreshed = orderRepository.findById(order.getId()).orElseThrow();
                assertThat(refreshed.getStatus()).isIn(
                    OrderStatus.CREATED, OrderStatus.PAID // 可能还在处理中
                );

                // 验证2: 库存已扣减
                Product refreshedProduct = inventoryRepository
                    .findById("PROD-001").orElseThrow();
                assertThat(refreshedProduct.getStock()).isEqualTo(97); // 100 - 3

                // 验证3: 支付记录已创建
                Optional<Payment> payment = paymentRepository
                    .findByOrderId(order.getId());
                assertThat(payment).isPresent();
            });
    }
}
```

---

## 18.5 GraphQL API 测试

GraphQL 与 REST 有根本不同——客户端决定返回的数据结构，这带来了独特的测试需求。

### 18.5.1 GraphQL 测试维度

```
┌────────────────────────────────────────────────────────────────┐
│                  GraphQL 测试维度                               │
│                                                                │
│  ① Schema 验证测试                                            │
│     · Schema 是否符合规范                                     │
│     · 类型定义是否完整                                        │
│     · 必填字段、枚举值检查                                    │
│                                                                │
│  ② Resolver 单元测试                                          │
│     · 每个 Resolver 的业务逻辑                                │
│     · Mock 数据源                                             │
│                                                                │
│  ③ Query/Mutation 集成测试                                    │
│     · 完整的查询执行                                          │
│     · 变量传递、错误处理                                      │
│                                                                │
│  ④ N+1 查询检测                                               │
│     · DataLoader 是否正确批量加载                             │
│     · 监控 SQL 查询数量                                       │
│                                                                │
│  ⑤ Query Complexity 测试                                      │
│     · 深度限制                                                │
│     · 复杂度限制                                              │
│     · 防止恶意查询                                            │
└────────────────────────────────────────────────────────────────┘
```

### 18.5.2 Apollo Server 测试示例

```typescript
/**
 * GraphQL Schema 定义
 */
const typeDefs = gql`
  type User {
    id: ID!
    username: String!
    email: String!
    orders: [Order!]!
  }

  type Order {
    id: ID!
    items: [OrderItem!]!
    totalAmount: Float!
    status: OrderStatus!
    createdAt: String!
  }

  type OrderItem {
    id: ID!
    product: Product!
    quantity: Int!
    price: Float!
  }

  type Product {
    id: ID!
    name: String!
    price: Float!
    category: String!
  }

  enum OrderStatus {
    CREATED
    PAID
    SHIPPED
    DELIVERED
    CANCELLED
  }

  type Query {
    user(id: ID!): User
    users(page: Int, size: Int): [User!]!
    order(id: ID!): Order
    products(category: String): [Product!]!
  }

  type Mutation {
    createOrder(input: CreateOrderInput!): Order!
    cancelOrder(id: ID!): Order!
  }

  input CreateOrderInput {
    userId: ID!
    items: [OrderItemInput!]!
  }

  input OrderItemInput {
    productId: ID!
    quantity: Int!
  }
`;

/**
 * GraphQL 测试
 */
import { ApolloServer } from '@apollo/server';
import assert from 'node:assert';

describe('GraphQL API 测试', () => {
  let server: ApolloServer;
  let mockUserRepo: jest.Mocked<UserRepository>;
  let mockOrderRepo: jest.Mocked<OrderRepository>;

  beforeAll(async () => {
    mockUserRepo = createMockUserRepo();
    mockOrderRepo = createMockOrderRepo();

    server = new ApolloServer({
      typeDefs,
      resolvers: createResolvers(mockUserRepo, mockOrderRepo),
    });
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  // ========== Query 测试 ==========

  it('查询用户基本信息', async () => {
    mockUserRepo.findById.mockResolvedValue(
      UserMother.createActiveUser({ id: '1', username: 'zhangsan' })
    );

    const result = await server.executeOperation({
      query: `
        query GetUser($id: ID!) {
          user(id: $id) {
            id
            username
            email
          }
        }
      `,
      variables: { id: '1' },
    });

    assert(result.body.kind === 'single');
    expect(result.body.singleResult.errors).toBeUndefined();
    expect(result.body.singleResult.data?.user).toEqual({
      id: '1',
      username: 'zhangsan',
      email: expect.stringContaining('@'),
    });
  });

  it('查询不存在的用户返回 null', async () => {
    mockUserRepo.findById.mockResolvedValue(null);

    const result = await server.executeOperation({
      query: `query { user(id: "999") { id username } }`,
    });

    assert(result.body.kind === 'single');
    expect(result.body.singleResult.data?.user).toBeNull();
  });

  // ========== Mutation 测试 ==========

  it('创建订单成功', async () => {
    mockOrderRepo.create.mockResolvedValue({
      id: 'order_1',
      items: [{ id: 'item_1', product: { id: 'prod_1', name: '测试商品', price: 99 }, quantity: 2, price: 99 }],
      totalAmount: 198,
      status: 'CREATED',
      createdAt: new Date().toISOString(),
    });

    const result = await server.executeOperation({
      query: `
        mutation CreateOrder($input: CreateOrderInput!) {
          createOrder(input: $input) {
            id
            totalAmount
            status
            items {
              product {
                name
              }
              quantity
            }
          }
        }
      `,
      variables: {
        input: {
          userId: '1',
          items: [{ productId: 'prod_1', quantity: 2 }],
        },
      },
    });

    assert(result.body.kind === 'single');
    expect(result.body.singleResult.errors).toBeUndefined();
    const order = result.body.singleResult.data?.createOrder;
    expect(order.totalAmount).toBe(198);
    expect(order.status).toBe('CREATED');
    expect(order.items).toHaveLength(1);
  });

  // ========== N+1 查询检测 ==========

  it('批量查询用户时不应产生 N+1 问题', async () => {
    const queryCounter = { count: 0 };

    // 注入查询计数器
    mockUserRepo.findAll.mockImplementation(async () => {
      queryCounter.count++;
      return Array.from({ length: 10 }, (_, i) =>
        UserMother.createActiveUser({ id: String(i) })
      );
    });

    mockOrderRepo.findByUserIds.mockImplementation(async (ids: string[]) => {
      queryCounter.count++; // DataLoader 应该只调用一次
      return ids.map(id => [OrderMother.createDefaultOrder({ userId: id })]);
    });

    const result = await server.executeOperation({
      query: `
        query {
          users(page: 1, size: 10) {
            id
            username
            orders {
              id
              totalAmount
            }
          }
        }
      `,
    });

    assert(result.body.kind === 'single');
    expect(result.body.singleResult.errors).toBeUndefined();

    // 应该是 2 次查询（1次用户 + 1次批量订单），而不是 11 次（1 + 10）
    expect(queryCounter.count).toBeLessThanOrEqual(2);
  });

  // ========== Query Complexity 测试 ==========

  it('拒绝过深的嵌套查询', async () => {
    const result = await server.executeOperation({
      query: `
        query {
          user(id: "1") {
            orders {
              items {
                product {
                  category
                }
              }
            }
          }
        }
      `,
    });

    // 如果配置了深度限制（如 maxDepth: 3），则应该报错
    // 这个查询深度为 5（user → orders → items → product → category）
    assert(result.body.kind === 'single');
    if (result.body.singleResult.errors) {
      expect(result.body.singleResult.errors[0].message)
        .toContain('exceeds maximum depth');
    }
  });

  // ========== Schema 验证测试 ==========

  it('Schema 中所有类型应有描述', () => {
    const schema = server.schema;
    const types = Object.values(schema.getTypeMap())
      .filter(t => !t.name.startsWith('__')); // 排除内省类型

    for (const type of types) {
      // 可以根据团队约定检查是否有 description
      // expect(type.description).toBeDefined();
      expect(type.name).toBeTruthy();
    }
  });
});
```

---

## 18.6 gRPC 测试

gRPC 使用 Protocol Buffers 定义强类型接口，支持四种通信模式，每种模式的测试策略不同。

### 18.6.1 四种 gRPC 模式

```
┌──────────────────────────────────────────────────────────────────┐
│                   gRPC 四种通信模式                               │
│                                                                  │
│  ① Unary（一元调用）          ② Server Streaming（服务端流）     │
│  Client ──req──▶ Server       Client ──req──▶ Server             │
│  Client ◀──res── Server       Client ◀──res1─ Server             │
│                               Client ◀──res2─ Server             │
│  类似 REST 请求/响应          Client ◀──res3─ Server             │
│                               类似"订阅推送"                     │
│                                                                  │
│  ③ Client Streaming           ④ Bidirectional Streaming          │
│     （客户端流）                 （双向流）                       │
│  Client ──req1─▶ Server       Client ──req1──▶ Server            │
│  Client ──req2─▶ Server       Client ◀──res1── Server            │
│  Client ──req3─▶ Server       Client ──req2──▶ Server            │
│  Client ◀──res── Server       Client ◀──res2── Server            │
│  类似"批量上传"               类似"实时聊天"                     │
└──────────────────────────────────────────────────────────────────┘
```

### 18.6.2 Proto 文件定义

```protobuf
// order_service.proto
syntax = "proto3";

package order.v1;

option java_package = "com.example.order.grpc";

// 订单服务
service OrderService {
  // ① Unary: 创建订单
  rpc CreateOrder(CreateOrderRequest) returns (CreateOrderResponse);

  // ② Server Streaming: 监听订单状态变更
  rpc WatchOrderStatus(WatchOrderRequest) returns (stream OrderStatusUpdate);

  // ③ Client Streaming: 批量导入订单
  rpc BatchImportOrders(stream ImportOrderRequest) returns (BatchImportResponse);

  // ④ Bidirectional Streaming: 实时价格协商
  rpc NegotiatePrice(stream PriceProposal) returns (stream PriceResponse);
}

message CreateOrderRequest {
  string user_id = 1;
  repeated OrderItemProto items = 2;
}

message CreateOrderResponse {
  string order_id = 1;
  double total_amount = 2;
  string status = 3;
  string created_at = 4;
}

message OrderItemProto {
  string product_id = 1;
  int32 quantity = 2;
}

message WatchOrderRequest {
  string order_id = 1;
}

message OrderStatusUpdate {
  string order_id = 1;
  string old_status = 2;
  string new_status = 3;
  string timestamp = 4;
}

message ImportOrderRequest {
  string user_id = 1;
  repeated OrderItemProto items = 2;
}

message BatchImportResponse {
  int32 total_received = 1;
  int32 success_count = 2;
  int32 failure_count = 3;
  repeated string failed_order_ids = 4;
}

message PriceProposal {
  string order_id = 1;
  double proposed_price = 2;
  string reason = 3;
}

message PriceResponse {
  string order_id = 1;
  bool accepted = 2;
  double counter_price = 3;
  string message = 4;
}
```

### 18.6.3 gRPC 四种模式测试

```java
/**
 * gRPC 服务测试（使用 grpc-java 内置的 InProcessServer）
 */
@ExtendWith(MockitoExtension.class)
class OrderGrpcServiceTest {

    @RegisterExtension
    static final GrpcCleanupRule grpcCleanup = new GrpcCleanupRule();

    private OrderServiceGrpc.OrderServiceBlockingStub blockingStub;
    private OrderServiceGrpc.OrderServiceStub asyncStub;

    @Mock
    private OrderService orderService;

    @BeforeEach
    void setup() throws Exception {
        // 创建进程内 gRPC 服务器（无需网络）
        String serverName = InProcessServerBuilder.generateName();

        grpcCleanup.register(
            InProcessServerBuilder.forName(serverName)
                .directExecutor()
                .addService(new OrderGrpcServiceImpl(orderService))
                .build()
                .start()
        );

        ManagedChannel channel = grpcCleanup.register(
            InProcessChannelBuilder.forName(serverName)
                .directExecutor()
                .build()
        );

        blockingStub = OrderServiceGrpc.newBlockingStub(channel);
        asyncStub = OrderServiceGrpc.newStub(channel);
    }

    // ========== ① Unary 测试 ==========

    @Test
    void Unary_创建订单成功() {
        when(orderService.createOrder(any())).thenReturn(
            OrderBuilder.anOrder()
                .withId(1L)
                .withTotalAmount(new BigDecimal("198.00"))
                .build()
        );

        CreateOrderResponse response = blockingStub.createOrder(
            CreateOrderRequest.newBuilder()
                .setUserId("user_001")
                .addItems(OrderItemProto.newBuilder()
                    .setProductId("PROD-001")
                    .setQuantity(2)
                    .build())
                .build()
        );

        assertThat(response.getOrderId()).isNotEmpty();
        assertThat(response.getTotalAmount()).isEqualTo(198.0);
        assertThat(response.getStatus()).isEqualTo("CREATED");
    }

    @Test
    void Unary_参数错误应返回INVALID_ARGUMENT() {
        StatusRuntimeException ex = assertThrows(
            StatusRuntimeException.class,
            () -> blockingStub.createOrder(
                CreateOrderRequest.newBuilder()
                    .setUserId("")  // 空用户ID
                    .build()
            )
        );

        assertThat(ex.getStatus().getCode()).isEqualTo(Status.Code.INVALID_ARGUMENT);
    }

    // ========== ② Server Streaming 测试 ==========

    @Test
    void ServerStreaming_监听订单状态变更() throws Exception {
        List<OrderStatusUpdate> receivedUpdates = new ArrayList<>();
        CountDownLatch latch = new CountDownLatch(3); // 期望收到 3 条更新

        asyncStub.watchOrderStatus(
            WatchOrderRequest.newBuilder()
                .setOrderId("order_001")
                .build(),
            new StreamObserver<OrderStatusUpdate>() {
                @Override
                public void onNext(OrderStatusUpdate update) {
                    receivedUpdates.add(update);
                    latch.countDown();
                }

                @Override
                public void onError(Throwable t) {
                    fail("不应该出错: " + t.getMessage());
                }

                @Override
                public void onCompleted() {
                    // 流结束
                }
            }
        );

        // 模拟订单状态变更（触发服务端推送）
        orderService.updateOrderStatus("order_001", "PAID");
        orderService.updateOrderStatus("order_001", "SHIPPED");
        orderService.updateOrderStatus("order_001", "DELIVERED");

        assertTrue(latch.await(5, TimeUnit.SECONDS));
        assertThat(receivedUpdates).hasSize(3);
        assertThat(receivedUpdates.get(0).getNewStatus()).isEqualTo("PAID");
        assertThat(receivedUpdates.get(1).getNewStatus()).isEqualTo("SHIPPED");
        assertThat(receivedUpdates.get(2).getNewStatus()).isEqualTo("DELIVERED");
    }

    // ========== ③ Client Streaming 测试 ==========

    @Test
    void ClientStreaming_批量导入订单() throws Exception {
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<BatchImportResponse> responseRef = new AtomicReference<>();

        StreamObserver<ImportOrderRequest> requestObserver =
            asyncStub.batchImportOrders(new StreamObserver<BatchImportResponse>() {
                @Override
                public void onNext(BatchImportResponse response) {
                    responseRef.set(response);
                }

                @Override
                public void onError(Throwable t) {
                    fail("不应该出错");
                }

                @Override
                public void onCompleted() {
                    latch.countDown();
                }
            });

        // 客户端发送多条请求
        for (int i = 0; i < 100; i++) {
            requestObserver.onNext(
                ImportOrderRequest.newBuilder()
                    .setUserId("user_" + i)
                    .addItems(OrderItemProto.newBuilder()
                        .setProductId("PROD-" + (i % 10))
                        .setQuantity(1)
                        .build())
                    .build()
            );
        }
        requestObserver.onCompleted(); // 告诉服务端发送完毕

        assertTrue(latch.await(10, TimeUnit.SECONDS));

        BatchImportResponse response = responseRef.get();
        assertThat(response.getTotalReceived()).isEqualTo(100);
        assertThat(response.getSuccessCount()).isGreaterThanOrEqualTo(90);
    }

    // ========== ④ Bidirectional Streaming 测试 ==========

    @Test
    void BidirectionalStreaming_价格协商() throws Exception {
        List<PriceResponse> responses = new ArrayList<>();
        CountDownLatch latch = new CountDownLatch(1);

        StreamObserver<PriceProposal> requestObserver =
            asyncStub.negotiatePrice(new StreamObserver<PriceResponse>() {
                @Override
                public void onNext(PriceResponse response) {
                    responses.add(response);
                }

                @Override
                public void onError(Throwable t) {
                    fail("不应该出错");
                }

                @Override
                public void onCompleted() {
                    latch.countDown();
                }
            });

        // 第一轮报价
        requestObserver.onNext(PriceProposal.newBuilder()
            .setOrderId("order_001")
            .setProposedPrice(80.0)
            .setReason("批量采购优惠")
            .build());

        Thread.sleep(100); // 等待服务端响应

        // 根据服务端的还价，发送第二轮报价
        if (!responses.isEmpty() && !responses.get(0).getAccepted()) {
            double counterPrice = responses.get(0).getCounterPrice();
            requestObserver.onNext(PriceProposal.newBuilder()
                .setOrderId("order_001")
                .setProposedPrice((counterPrice + 80.0) / 2) // 折中价格
                .setReason("最终报价")
                .build());
        }

        requestObserver.onCompleted();
        assertTrue(latch.await(5, TimeUnit.SECONDS));
        assertThat(responses.size()).isGreaterThanOrEqualTo(1);
    }
}
```

### 18.6.4 grpcurl 命令行测试

```bash
# grpcurl 是 gRPC 的 curl 等价工具

# 列出所有服务
grpcurl -plaintext localhost:50051 list

# 列出服务的所有方法
grpcurl -plaintext localhost:50051 list order.v1.OrderService

# Unary 调用
grpcurl -plaintext -d '{
  "user_id": "user_001",
  "items": [{"product_id": "PROD-001", "quantity": 2}]
}' localhost:50051 order.v1.OrderService/CreateOrder

# Server Streaming 调用
grpcurl -plaintext -d '{"order_id": "order_001"}' \
  localhost:50051 order.v1.OrderService/WatchOrderStatus

# 使用 Proto 文件（无需反射）
grpcurl -plaintext -import-path ./proto -proto order_service.proto \
  -d '{"user_id": "user_001"}' \
  localhost:50051 order.v1.OrderService/CreateOrder

# 查看服务描述
grpcurl -plaintext localhost:50051 describe order.v1.OrderService
```

---

## 18.7 前后端分离架构测试

前后端分离是目前最主流的 Web 架构模式。BFF（Backend for Frontend）层、API Gateway、跨域与认证传递都需要针对性的测试策略。

### 18.7.1 架构全景

```
┌────────────────────────────────────────────────────────────────────┐
│                  前后端分离架构全景                                  │
│                                                                    │
│  ┌──────────┐    ┌──────────┐    ┌───────────────┐                │
│  │ Web SPA  │    │ Mobile   │    │ 第三方客户端   │               │
│  │ (React)  │    │ (RN/iOS) │    │               │                │
│  └────┬─────┘    └────┬─────┘    └───────┬───────┘                │
│       │               │                  │                         │
│       └───────────────┼──────────────────┘                         │
│                       │  HTTPS                                     │
│                       ▼                                            │
│              ┌────────────────┐                                    │
│              │  API Gateway   │  ← 路由、限流、认证、CORS          │
│              │  (Nginx/Kong)  │                                    │
│              └───────┬────────┘                                    │
│                      │                                             │
│         ┌────────────┼────────────┐                                │
│         ▼            ▼            ▼                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                          │
│  │ BFF Web  │ │BFF Mobile│ │ 通用 API │                           │
│  │ (聚合层) │ │ (聚合层) │ │          │                            │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘                          │
│       │            │            │                                  │
│       └────────────┼────────────┘                                  │
│                    ▼                                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                          │
│  │ User     │ │ Order    │ │ Product  │  ← 后端微服务             │
│  │ Service  │ │ Service  │ │ Service  │                           │
│  └──────────┘ └──────────┘ └──────────┘                           │
└────────────────────────────────────────────────────────────────────┘
```

### 18.7.2 BFF 层测试

```typescript
/**
 * BFF 层测试
 * BFF 的核心职责：聚合多个后端服务的数据、适配不同客户端的需求
 */
import request from 'supertest';
import nock from 'nock';
import app from '../app';

describe('BFF 层：用户首页数据聚合', () => {
  beforeEach(() => {
    // Mock 后端微服务
    nock('http://user-service:8080')
      .get('/api/users/1')
      .reply(200, {
        id: '1',
        username: 'zhangsan',
        email: 'zhang@example.com',
        avatarUrl: 'https://cdn.example.com/avatar.jpg',
      });

    nock('http://order-service:8080')
      .get('/api/users/1/orders/recent')
      .reply(200, [
        { id: 'ord_1', totalAmount: 198, status: 'DELIVERED', createdAt: '2026-04-01' },
        { id: 'ord_2', totalAmount: 65, status: 'SHIPPED', createdAt: '2026-04-03' },
      ]);

    nock('http://recommendation-service:8080')
      .get('/api/users/1/recommendations')
      .reply(200, [
        { productId: 'p1', name: '推荐商品1', score: 0.95 },
        { productId: 'p2', name: '推荐商品2', score: 0.87 },
      ]);
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('应该聚合多个服务的数据返回首页响应', async () => {
    const response = await request(app)
      .get('/bff/web/home')
      .set('Authorization', 'Bearer valid-token')
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);

    // 验证聚合结果
    const body = response.body;
    expect(body.user.username).toBe('zhangsan');
    expect(body.recentOrders).toHaveLength(2);
    expect(body.recommendations).toHaveLength(2);

    // 验证 BFF 层的数据转换
    expect(body.user).not.toHaveProperty('email'); // BFF 应过滤敏感字段
    expect(body.recentOrders[0]).toHaveProperty('statusText'); // BFF 添加友好文本
  });

  it('某个下游服务不可用时应降级而非整体失败', async () => {
    // 推荐服务挂了
    nock.cleanAll();
    nock('http://user-service:8080')
      .get('/api/users/1')
      .reply(200, { id: '1', username: 'zhangsan' });
    nock('http://order-service:8080')
      .get('/api/users/1/orders/recent')
      .reply(200, []);
    nock('http://recommendation-service:8080')
      .get('/api/users/1/recommendations')
      .reply(503); // 服务不可用

    const response = await request(app)
      .get('/bff/web/home')
      .set('Authorization', 'Bearer valid-token');

    // 整体请求应该成功，推荐部分降级为空
    expect(response.status).toBe(200);
    expect(response.body.user.username).toBe('zhangsan');
    expect(response.body.recommendations).toEqual([]); // 降级为空数组
  });
});
```

### 18.7.3 CORS 测试

```typescript
/**
 * CORS（跨域资源共享）测试
 */
describe('CORS 配置测试', () => {
  it('允许的来源应该返回正确的 CORS 头', async () => {
    const response = await request(app)
      .options('/api/users')
      .set('Origin', 'https://app.example.com')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'Content-Type, Authorization');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin'])
      .toBe('https://app.example.com');
    expect(response.headers['access-control-allow-methods'])
      .toContain('POST');
    expect(response.headers['access-control-allow-headers'])
      .toContain('Authorization');
    expect(response.headers['access-control-allow-credentials'])
      .toBe('true');
  });

  it('不允许的来源不应返回 CORS 头', async () => {
    const response = await request(app)
      .options('/api/users')
      .set('Origin', 'https://evil-site.com');

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('实际请求应包含 CORS 头', async () => {
    const response = await request(app)
      .get('/api/users/1')
      .set('Origin', 'https://app.example.com')
      .set('Authorization', 'Bearer valid-token');

    expect(response.headers['access-control-allow-origin'])
      .toBe('https://app.example.com');
  });
});
```

### 18.7.4 认证令牌传递测试

```typescript
/**
 * JWT 认证令牌在前后端间传递的测试
 */
describe('认证令牌传递', () => {
  const validToken = generateTestJWT({
    sub: 'user_001',
    roles: ['USER'],
    exp: Math.floor(Date.now() / 1000) + 3600, // 1小时后过期
  });

  const expiredToken = generateTestJWT({
    sub: 'user_001',
    roles: ['USER'],
    exp: Math.floor(Date.now() / 1000) - 3600, // 已过期
  });

  it('有效 Token 应能访问受保护接口', async () => {
    const response = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${validToken}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe('user_001');
  });

  it('过期 Token 应返回 401', async () => {
    const response = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('TOKEN_EXPIRED');
  });

  it('无 Token 应返回 401', async () => {
    const response = await request(app)
      .get('/api/users/me');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('UNAUTHORIZED');
  });

  it('Token 中的角色应正确传递到下游服务', async () => {
    const adminToken = generateTestJWT({
      sub: 'admin_001',
      roles: ['ADMIN'],
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    // BFF 层应该将角色信息传递到下游
    nock('http://user-service:8080')
      .get('/api/admin/users')
      .matchHeader('X-User-Roles', 'ADMIN')  // 验证角色头传递
      .reply(200, []);

    const response = await request(app)
      .get('/bff/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
  });

  it('Token 刷新机制', async () => {
    const refreshToken = 'valid-refresh-token-xxx';

    const response = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toBeDefined();
    expect(response.body.expiresIn).toBeGreaterThan(0);
  });
});

// 辅助函数
function generateTestJWT(payload: Record<string, unknown>): string {
  const jwt = require('jsonwebtoken');
  return jwt.sign(payload, process.env.JWT_SECRET || 'test-secret');
}
```

---

## 18.8 实战案例：电商系统的完整测试策略设计

本节通过一个完整的电商系统案例，展示如何从需求出发，系统设计测试架构。

### 18.8.1 系统架构

```
┌────────────────────────────────────────────────────────────────────────┐
│                    ShopX 电商系统架构                                   │
│                                                                        │
│  ┌────────┐  ┌────────┐  ┌────────┐                                  │
│  │Web SPA │  │ iOS    │  │Android │                                   │
│  │(React) │  │ App    │  │ App    │                                   │
│  └───┬────┘  └───┬────┘  └───┬────┘                                  │
│      └───────────┼───────────┘                                        │
│                  ▼                                                     │
│         ┌────────────────┐                                            │
│         │  API Gateway   │  ← Kong / Nginx                           │
│         └───────┬────────┘                                            │
│                 │                                                      │
│    ┌────────────┼─────────────┬──────────────┐                        │
│    ▼            ▼             ▼              ▼                         │
│  ┌──────┐  ┌──────┐    ┌──────────┐   ┌──────────┐                  │
│  │ User │  │Order │    │ Product  │   │ Payment  │                   │
│  │ Svc  │  │ Svc  │    │ Catalog  │   │ Svc      │                  │
│  └──┬───┘  └──┬───┘    └────┬─────┘   └────┬─────┘                  │
│     │         │             │               │                         │
│     ▼         ▼             ▼               ▼                         │
│  ┌──────┐  ┌──────┐    ┌──────┐        ┌──────┐                     │
│  │ PG   │  │ PG   │    │Redis │        │ PG   │                     │
│  └──────┘  └──────┘    │+ES   │        └──────┘                     │
│                         └──────┘                                      │
│                                                                        │
│  ┌──────────────────────────────────────┐                             │
│  │         Kafka (事件总线)              │                            │
│  │  Topics: order-events, payment-events│                             │
│  │          inventory-events, user-events│                            │
│  └──────────────────────────────────────┘                             │
│                                                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ Notification │  │  Inventory   │  │  Analytics   │                │
│  │ Service      │  │  Service     │  │  Service     │                │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
└────────────────────────────────────────────────────────────────────────┘
```

### 18.8.2 测试分层策略

```
┌──────────────────────────────────────────────────────────────────────┐
│                  ShopX 测试分层策略                                    │
│                                                                      │
│  Layer 5: E2E 测试 (5%)                                             │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │ · 完整下单流程（注册→浏览→加购→支付→确认收货）           │       │
│  │ · 工具: Cypress / Playwright                             │       │
│  │ · 环境: Staging (全部真实服务)                            │       │
│  │ · 频率: 每次部署到 Staging 后执行                        │       │
│  │ · 数量: 10-20 条核心场景                                 │       │
│  └──────────────────────────────────────────────────────────┘       │
│                                                                      │
│  Layer 4: 契约测试 (10%)                                            │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │ · Order↔User、Order↔Payment、Order↔Inventory 的接口契约 │       │
│  │ · 工具: Pact                                              │       │
│  │ · 频率: 每次 PR 自动执行                                 │       │
│  │ · 数量: 每对服务 5-10 个契约                              │       │
│  └──────────────────────────────────────────────────────────┘       │
│                                                                      │
│  Layer 3: 组件测试 (20%)                                            │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │ · 每个微服务的完整功能测试（HTTP接口→业务逻辑→数据库）   │       │
│  │ · 工具: SpringBootTest + Testcontainers                   │       │
│  │ · 外部服务: WireMock / nock                               │       │
│  │ · 频率: 每次 PR 自动执行                                 │       │
│  │ · 数量: 每服务 20-50 条                                   │       │
│  └──────────────────────────────────────────────────────────┘       │
│                                                                      │
│  Layer 2: 集成测试 (25%)                                            │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │ · Repository + 真实数据库                                 │       │
│  │ · Kafka 生产者/消费者 + Embedded Kafka                    │       │
│  │ · Redis 缓存 + Testcontainers Redis                       │       │
│  │ · 频率: 每次提交自动执行                                 │       │
│  └──────────────────────────────────────────────────────────┘       │
│                                                                      │
│  Layer 1: 单元测试 (40%)                                            │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │ · Service 层业务逻辑（Mock Repository）                   │       │
│  │ · 领域模型/值对象的行为                                   │       │
│  │ · 工具类、转换器、验证器                                  │       │
│  │ · 频率: 每次保存自动执行 (Watch 模式)                    │       │
│  └──────────────────────────────────────────────────────────┘       │
│                                                                      │
│  各层测试数量和执行时间目标:                                         │
│  ┌────────┬──────────┬──────────┬────────────┬──────────────┐       │
│  │ 层级   │ 测试数量 │ 执行时间 │ 覆盖重点   │ 失败影响      │      │
│  ├────────┼──────────┼──────────┼────────────┼──────────────┤       │
│  │ 单元   │ 500+     │ < 30s    │ 业务规则   │ 阻断 PR      │      │
│  │ 集成   │ 200+     │ < 2min   │ 数据访问   │ 阻断 PR      │      │
│  │ 组件   │ 100+     │ < 5min   │ API 正确性 │ 阻断 PR      │      │
│  │ 契约   │ 50+      │ < 1min   │ 服务兼容性 │ 阻断部署     │      │
│  │ E2E    │ 15-20    │ < 10min  │ 核心流程   │ 阻断发布     │      │
│  └────────┴──────────┴──────────┴────────────┴──────────────┘       │
└──────────────────────────────────────────────────────────────────────┘
```

### 18.8.3 CI Pipeline 设计

```yaml
# .github/workflows/ci.yml
# ShopX 电商系统 CI Pipeline

name: ShopX CI Pipeline

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

jobs:
  # ========== Stage 1: 快速检查（< 2 分钟） ==========
  lint-and-unit:
    name: "代码检查 + 单元测试"
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [user-service, order-service, product-service, payment-service]
    steps:
      - uses: actions/checkout@v4

      - name: 代码风格检查
        run: ./gradlew :${{ matrix.service }}:spotlessCheck

      - name: 单元测试
        run: ./gradlew :${{ matrix.service }}:test -Pprofile=unit
        # 只运行 @Tag("unit") 标记的测试

      - name: 上传测试报告
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: unit-test-${{ matrix.service }}
          path: ${{ matrix.service }}/build/reports/tests/

  # ========== Stage 2: 集成测试（< 5 分钟） ==========
  integration:
    name: "集成测试"
    needs: lint-and-unit
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [user-service, order-service, product-service, payment-service]
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: testdb
          POSTGRES_PASSWORD: test
        ports: ['5432:5432']
    steps:
      - uses: actions/checkout@v4

      - name: 集成测试 (含 Testcontainers)
        run: ./gradlew :${{ matrix.service }}:test -Pprofile=integration

  # ========== Stage 3: 组件测试 + 契约测试（< 10 分钟） ==========
  component-and-contract:
    name: "组件测试 + 契约测试"
    needs: integration
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: 组件测试
        run: ./gradlew componentTest

      - name: 契约测试（Consumer 端）
        run: ./gradlew pactTest

      - name: 发布契约到 Pact Broker
        if: github.ref == 'refs/heads/main'
        run: ./gradlew pactPublish

      - name: 契约验证（Provider 端）
        run: ./gradlew pactVerify

  # ========== Stage 4: E2E 测试（仅 main 分支） ==========
  e2e:
    name: "端到端测试"
    needs: component-and-contract
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: 启动完整环境
        run: docker compose -f docker-compose.test.yml up -d

      - name: 等待服务就绪
        run: ./scripts/wait-for-services.sh

      - name: 运行 E2E 测试
        run: npx playwright test --project=e2e

      - name: 清理环境
        if: always()
        run: docker compose -f docker-compose.test.yml down -v
```

### 18.8.4 核心场景 E2E 测试

```typescript
/**
 * E2E 测试：完整的下单流程
 */
import { test, expect } from '@playwright/test';

test.describe('核心业务流程: 用户下单', () => {

  test('完整下单流程: 登录 → 浏览 → 加购 → 结算 → 支付 → 确认', async ({ page }) => {
    // Step 1: 登录
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'Test123!@#');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/home');

    // Step 2: 浏览商品
    await page.click('[data-testid="category-electronics"]');
    await expect(page.locator('[data-testid="product-card"]')).toHaveCount(
      expect.any(Number) // 至少有商品显示
    );

    // Step 3: 查看商品详情并加入购物车
    await page.click('[data-testid="product-card"]>> nth=0');
    await expect(page.locator('[data-testid="product-name"]')).toBeVisible();
    const productName = await page.locator('[data-testid="product-name"]').textContent();
    const productPrice = await page.locator('[data-testid="product-price"]').textContent();

    await page.fill('[data-testid="quantity-input"]', '2');
    await page.click('[data-testid="add-to-cart-button"]');
    await expect(page.locator('[data-testid="cart-badge"]')).toHaveText('2');

    // Step 4: 进入购物车并结算
    await page.click('[data-testid="cart-icon"]');
    await expect(page.locator('[data-testid="cart-item"]')).toHaveCount(1);
    await page.click('[data-testid="checkout-button"]');

    // Step 5: 确认订单信息
    await expect(page).toHaveURL(/\/checkout/);
    await expect(page.locator('[data-testid="order-summary"]')).toContainText(productName!);
    await page.click('[data-testid="confirm-order-button"]');

    // Step 6: 支付（使用测试支付网关）
    await expect(page).toHaveURL(/\/payment/);
    await page.click('[data-testid="pay-button"]');

    // Step 7: 验证订单完成
    await expect(page).toHaveURL(/\/order-success/);
    const orderId = await page.locator('[data-testid="order-id"]').textContent();
    expect(orderId).toMatch(/^ORD-\d+$/);

    // Step 8: 在订单列表中确认
    await page.goto('/orders');
    await expect(page.locator(`[data-testid="order-${orderId}"]`)).toBeVisible();
    await expect(page.locator(`[data-testid="order-${orderId}"] .status`))
      .toHaveText('待发货');
  });
});
```

---

## 18.9 实战练习

### 练习 1：单体应用分层测试（初级）

**题目：** 为以下博客系统的三层架构编写测试。

```java
// Controller
@RestController
@RequestMapping("/api/posts")
public class PostController {
    @GetMapping("/{id}")
    public PostDTO getPost(@PathVariable Long id);

    @PostMapping
    public PostDTO createPost(@Valid @RequestBody CreatePostRequest request);
}

// Service
public class PostService {
    public Post findById(Long id);
    public Post create(CreatePostRequest request); // 自动设置作者为当前登录用户
}

// Repository
public interface PostRepository extends JpaRepository<Post, Long> {
    List<Post> findByAuthorIdOrderByCreatedAtDesc(Long authorId);
    Page<Post> findByStatus(PostStatus status, Pageable pageable);
}
```

**要求：**
1. 为 Controller 层编写 3 个测试（成功、404、参数校验失败）
2. 为 Service 层编写 3 个测试（正常流程、文章不存在、作者权限校验）
3. 为 Repository 层编写 2 个测试（按作者查询、按状态分页查询）
4. 明确说明每层 Mock 了什么

---

### 练习 2：微服务契约测试（中级）

**题目：** 设计 Order Service 与 Inventory Service 之间的契约测试。

交互场景：
- Order Service 调用 `GET /api/inventory/{productId}` 查询库存
- Order Service 调用 `POST /api/inventory/reserve` 预留库存
- Order Service 调用 `POST /api/inventory/release` 释放库存

**要求：**
1. 编写 Consumer 端（Order Service）的 Pact 测试，覆盖至少 4 个场景
2. 编写 Provider 端（Inventory Service）的验证测试
3. 包含正常和异常场景（库存不足、商品不存在等）

---

### 练习 3：事件驱动架构测试（中级）

**题目：** 设计以下事件驱动流程的测试策略。

```
用户下单 → 发送 OrderCreated 事件
    ├── Inventory Service: 扣减库存 → 发送 StockReserved 事件
    ├── Payment Service: 创建支付单 → 发送 PaymentCreated 事件
    └── Notification Service: 发送下单通知

用户支付 → 发送 PaymentCompleted 事件
    ├── Order Service: 更新订单状态
    └── Notification Service: 发送支付成功通知

支付超时 → 发送 PaymentTimeout 事件
    ├── Order Service: 取消订单
    ├── Inventory Service: 释放库存
    └── Notification Service: 发送超时提醒
```

**要求：**
1. 为 Order Service 的事件生产者编写测试
2. 为 Inventory Service 的事件消费者编写测试（包含幂等性验证）
3. 编写最终一致性测试：验证支付超时后订单取消且库存释放
4. 编写 Saga 失败场景测试：库存扣减失败时的补偿流程

---

### 练习 4：GraphQL + gRPC 混合架构测试（高级）

**题目：** 设计以下混合架构的测试策略。

```
前端 → GraphQL BFF → gRPC 后端服务
                    ├── UserService (gRPC)
                    ├── OrderService (gRPC)
                    └── ProductService (gRPC)
```

**要求：**
1. 编写 GraphQL BFF 的测试（查询聚合、mutation 转发、错误处理）
2. 编写一个 gRPC 服务的 Server Streaming 测试
3. 编写 GraphQL subscription（基于 gRPC streaming）的测试
4. 设计 N+1 查询检测方案：GraphQL 查询用户列表时，如何确保不会对每个用户都发起独立的 gRPC 调用

---

### 练习 5：完整系统测试策略设计（高级）

**题目：** 为一个在线教育平台设计完整的测试策略。

系统概述：
- **微服务架构：** 用户服务、课程服务、订单服务、支付服务、视频服务、消息服务
- **技术栈：** Spring Boot + React + Kafka + PostgreSQL + Redis + Elasticsearch + S3
- **核心流程：** 注册→浏览课程→购买→观看视频→完成课程→获得证书

**要求：**
1. 绘制系统架构图（ASCII）
2. 设计测试分层策略（每层的测试范围、工具、数量目标）
3. 为"购买课程→观看视频→完成课程"流程设计测试方案，包括：
   - 单元测试（课程完成度计算逻辑）
   - 集成测试（视频观看进度持久化）
   - 组件测试（课程服务的完整 API）
   - 契约测试（课程服务↔订单服务）
   - E2E 测试（完整学习流程）
4. 设计 CI/CD Pipeline（YAML 格式）
5. 估算各层测试的数量和执行时间

---



## 第十九章：测试中的设计模式

> **本章导读**
> 设计模式不仅属于生产代码，测试代码同样需要精心设计。当测试套件增长到数百甚至数千个测试时，没有设计的测试代码会变成维护噩梦。本章介绍在测试领域最具实战价值的设计模式。

---

### 19.1 Page Object 模式深入

#### 19.1.1 问题：没有 Page Object 的测试

```typescript
// ❌ 选择器到处重复，一个 UI 改动需要修改几十个测试
test('用户登录', async ({ page }) => {
  await page.goto('/login');
  await page.fill('#email-input', 'user@test.com');
  await page.fill('#password-input', 'pass123');
  await page.click('#login-btn');
  await expect(page.locator('.welcome-msg')).toContainText('欢迎');
});

test('登录失败', async ({ page }) => {
  await page.goto('/login');
  await page.fill('#email-input', 'wrong@test.com');   // 重复的选择器
  await page.fill('#password-input', 'wrong');          // 重复的选择器
  await page.click('#login-btn');                        // 重复的选择器
  await expect(page.locator('.error-msg')).toBeVisible();
});
```

#### 19.1.2 BasePage 基类

```typescript
// pages/BasePage.ts
import { Page, Locator } from '@playwright/test';

export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  abstract get url(): string;

  async goto(): Promise<void> {
    await this.page.goto(this.url);
  }

  async getTitle(): Promise<string> {
    return this.page.title();
  }

  /** 等待页面加载完成 */
  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }
}
```

#### 19.1.3 LoginPage 实现

```typescript
// pages/LoginPage.ts
import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { DashboardPage } from './DashboardPage';

export class LoginPage extends BasePage {
  get url() { return '/login'; }

  // 元素定位器 — 集中管理
  private get emailInput() { return this.page.getByLabel('邮箱'); }
  private get passwordInput() { return this.page.getByLabel('密码'); }
  private get loginButton() { return this.page.getByRole('button', { name: '登录' }); }
  private get errorMessage() { return this.page.getByTestId('error-message'); }

  /** 执行登录，返回 DashboardPage */
  async loginAs(email: string, password: string): Promise<DashboardPage> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
    await this.page.waitForURL('/dashboard');
    return new DashboardPage(this.page);
  }

  /** 执行登录，预期失败（停留在当前页） */
  async loginExpectingError(email: string, password: string): Promise<string> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
    await this.errorMessage.waitFor({ state: 'visible' });
    return this.errorMessage.textContent() as Promise<string>;
  }
}
```

#### 19.1.4 DashboardPage

```typescript
// pages/DashboardPage.ts
export class DashboardPage extends BasePage {
  get url() { return '/dashboard'; }

  private get welcomeMessage() { return this.page.getByTestId('welcome-msg'); }
  private get logoutButton() { return this.page.getByRole('button', { name: '退出' }); }

  async getWelcomeText(): Promise<string> {
    return this.welcomeMessage.textContent() as Promise<string>;
  }

  async logout(): Promise<LoginPage> {
    await this.logoutButton.click();
    return new LoginPage(this.page);
  }
}
```

#### 19.1.5 使用 Page Object 的测试

```typescript
// ✅ 清晰、无重复、UI 变更只需修改 Page Object
test('用户登录成功', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();

  const dashboard = await loginPage.loginAs('user@test.com', 'pass123');
  const welcome = await dashboard.getWelcomeText();

  expect(welcome).toContain('欢迎');
});

test('错误密码应显示错误信息', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();

  const error = await loginPage.loginExpectingError('user@test.com', 'wrong');

  expect(error).toContain('邮箱或密码不正确');
});
```

#### 19.1.6 Page Component 组合模式

对于复杂页面，将可复用的 UI 区块提取为 Component：

```typescript
// components/HeaderComponent.ts
export class HeaderComponent {
  constructor(private page: Page) {}

  private get searchBox() { return this.page.getByRole('searchbox'); }
  private get avatar() { return this.page.getByTestId('user-avatar'); }
  private get notificationBell() { return this.page.getByTestId('notification-bell'); }

  async search(query: string): Promise<void> {
    await this.searchBox.fill(query);
    await this.searchBox.press('Enter');
  }

  async getNotificationCount(): Promise<number> {
    const badge = this.page.getByTestId('notification-count');
    const text = await badge.textContent();
    return parseInt(text ?? '0', 10);
  }
}

// DashboardPage 组合 HeaderComponent
export class DashboardPage extends BasePage {
  readonly header = new HeaderComponent(this.page);  // 组合
  // ...
}

// 使用
test('搜索功能', async ({ page }) => {
  const dashboard = new DashboardPage(page);
  await dashboard.goto();
  await dashboard.header.search('蛋白质');
  // ...
});
```

#### 19.1.7 最佳实践与反模式

| 实践 | 说明 |
|------|------|
| **返回新的 Page Object** | `loginAs()` 返回 `DashboardPage`，页面跳转通过类型系统表达 |
| **不在 PO 中写断言** | PO 提供数据，测试做断言 |
| **用 getByRole/getByLabel** | 优先使用语义化定位器 |
| **私有化定位器** | 测试不应直接访问选择器 |

| 反模式 | 问题 |
|--------|------|
| PO 中包含 `expect()` | 断言逻辑与页面逻辑耦合 |
| 暴露 Locator 给测试 | 失去了封装的意义 |
| 一个 PO 几千行 | 应该拆分为 Component |
| PO 之间互相继承 4+ 层 | 改用组合 |

---

### 19.2 Screenplay 模式

Screenplay 由 John Smart 提出，是 Page Object 的替代方案，更贴近自然语言描述。

#### 核心概念

```
┌──────────────────────────────────────────────────┐
│                Screenplay 模型                     │
│                                                    │
│  Actor（演员）                                     │
│    │                                               │
│    ├── has Abilities（能力）                        │
│    │   ├── BrowseTheWeb（操作浏览器）               │
│    │   ├── CallAnApi（调用 API）                    │
│    │   └── AuthenticateWith（认证）                 │
│    │                                               │
│    ├── attempts to perform Tasks（执行任务）         │
│    │   ├── Login（登录）                           │
│    │   ├── AddToCart（加入购物车）                   │
│    │   └── Checkout（结账）                         │
│    │                                               │
│    └── asks Questions（提问）                       │
│        ├── TheWelcomeMessage（欢迎信息是什么？）     │
│        ├── TheCartTotal（购物车总价是多少？）         │
│        └── TheErrorMessage（错误信息是什么？）       │
└──────────────────────────────────────────────────┘
```

#### TypeScript 实现

```typescript
// Actor
class Actor {
  private abilities = new Map<string, unknown>();

  static named(name: string): Actor {
    return new Actor(name);
  }

  constructor(public readonly name: string) {}

  whoCan(...abilities: Ability[]): this {
    abilities.forEach(a => this.abilities.set(a.constructor.name, a));
    return this;
  }

  abilityTo<T extends Ability>(type: new (...args: any[]) => T): T {
    return this.abilities.get(type.name) as T;
  }

  async attemptsTo(...tasks: Task[]): Promise<void> {
    for (const task of tasks) {
      await task.performAs(this);
    }
  }

  async asks<T>(question: Question<T>): Promise<T> {
    return question.answeredBy(this);
  }
}

// Ability
interface Ability {}

class BrowseTheWeb implements Ability {
  constructor(public readonly page: Page) {}
  static using(page: Page): BrowseTheWeb {
    return new BrowseTheWeb(page);
  }
}

// Task
interface Task {
  performAs(actor: Actor): Promise<void>;
}

class Login implements Task {
  constructor(
    private email: string,
    private password: string
  ) {}

  static withCredentials(email: string, password: string): Login {
    return new Login(email, password);
  }

  async performAs(actor: Actor): Promise<void> {
    const page = actor.abilityTo(BrowseTheWeb).page;
    await page.goto('/login');
    await page.getByLabel('邮箱').fill(this.email);
    await page.getByLabel('密码').fill(this.password);
    await page.getByRole('button', { name: '登录' }).click();
  }
}

// Question
interface Question<T> {
  answeredBy(actor: Actor): Promise<T>;
}

class TheWelcomeMessage implements Question<string> {
  static displayed(): TheWelcomeMessage { return new TheWelcomeMessage(); }

  async answeredBy(actor: Actor): Promise<string> {
    const page = actor.abilityTo(BrowseTheWeb).page;
    return page.getByTestId('welcome-msg').textContent() as Promise<string>;
  }
}
```

#### 使用 Screenplay 的测试

```typescript
test('用户可以登录并看到欢迎信息', async ({ page }) => {
  const 张三 = Actor.named('张三').whoCan(BrowseTheWeb.using(page));

  await 张三.attemptsTo(
    Login.withCredentials('zhang@test.com', 'pass123')
  );

  const message = await 张三.asks(TheWelcomeMessage.displayed());
  expect(message).toContain('欢迎');
});
```

#### Page Object vs Screenplay 对比

| 维度 | Page Object | Screenplay |
|------|-------------|-----------|
| 抽象方式 | 按页面组织 | 按用户行为组织 |
| 可读性 | 好 | 更好（接近自然语言）|
| 学习曲线 | 低 | 中 |
| 适合项目规模 | 中小 | 中大 |
| 多角色测试 | 需要额外设计 | 原生支持（不同 Actor）|
| 跨页面流程 | 需要页面间传递 | Task 自然跨页面 |
| 团队接受度 | 高（广为人知）| 中（需要培训）|

---

### 19.3 Builder 模式在测试中的高级应用

#### Request Builder（API 测试）

```typescript
class ApiRequestBuilder {
  private config = {
    method: 'GET' as string,
    url: '/' as string,
    headers: {} as Record<string, string>,
    body: undefined as unknown,
    token: undefined as string | undefined,
  };

  static get(url: string): ApiRequestBuilder {
    return new ApiRequestBuilder().withMethod('GET').withUrl(url);
  }

  static post(url: string): ApiRequestBuilder {
    return new ApiRequestBuilder().withMethod('POST').withUrl(url);
  }

  private withMethod(method: string): this { this.config.method = method; return this; }
  private withUrl(url: string): this { this.config.url = url; return this; }

  withHeader(key: string, value: string): this {
    this.config.headers[key] = value;
    return this;
  }

  withAuth(token: string): this {
    this.config.token = token;
    return this;
  }

  withJsonBody(body: unknown): this {
    this.config.body = body;
    this.config.headers['Content-Type'] = 'application/json';
    return this;
  }

  async execute(): Promise<Response> {
    const headers = { ...this.config.headers };
    if (this.config.token) {
      headers['Authorization'] = `Bearer ${this.config.token}`;
    }
    return fetch(this.config.url, {
      method: this.config.method,
      headers,
      body: this.config.body ? JSON.stringify(this.config.body) : undefined,
    });
  }
}

// 使用
test('创建订单需要认证', async () => {
  const response = await ApiRequestBuilder
    .post('/api/orders')
    .withJsonBody({ items: [{ productId: 'p-1', qty: 2 }] })
    .withAuth(testToken)
    .execute();

  expect(response.status).toBe(201);
});
```

#### Scenario Builder（复杂测试场景）

```typescript
class EcommerceScenarioBuilder {
  private user: User | null = null;
  private products: Product[] = [];
  private cart: CartItem[] = [];
  private coupon: string | null = null;

  static create(): EcommerceScenarioBuilder {
    return new EcommerceScenarioBuilder();
  }

  withRegisteredUser(overrides?: Partial<User>): this {
    this.user = UserBuilder.create()
      .withName(overrides?.name ?? '测试用户')
      .build();
    return this;
  }

  withVipUser(): this {
    this.user = UserBuilder.create().asVip().build();
    return this;
  }

  withProductsInCatalog(count: number): this {
    for (let i = 0; i < count; i++) {
      this.products.push(ProductBuilder.create().build());
    }
    return this;
  }

  withItemInCart(productIndex: number = 0, qty: number = 1): this {
    this.cart.push({ product: this.products[productIndex], quantity: qty });
    return this;
  }

  withCoupon(code: string): this {
    this.coupon = code;
    return this;
  }

  async build(): Promise<TestScenario> {
    // 在数据库中创建所有必要的数据
    const user = await db.users.create(this.user!);
    const products = await Promise.all(
      this.products.map(p => db.products.create(p))
    );

    return {
      user,
      products,
      cart: this.cart,
      coupon: this.coupon,
      cleanup: async () => {
        await db.users.delete(user.id);
        await Promise.all(products.map(p => db.products.delete(p.id)));
      },
    };
  }
}

// 使用
test('VIP 用户使用优惠券结账', async () => {
  const scenario = await EcommerceScenarioBuilder.create()
    .withVipUser()
    .withProductsInCatalog(3)
    .withItemInCart(0, 2)
    .withItemInCart(1, 1)
    .withCoupon('SAVE20')
    .build();

  try {
    const total = await checkoutService.calculate(scenario);
    expect(total.discount).toBeGreaterThan(0);
    expect(total.shipping).toBe(0); // VIP 免运费
  } finally {
    await scenario.cleanup();
  }
});
```

---

### 19.4 Strategy 模式

可切换的测试执行策略，适应多浏览器、多环境场景。

```typescript
// 浏览器策略
interface BrowserStrategy {
  name: string;
  launch(): Promise<Browser>;
}

class ChromiumStrategy implements BrowserStrategy {
  name = 'Chromium';
  async launch() { return chromium.launch(); }
}

class FirefoxStrategy implements BrowserStrategy {
  name = 'Firefox';
  async launch() { return firefox.launch(); }
}

class WebKitStrategy implements BrowserStrategy {
  name = 'WebKit';
  async launch() { return webkit.launch(); }
}

// 环境策略
interface EnvironmentStrategy {
  baseUrl: string;
  apiUrl: string;
  credentials: { email: string; password: string };
}

const environments: Record<string, EnvironmentStrategy> = {
  local: {
    baseUrl: 'http://localhost:3000',
    apiUrl: 'http://localhost:8080',
    credentials: { email: 'test@local.com', password: 'test123' },
  },
  staging: {
    baseUrl: 'https://staging.example.com',
    apiUrl: 'https://api-staging.example.com',
    credentials: { email: 'test@staging.com', password: 'staging123' },
  },
};

// 配置驱动选择
const env = environments[process.env.TEST_ENV ?? 'local'];
const browserName = process.env.BROWSER ?? 'chromium';
```

---

### 19.5 Template Method 模式

定义测试的固定骨架，子类实现可变部分。

```typescript
// 抽象测试基类
abstract class CrudIntegrationTest<T> {
  abstract getRepository(): Repository<T>;
  abstract createTestEntity(): T;
  abstract getEntityId(entity: T): string;
  abstract modifyEntity(entity: T): T;

  // Template Method：固定的 CRUD 测试流程
  async testFullCrudLifecycle(): Promise<void> {
    const repo = this.getRepository();
    const entity = this.createTestEntity();

    // Create
    const saved = await repo.save(entity);
    expect(saved).toBeDefined();
    expect(this.getEntityId(saved)).toBeDefined();

    // Read
    const found = await repo.findById(this.getEntityId(saved));
    expect(found).toEqual(saved);

    // Update
    const modified = this.modifyEntity(saved);
    const updated = await repo.update(this.getEntityId(saved), modified);
    expect(updated).toEqual(modified);

    // Delete
    await repo.delete(this.getEntityId(saved));
    const deleted = await repo.findById(this.getEntityId(saved));
    expect(deleted).toBeNull();
  }
}

// 具体测试：User
class UserCrudTest extends CrudIntegrationTest<User> {
  getRepository() { return new InMemoryUserRepository(); }
  createTestEntity() { return UserBuilder.create().build(); }
  getEntityId(user: User) { return user.id; }
  modifyEntity(user: User) { return { ...user, name: '修改后' }; }
}
```

---

### 19.6 Observer/Event 模式

在不修改测试代码的前提下，通过监听执行事件实现截图、报告、通知。

#### Jest Custom Reporter

```typescript
// reporters/SlackReporter.ts
import type { Reporter, TestResult } from '@jest/reporters';
import type { AggregatedResult } from '@jest/test-result';

class SlackReporter implements Reporter {
  private failures: string[] = [];

  onTestResult(_test: unknown, result: TestResult): void {
    for (const r of result.testResults) {
      if (r.status === 'failed') {
        this.failures.push(r.fullName);
      }
    }
  }

  async onRunComplete(_: unknown, results: AggregatedResult): Promise<void> {
    const { numPassedTests, numFailedTests } = results;
    const emoji = numFailedTests === 0 ? ':white_check_mark:' : ':x:';

    // 打印执行时间直方图
    console.log('\n┌───── 执行时间分布 ─────┐');
    // ... (略)
    console.log('└────────────────────────┘');

    // 发送 Slack 通知
    if (process.env.SLACK_WEBHOOK_URL) {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `${emoji} 测试结果: ${numPassedTests} 通过, ${numFailedTests} 失败`,
        }),
      });
    }
  }
}
```

#### pytest 钩子

```python
# conftest.py
import pytest
import time

@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    report = outcome.get_result()

    if report.when == "call" and report.failed:
        # 失败时自动截图
        page = item.funcargs.get("page")
        if page:
            screenshot_path = f"reports/{item.name}_{int(time.time())}.png"
            page.screenshot(path=screenshot_path)
            print(f"  截图已保存: {screenshot_path}")

def pytest_terminal_summary(terminalreporter, exitstatus):
    """在终端打印自定义摘要"""
    terminalreporter.write_sep("=", "自定义报告")
    # ... 生成 HTML 报告、发送通知等
```

---

### 19.7 Repository 模式的可测试性设计

#### 接口定义

```typescript
interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findAll(filter?: UserFilter, sort?: SortOptions, page?: PageOptions): Promise<PagedResult<User>>;
  save(user: Omit<User, 'id'>): Promise<User>;
  update(id: string, data: Partial<User>): Promise<User | null>;
  delete(id: string): Promise<boolean>;
  count(filter?: UserFilter): Promise<number>;
}
```

#### InMemoryRepository

```typescript
class InMemoryUserRepository implements UserRepository {
  private users = new Map<string, User>();
  private idCounter = 0;

  async save(data: Omit<User, 'id'>): Promise<User> {
    const id = `user-${++this.idCounter}`;
    const user = { ...data, id };
    this.users.set(id, user);
    return { ...user };
  }

  async findById(id: string): Promise<User | null> {
    const user = this.users.get(id);
    return user ? { ...user } : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === email.toLowerCase()) {
        return { ...user };
      }
    }
    return null;
  }

  async findAll(
    filter?: UserFilter,
    sort?: SortOptions,
    page?: PageOptions
  ): Promise<PagedResult<User>> {
    let results = [...this.users.values()];

    // 过滤
    if (filter?.role) results = results.filter(u => u.role === filter.role);
    if (filter?.isActive !== undefined) results = results.filter(u => u.isActive === filter.isActive);
    if (filter?.nameContains) {
      results = results.filter(u => u.name.includes(filter.nameContains!));
    }

    const total = results.length;

    // 排序
    if (sort) {
      results.sort((a, b) => {
        const aVal = String(a[sort.field as keyof User] ?? '');
        const bVal = String(b[sort.field as keyof User] ?? '');
        return sort.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      });
    }

    // 分页
    const pageNum = page?.page ?? 1;
    const pageSize = page?.pageSize ?? 20;
    const start = (pageNum - 1) * pageSize;
    const paged = results.slice(start, start + pageSize);

    return {
      data: paged.map(u => ({ ...u })),
      total,
      page: pageNum,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    const existing = this.users.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...data, id };
    this.users.set(id, updated);
    return { ...updated };
  }

  async delete(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  async count(filter?: UserFilter): Promise<number> {
    const result = await this.findAll(filter);
    return result.total;
  }

  clear(): void { this.users.clear(); this.idCounter = 0; }
}
```

#### 契约测试：确保 Fake 与 Real 行为一致

```typescript
/**
 * 契约测试函数：对任何 UserRepository 实现运行同一组测试。
 * InMemory 和 Postgres 实现都必须通过这些测试。
 */
function userRepositoryContractTests(
  createRepo: () => Promise<{ repo: UserRepository; cleanup: () => Promise<void> }>
) {
  let repo: UserRepository;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const result = await createRepo();
    repo = result.repo;
    cleanup = result.cleanup;
  });

  afterEach(async () => { await cleanup(); });

  test('save 后 findById 应返回相同的用户', async () => {
    const saved = await repo.save({ name: '张三', email: 'z@t.com', role: 'member', isActive: true });
    const found = await repo.findById(saved.id);
    expect(found).toEqual(saved);
  });

  test('findById 不存在的 ID 返回 null', async () => {
    expect(await repo.findById('nonexistent')).toBeNull();
  });

  test('findByEmail 大小写不敏感', async () => {
    await repo.save({ name: '张三', email: 'Zhang@Test.COM', role: 'member', isActive: true });
    const found = await repo.findByEmail('zhang@test.com');
    expect(found).not.toBeNull();
    expect(found!.name).toBe('张三');
  });

  test('update 应只修改指定字段', async () => {
    const saved = await repo.save({ name: '原名', email: 'o@t.com', role: 'member', isActive: true });
    const updated = await repo.update(saved.id, { name: '新名' });
    expect(updated!.name).toBe('新名');
    expect(updated!.email).toBe('o@t.com'); // 未修改字段保持不变
  });

  test('delete 后 findById 返回 null', async () => {
    const saved = await repo.save({ name: '待删', email: 'd@t.com', role: 'member', isActive: true });
    await repo.delete(saved.id);
    expect(await repo.findById(saved.id)).toBeNull();
  });

  test('findAll 按角色过滤', async () => {
    await repo.save({ name: 'A', email: 'a@t.com', role: 'admin', isActive: true });
    await repo.save({ name: 'B', email: 'b@t.com', role: 'member', isActive: true });
    const result = await repo.findAll({ role: 'admin' });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].role).toBe('admin');
  });

  test('findAll 分页正确', async () => {
    for (let i = 1; i <= 25; i++) {
      await repo.save({ name: `User${i}`, email: `u${i}@t.com`, role: 'member', isActive: true });
    }
    const page1 = await repo.findAll(undefined, undefined, { page: 1, pageSize: 10 });
    expect(page1.data).toHaveLength(10);
    expect(page1.total).toBe(25);
    expect(page1.totalPages).toBe(3);
  });
}

// 对 InMemory 运行契约测试
describe('InMemoryUserRepository', () => {
  userRepositoryContractTests(async () => {
    const repo = new InMemoryUserRepository();
    return { repo, cleanup: async () => repo.clear() };
  });
});

// 对 Postgres 运行相同的契约测试（CI 中启用）
// describe('PostgresUserRepository', () => { ... });
```

---

### 19.8 自定义 Matcher 与 Assertion

#### Jest expect.extend

```typescript
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    return {
      pass,
      message: () => pass
        ? `期望 ${received} 不在 [${floor}, ${ceiling}] 内`
        : `期望 ${received} 在 [${floor}, ${ceiling}] 内`,
    };
  },

  toBeValidEmail(received: string) {
    const pass = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(received);
    return {
      pass,
      message: () => `期望 "${received}" ${pass ? '不' : ''}是有效邮箱`,
    };
  },

  toBeValidUUID(received: string) {
    const pass = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(received);
    return {
      pass,
      message: () => `期望 "${received}" ${pass ? '不' : ''}是有效 UUID v4`,
    };
  },
});

// 使用
expect(user.email).toBeValidEmail();
expect(user.id).toBeValidUUID();
expect(healthScore).toBeWithinRange(0, 100);
```

---

### 19.9 测试工具类库设计

#### TestClock：可控制的时间

```typescript
class TestClock {
  private currentTime: Date;

  constructor(initial: Date = new Date('2026-01-01T00:00:00Z')) {
    this.currentTime = new Date(initial.getTime());
  }

  now(): Date { return new Date(this.currentTime.getTime()); }

  advanceByMinutes(min: number): this {
    this.currentTime = new Date(this.currentTime.getTime() + min * 60000);
    return this;
  }

  advanceByHours(hours: number): this { return this.advanceByMinutes(hours * 60); }
  advanceByDays(days: number): this { return this.advanceByMinutes(days * 1440); }
}

// 使用
test('Token 1 小时后过期', () => {
  const clock = new TestClock();
  const tokenService = new TokenService(clock);
  const token = tokenService.generate('user-1');

  clock.advanceByMinutes(59);
  expect(tokenService.isValid(token)).toBe(true);

  clock.advanceByMinutes(2);
  expect(tokenService.isValid(token)).toBe(false);
});
```

#### TestEventBus：同步事件捕获

```typescript
class TestEventBus {
  private events: { name: string; payload: unknown }[] = [];

  emit(name: string, payload: unknown): void {
    this.events.push({ name, payload: structuredClone(payload) });
  }

  assertEventEmitted(name: string, count?: number): void {
    const matching = this.events.filter(e => e.name === name);
    if (matching.length === 0) {
      throw new Error(`事件 "${name}" 未被发出。已捕获: ${this.events.map(e => e.name).join(', ')}`);
    }
    if (count !== undefined && matching.length !== count) {
      throw new Error(`事件 "${name}" 期望 ${count} 次，实际 ${matching.length} 次`);
    }
  }

  assertEventOrder(...names: string[]): void {
    const captured = this.events.map(e => e.name);
    let lastIdx = -1;
    for (const name of names) {
      const idx = captured.indexOf(name, lastIdx + 1);
      if (idx === -1) throw new Error(`事件顺序不匹配，"${name}" 未在正确位置`);
      lastIdx = idx;
    }
  }

  reset(): void { this.events = []; }
}
```

#### 设计哲学总结

```
生产代码用          →     测试代码用
───────────────────────────────────
Date.now()          →     TestClock（可控时间）
Math.random()       →     TestRandom（确定性随机）
fetch()             →     TestHttpClient（记录+预设）
EventEmitter        →     TestEventBus（同步捕获）
console.log         →     TestLogger（可查询可断言）
```

**核心原则：** 使隐式的变为显式的，使不可控的变为可控的。

---

### 19.10 实战练习

1. **Page Object 重构：** 将一组混乱的 E2E 测试重构为 Page Object 模式
2. **Builder 模式：** 为博客系统设计 PostBuilder + CommentBuilder
3. **自定义 Matcher：** 为金融系统实现 `toBeValidCurrency()`、`toBalanceWith()`
4. **Repository 契约测试：** 为 Todo App 实现 InMemory + SQLite 双实现，共享契约测试
5. **综合测试基础设施：** 为聊天应用设计 TestClock + TestWebSocket + ChatRoomBuilder


---

## 第二十章：真实世界的测试案例研究

软件测试的理论知识固然重要，但真正的能力提升往往来自于对真实项目的深入剖析。在前面的章节中，我们系统地学习了单元测试、集成测试、端到端测试、性能测试等各类测试技术。然而，当你面对一个真实的项目——一个有着复杂业务逻辑、历史遗留代码、紧迫交付压力的项目时——如何将这些技术有机地组合在一起，制定出切实可行的测试策略，才是最大的挑战。

本章精选了五个来自不同领域的真实案例，每个案例都经过脱敏处理，但保留了核心的技术决策过程和关键代码。这些案例覆盖了从后端 API 到前端应用、从微服务架构到数据管道的常见场景。

**如何阅读本章的案例：**

| 阅读策略 | 说明 |
|---------|------|
| **先看背景和挑战** | 理解项目面临的现实约束，这些约束决定了技术选型 |
| **关注决策过程** | 重点不是"用了什么工具"，而是"为什么选择这个方案" |
| **动手复现代码** | 每个案例都提供了可运行的代码片段，建议在本地环境中实际运行 |
| **思考替代方案** | 每个决策都有取舍，思考在你的项目中是否会做出不同选择 |
| **结合前面章节** | 案例中涉及的每项技术都可以回溯到前面对应的章节深入学习 |

每个案例按照统一的结构组织：**背景 → 挑战分析 → 策略制定 → 分阶段实施 → 成果度量 → 经验总结**。我们特别强调了每个阶段的代码演进过程，因为测试不是一次性工程，而是一个持续改进的旅程。

---

### 20.1 案例一：从零为 REST API 搭建完整测试体系

#### 背景

某中型电商平台的后端团队面临着严峻的质量危机。这是一个基于 Spring Boot 3.x 构建的电商 API 服务，经过 6 个月的快速迭代开发，已经上线运行并服务着数万名日活用户。

**项目概况：**

| 维度 | 详情 |
|------|------|
| 技术栈 | Spring Boot 3.2、Java 21、PostgreSQL 15、Redis 7、Gradle 8.5 |
| API 规模 | 20 个 REST 接口，分布在 5 个业务模块 |
| 团队规模 | 3 名后端开发工程师，1 名兼职 QA |
| 代码量 | 约 18,000 行 Java 代码（不含生成代码） |
| 测试现状 | **零自动化测试**，完全依赖手动测试 |
| 部署频率 | 每周一次，每次部署前手动回归测试耗时 2 天 |

**五大业务模块及其接口分布：**

```
┌─────────────────────────────────────────────────────────────┐
│                    电商平台 REST API                         │
├──────────┬──────────┬──────────┬──────────┬─────────────────┤
│ 用户模块  │ 商品模块  │ 订单模块  │ 支付模块  │   库存模块      │
│ (4个接口) │ (5个接口) │ (5个接口) │ (3个接口) │  (3个接口)      │
├──────────┼──────────┼──────────┼──────────┼─────────────────┤
│ 注册      │ 商品列表  │ 创建订单  │ 发起支付  │  查询库存       │
│ 登录      │ 商品详情  │ 查询订单  │ 支付回调  │  扣减库存       │
│ 个人信息  │ 搜索商品  │ 取消订单  │ 退款     │  库存预警        │
│ 修改密码  │ 创建商品  │ 订单列表  │          │                 │
│          │ 更新商品  │ 确认收货  │          │                 │
└──────────┴──────────┴──────────┴──────────┴─────────────────┘
```

**引发变革的导火索：** 两周前的一次常规版本发布中，一个看似无害的商品价格展示优化改动，意外地导致支付模块的金额计算逻辑出现精度丢失。这个缺陷在上线后 4 小时才被客服反馈的用户投诉发现，期间产生了约 200 笔金额异常的订单，直接经济损失超过 3 万元，更严重的是造成了用户信任危机。

事后复盘发现，这个 Bug 如果有一个简单的单元测试就能在开发阶段捕获：

```java
// 引发事故的代码——价格计算使用了 double 而非 BigDecimal
public class PriceCalculator {
    
    public double calculateTotalPrice(double unitPrice, int quantity, double discount) {
        return unitPrice * quantity * (1 - discount);
    }
    
    // 当 unitPrice = 29.99, quantity = 3, discount = 0.15 时
    // 期望结果: 76.4745 → 展示为 76.47
    // 实际结果: 76.47449999999999 → 某些场景下被截断为 76.47，
    //          但在支付接口中被四舍五入为 76.47，与订单系统的 76.48 不一致
    // 导致支付金额与订单金额校验失败，进而触发了错误的异常处理分支
}
```

管理层终于意识到，持续"裸奔"的代价远高于投入测试的成本。团队获得了 6 周的时间来建立完整的自动化测试体系。

---

#### 挑战分析

在制定测试策略之前，团队对现有代码进行了为期两天的全面审查，发现了以下五个核心问题：

**问题一：代码与数据库紧耦合**

几乎所有的业务逻辑都直接依赖 `JdbcTemplate` 或原生 SQL，没有使用 Repository 模式进行抽象。Service 层直接持有数据库连接并执行查询：

```java
// 典型的紧耦合代码——Service 层直接操作数据库
@Service
public class OrderService {
    
    @Autowired
    private JdbcTemplate jdbcTemplate;
    
    public Order createOrder(Long userId, List<OrderItem> items) {
        // 直接在 Service 中执行 SQL
        String sql = "INSERT INTO orders (user_id, status, total_amount, created_at) " +
                     "VALUES (?, ?, ?, ?)";
        
        BigDecimal totalAmount = BigDecimal.ZERO;
        for (OrderItem item : items) {
            // 直接查询数据库获取商品价格
            String priceSql = "SELECT price FROM products WHERE id = ?";
            BigDecimal price = jdbcTemplate.queryForObject(priceSql, BigDecimal.class, 
                                                            item.getProductId());
            totalAmount = totalAmount.add(price.multiply(
                BigDecimal.valueOf(item.getQuantity())));
            
            // 直接扣减库存
            String stockSql = "UPDATE products SET stock = stock - ? WHERE id = ? " +
                              "AND stock >= ?";
            int updated = jdbcTemplate.update(stockSql, item.getQuantity(), 
                                              item.getProductId(), item.getQuantity());
            if (updated == 0) {
                throw new RuntimeException("库存不足: " + item.getProductId());
            }
        }
        
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, 
                Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, userId);
            ps.setString(2, "PENDING");
            ps.setBigDecimal(3, totalAmount);
            ps.setTimestamp(4, Timestamp.from(Instant.now()));
            return ps;
        }, keyHolder);
        
        // ... 更多数据库操作
        return buildOrderFromDB(keyHolder.getKey().longValue());
    }
}
```

这种写法使得在不启动数据库的情况下完全无法进行单元测试。

**问题二：大量静态方法**

工具类和辅助方法全部使用静态方法实现，无法通过 Mock 进行隔离测试：

```java
// 无法 Mock 的静态工具类
public class PaymentUtils {
    
    // 直接读取系统环境变量
    public static String getPaymentGatewayUrl() {
        return System.getenv("PAYMENT_GATEWAY_URL");
    }
    
    // 内部调用了其他静态方法和网络请求
    public static boolean verifyPaymentSignature(String payload, String signature) {
        String secret = getPaymentGatewayUrl(); // 依赖环境变量
        String expectedSign = HmacUtils.hmacSha256(secret, payload); // Apache Commons
        return expectedSign.equals(signature);
    }
    
    // 直接发起 HTTP 请求
    public static PaymentResult initiatePayment(PaymentRequest request) {
        HttpClient client = HttpClient.newHttpClient();
        // ... 直接发起网络调用
        return parseResponse(response);
    }
}
```

**问题三：无依赖注入的组件**

部分关键组件通过 `new` 关键字直接创建依赖，而非通过 Spring 容器注入：

```java
@Service
public class NotificationService {
    
    // 硬编码创建依赖，无法替换为测试替身
    private EmailSender emailSender = new SmtpEmailSender("smtp.company.com", 587);
    private SmsClient smsClient = new AliyunSmsClient("access-key", "secret-key");
    
    public void notifyOrderCreated(Order order) {
        emailSender.send(order.getUserEmail(), "订单创建成功", 
                         buildEmailContent(order));
        smsClient.send(order.getUserPhone(), 
                       "您的订单 " + order.getId() + " 已创建成功");
    }
}
```

**问题四：配置硬编码**

数据库连接、第三方 API 密钥、业务阈值等配置散落在代码各处：

```java
public class InventoryAlertService {
    
    // 硬编码的业务阈值
    private static final int LOW_STOCK_THRESHOLD = 10;
    private static final String ALERT_EMAIL = "warehouse@company.com";
    
    // 硬编码的数据库连接（是的，还有这样的代码存在）
    private Connection getConnection() throws SQLException {
        return DriverManager.getConnection(
            "jdbc:postgresql://prod-db.internal:5432/ecommerce",
            "app_user",
            "Pr0d_P@ssw0rd!"  // 生产环境密码直接写在代码中
        );
    }
}
```

**问题五：没有接口抽象**

所有类都是具体实现，没有定义任何接口，导致无法使用多态进行测试替换：

```java
// 所有依赖都是具体类，无法替换
@RestController
public class OrderController {
    
    @Autowired
    private OrderService orderService;       // 具体类，非接口
    
    @Autowired
    private InventoryService inventoryService; // 具体类，非接口
    
    @Autowired
    private PaymentService paymentService;     // 具体类，非接口
}
```

**问题汇总评估矩阵：**

| 问题 | 影响范围 | 修复难度 | 优先级 | 受影响的类数量 |
|------|---------|---------|-------|-------------|
| 数据库紧耦合 | 所有 Service 层 | 中 | P0 | 12 个类 |
| 静态方法滥用 | 工具类和辅助方法 | 高 | P1 | 8 个类 |
| 无依赖注入 | 通知、日志等模块 | 低 | P1 | 5 个类 |
| 配置硬编码 | 全局散落 | 低 | P0 | 15 处 |
| 缺少接口抽象 | Controller-Service 层 | 中 | P2 | 所有 Service 类 |

---

#### 制定策略

**测试成熟度评估**

根据第十五章介绍的测试成熟度模型（TMM），团队当前处于 **Level 1——初始级（混乱级）**：

| 成熟度等级 | 特征 | 当前状态 |
|-----------|------|---------|
| Level 1 - 初始级 | 测试是混乱的、临时的 | **✅ 当前位置** |
| Level 2 - 定义级 | 测试过程被定义和文档化 | 6周后目标 |
| Level 3 - 集成级 | 测试集成到软件生命周期 | 3个月后目标 |
| Level 4 - 管理级 | 测试过程被度量和控制 | 6个月后目标 |
| Level 5 - 优化级 | 持续改进测试过程 | 长期目标 |

6 周的目标是从 Level 1 跃迁到 Level 2，同时为 Level 3 奠定基础。

**6 周渐进式测试引入计划：**

```
第1周        第2周        第3周        第4周        第5周        第6周
┌──────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
│▓▓▓▓▓▓▓▓▓▓│          │          │          │          │          │ 基础设施搭建
│ CI/CD    │          │          │          │          │          │
│ 依赖引入  │          │          │          │          │          │
│ 冒烟测试  │          │          │          │          │          │
├──────────┼──────────┼──────────┤          │          │          │
│          │▓▓▓▓▓▓▓▓▓▓│▓▓▓▓▓▓▓▓▓▓│          │          │          │ 单元测试
│          │ 纯函数   │ Service层 │          │          │          │
│          │ 打破依赖  │ 错误路径  │          │          │          │
│          │ 35% 覆盖 │          │          │          │          │
├──────────┼──────────┼──────────┼──────────┼──────────┤          │
│          │          │          │▓▓▓▓▓▓▓▓▓▓│▓▓▓▓▓▓▓▓▓▓│          │ 集成测试
│          │          │          │Testcontai│ API 测试  │          │
│          │          │          │ners 配置 │ 跨模块    │          │
│          │          │          │ DB 测试   │          │          │
├──────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
│          │          │          │          │          │▓▓▓▓▓▓▓▓▓▓│ E2E 测试
│          │          │          │          │          │ 核心流程  │
│          │          │          │          │          │ 支付链路  │
├──────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
│░░░░░░░░░░│░░░░░░░░░░│░░░░░░░░░░│░░░░░░░░░░│░░░░░░░░░░│░░░░░░░░░░│ 持续：代码重构
│ 贯穿整个周期，每个阶段都伴随着必要的代码重构                        │
└──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘

▓ = 主要工作阶段    ░ = 持续进行的活动
```

**测试数量目标分配（测试金字塔）：**

```
                    ╱╲
                   ╱  ╲
                  ╱ E2E╲          5 个场景测试
                 ╱  测试 ╲         (核心业务链路)
                ╱────────╲
               ╱          ╲
              ╱  集成测试    ╲      30 个集成测试
             ╱   (API +     ╲     (每个接口至少1个)
            ╱    数据库)      ╲
           ╱──────────────────╲
          ╱                    ╲
         ╱     单元测试          ╲   120 个单元测试
        ╱   (Service + Utils)    ╲  (覆盖核心业务逻辑)
       ╱──────────────────────────╲
      
      目标覆盖率：60%（6周后）→ 80%（3个月后）
```

| 测试层级 | 目标数量 | 覆盖范围 | 执行速度目标 |
|---------|---------|---------|------------|
| 单元测试 | 120 个 | Service 层 + 工具类 + 领域模型 | < 30 秒（全部） |
| 集成测试 | 30 个 | REST API + 数据库交互 + 缓存 | < 3 分钟（全部） |
| E2E 测试 | 5 个 | 用户注册→下单→支付→发货→确认 | < 5 分钟（全部） |
| **合计** | **155 个** | **行覆盖率 60%** | **< 8.5 分钟** |

---

#### 第一阶段：基础设施搭建（第1周）

第一周的目标是搭建测试基础设施，确保团队有一个可靠的、自动化的测试执行环境。这一周不写任何业务测试，专注于"让测试能跑起来"。

**步骤一：引入测试依赖**

在 `build.gradle.kts` 中添加完整的测试工具链：

```kotlin
// build.gradle.kts
plugins {
    id("org.springframework.boot") version "3.2.4"
    id("io.spring.dependency-management") version "1.1.4"
    java
    jacoco // 代码覆盖率插件
}

java {
    sourceCompatibility = JavaVersion.VERSION_21
    targetCompatibility = JavaVersion.VERSION_21
}

dependencies {
    // === 生产依赖 ===
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-data-redis")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.postgresql:postgresql")
    
    // === 测试依赖 ===
    
    // JUnit 5 —— 现代 Java 测试框架
    testImplementation("org.springframework.boot:spring-boot-starter-test") {
        // spring-boot-starter-test 已包含 JUnit 5、Mockito、AssertJ
        // 排除旧版 JUnit 4 兼容包，强制团队使用 JUnit 5 风格
        exclude(group = "org.junit.vintage", module = "junit-vintage-engine")
    }
    
    // Testcontainers —— 用真实容器替代内存数据库
    testImplementation("org.testcontainers:testcontainers:1.19.7")
    testImplementation("org.testcontainers:junit-jupiter:1.19.7")
    testImplementation("org.testcontainers:postgresql:1.19.7")
    
    // REST API 测试增强
    testImplementation("io.rest-assured:rest-assured:5.4.0")
    
    // 测试数据构造
    testImplementation("org.instancio:instancio-junit:4.3.0")
    
    // 数据库迁移（测试环境也需要一致的 schema）
    implementation("org.flywaydb:flyway-core")
    implementation("org.flywaydb:flyway-database-postgresql")
}

tasks.withType<Test> {
    useJUnitPlatform()
    
    // 测试执行配置
    maxParallelForks = Runtime.getRuntime().availableProcessors() / 2
    
    // 测试报告
    testLogging {
        events("PASSED", "FAILED", "SKIPPED")
        showExceptions = true
        showCauses = true
        showStackTraces = true
    }
    
    // 与 JaCoCo 集成
    finalizedBy(tasks.jacocoTestReport)
}

// JaCoCo 覆盖率配置
jacoco {
    toolVersion = "0.8.11"
}

tasks.jacocoTestReport {
    dependsOn(tasks.test)
    
    reports {
        xml.required.set(true)   // CI 系统读取
        html.required.set(true)  // 开发者本地查看
        csv.required.set(false)
    }
    
    // 排除不需要统计覆盖率的类
    classDirectories.setFrom(
        files(classDirectories.files.map {
            fileTree(it) {
                exclude(
                    "**/config/**",        // 配置类
                    "**/entity/**",        // JPA 实体（getter/setter）
                    "**/dto/**",           // 数据传输对象
                    "**/exception/**",     // 自定义异常类
                    "**/*Application*"     // Spring Boot 启动类
                )
            }
        })
    )
}

// 覆盖率门禁——低于阈值则构建失败
tasks.jacocoTestCoverageVerification {
    violationRules {
        rule {
            limit {
                counter = "LINE"
                minimum = "0.60".toBigDecimal() // 第6周目标：60%
            }
        }
        rule {
            limit {
                counter = "BRANCH"
                minimum = "0.50".toBigDecimal() // 分支覆盖率至少 50%
            }
        }
    }
}
```

**步骤二：配置测试环境分层**

创建三个测试配置文件，分别服务于不同层级的测试：

```yaml
# src/test/resources/application-test.yml
# 单元测试不需要此文件（不启动 Spring 容器）
# 此文件用于 @SpringBootTest 等集成测试

spring:
  datasource:
    # 由 Testcontainers 动态注入，此处留空
    url: jdbc:tc:postgresql:15:///testdb
    driver-class-name: org.testcontainers.jdbc.ContainerDatabaseDriver
  jpa:
    hibernate:
      ddl-auto: validate  # 使用 Flyway 管理 schema，Hibernate 仅验证
    show-sql: true
    properties:
      hibernate:
        format_sql: true
  flyway:
    enabled: true
    locations: classpath:db/migration
  data:
    redis:
      host: localhost
      port: 6380  # 测试 Redis 使用不同端口，避免冲突

# 测试环境专用配置
app:
  payment:
    gateway-url: http://localhost:8089/mock-payment  # Mock 支付网关
    timeout-seconds: 5
  inventory:
    low-stock-threshold: 10
    alert-email: test@example.com
```

**步骤三：编写基础测试支撑类**

为后续的集成测试创建可复用的基类：

```java
package com.ecommerce.test.support;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

/**
 * 集成测试基类。
 * 所有需要启动 Spring 容器 + 真实数据库的测试都应继承此类。
 * 
 * 使用 Testcontainers 自动管理 PostgreSQL 和 Redis 容器的生命周期：
 * - 容器在第一个测试类加载时启动（static 字段 + @Container）
 * - 容器在所有测试执行完成后自动销毁
 * - 每个测试类共享同一组容器（提高执行速度）
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Testcontainers
public abstract class IntegrationTestBase {

    @Container
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(
            DockerImageName.parse("postgres:15-alpine"))
            .withDatabaseName("testdb")
            .withUsername("test")
            .withPassword("test")
            .withReuse(true); // 允许容器复用，显著加快测试速度

    @Container
    static final GenericContainer<?> redis = new GenericContainer<>(
            DockerImageName.parse("redis:7-alpine"))
            .withExposedPorts(6379)
            .withReuse(true);

    /**
     * 动态属性注入——将 Testcontainers 分配的随机端口注入 Spring 配置。
     * 这是连接测试代码与容器的关键桥梁。
     */
    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        // PostgreSQL
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        
        // Redis
        registry.add("spring.data.redis.host", redis::getHost);
        registry.add("spring.data.redis.port", () -> redis.getMappedPort(6379));
    }
}
```

同时创建一个轻量级的单元测试标记注解，用于与集成测试区分：

```java
package com.ecommerce.test.support;

import org.junit.jupiter.api.Tag;
import java.lang.annotation.*;

/**
 * 标记为单元测试。
 * 单元测试不启动 Spring 容器，不依赖外部资源，执行速度极快。
 * 
 * 使用方式：
 * @UnitTest
 * class PriceCalculatorTest { ... }
 * 
 * 在 CI 中可以单独运行：
 * ./gradlew test -Dgroups="unit"
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Tag("unit")
public @interface UnitTest {
}
```

```java
package com.ecommerce.test.support;

import org.junit.jupiter.api.Tag;
import java.lang.annotation.*;

/**
 * 标记为集成测试。
 * 集成测试需要启动 Spring 容器和外部依赖（数据库、缓存等）。
 * 
 * 在 CI 中可以单独运行：
 * ./gradlew test -Dgroups="integration"
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Tag("integration")
public @interface IntegrationTest {
}
```

**步骤四：设置 GitHub Actions CI 流水线**

```yaml
# .github/workflows/test.yml
name: Test Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    name: 单元测试
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: 配置 JDK 21
        uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'
          cache: 'gradle'
      
      - name: 运行单元测试
        run: ./gradlew test -Dgroups="unit" --no-daemon
      
      - name: 上传单元测试报告
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: unit-test-report
          path: build/reports/tests/test/

  integration-tests:
    name: 集成测试
    runs-on: ubuntu-latest
    needs: unit-tests  # 单元测试通过后才运行集成测试
    steps:
      - uses: actions/checkout@v4
      
      - name: 配置 JDK 21
        uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'
          cache: 'gradle'
      
      - name: 运行集成测试
        run: ./gradlew test -Dgroups="integration" --no-daemon
      
      - name: 生成覆盖率报告
        run: ./gradlew jacocoTestReport
      
      - name: 上传覆盖率报告
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: build/reports/jacoco/test/html/
      
      - name: 覆盖率门禁检查
        run: ./gradlew jacocoTestCoverageVerification
```

**步骤五：编写第一个冒烟测试**

冒烟测试的目的是验证整个测试基础设施正常工作——Spring 容器能启动、数据库能连接、API 能响应：

```java
package com.ecommerce;

import com.ecommerce.test.support.IntegrationTest;
import com.ecommerce.test.support.IntegrationTestBase;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 冒烟测试——验证应用程序能正常启动且核心基础设施就绪。
 * 
 * 这是整个测试体系的第一个测试。如果它能通过，说明：
 * 1. Spring Boot 应用能成功启动
 * 2. 数据库连接正常（Testcontainers PostgreSQL）
 * 3. Flyway 数据库迁移成功执行
 * 4. API 端点能正常响应
 */
@IntegrationTest
@DisplayName("冒烟测试 - 应用启动与基础设施验证")
class SmokeTest extends IntegrationTestBase {

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    @DisplayName("应用上下文应能成功加载")
    void contextLoads() {
        // 如果 Spring 容器启动失败，这个测试会自动失败
        // 不需要任何断言——能走到这里就说明启动成功了
    }

    @Test
    @DisplayName("健康检查端点应返回 UP 状态")
    void healthEndpointShouldReturnUp() {
        ResponseEntity<String> response = restTemplate.getForEntity(
            "/actuator/health", String.class);
        
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).contains("\"status\":\"UP\"");
    }

    @Test
    @DisplayName("商品列表接口应能正常响应")
    void productListEndpointShouldRespond() {
        ResponseEntity<String> response = restTemplate.getForEntity(
            "/api/v1/products", String.class);
        
        // 不验证具体数据，只验证接口不会 500
        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
    }

    @Test
    @DisplayName("数据库连接应该正常（Testcontainers PostgreSQL）")
    void databaseConnectionShouldWork() {
        ResponseEntity<String> response = restTemplate.getForEntity(
            "/actuator/health/db", String.class);
        
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).contains("\"status\":\"UP\"");
    }
}
```

运行第一个测试并确认通过：

```bash
$ ./gradlew test --tests "com.ecommerce.SmokeTest"

> Task :test

SmokeTest > 冒烟测试 - 应用启动与基础设施验证 > 应用上下文应能成功加载 PASSED
SmokeTest > 冒烟测试 - 应用启动与基础设施验证 > 健康检查端点应返回 UP 状态 PASSED
SmokeTest > 冒烟测试 - 应用启动与基础设施验证 > 商品列表接口应能正常响应 PASSED
SmokeTest > 冒烟测试 - 应用启动与基础设施验证 > 数据库连接应该正常 PASSED

BUILD SUCCESSFUL in 28s
4 tests completed, 4 passed
```

**第一周成果检查清单：**

| 完成项 | 验证标准 |
|-------|---------|
| ✅ Gradle 测试依赖引入 | `./gradlew dependencies --configuration testImplementation` 输出正确 |
| ✅ JaCoCo 覆盖率配置 | `./gradlew jacocoTestReport` 生成 HTML 报告 |
| ✅ Testcontainers 基类 | PostgreSQL 和 Redis 容器能自动启动和销毁 |
| ✅ 测试分层标记 | `@UnitTest` 和 `@IntegrationTest` 注解可用 |
| ✅ GitHub Actions CI | PR 提交后自动运行测试，失败时阻止合并 |
| ✅ 冒烟测试通过 | 4 个冒烟测试全部绿色 |
| ✅ 团队培训 | 3 名开发者都能在本地运行测试 |

---

#### 第二阶段：单元测试（第2-3周）

第二阶段的核心目标是：**在不修改生产代码行为的前提下，通过最小化重构使关键业务逻辑变得可测试，并为最高风险的代码路径编写单元测试。**

这里遵循的原则是 Michael Feathers 在《Working Effectively with Legacy Code》中提出的核心思想：**先写测试，再重构；但要让代码可测试，往往需要先做最小化的重构。** 这是一个"鸡生蛋"的问题，解决方案是使用安全的、几乎不可能引入 Bug 的重构手法。

**步骤一：识别可测试的纯函数**

团队首先扫描代码库，寻找那些不依赖外部状态的纯函数——这些是最容易测试的起点：

```java
// 已有代码——纯计算逻辑，无外部依赖，天然可测试
public class PriceCalculator {
    
    /**
     * 计算商品总价（修复后版本——使用 BigDecimal）
     */
    public BigDecimal calculateTotalPrice(BigDecimal unitPrice, int quantity, 
                                           BigDecimal discountRate) {
        if (unitPrice == null || unitPrice.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("单价不能为空或负数");
        }
        if (quantity <= 0) {
            throw new IllegalArgumentException("数量必须为正整数");
        }
        if (discountRate == null || discountRate.compareTo(BigDecimal.ZERO) < 0 
            || discountRate.compareTo(BigDecimal.ONE) > 0) {
            throw new IllegalArgumentException("折扣率必须在 0 到 1 之间");
        }
        
        BigDecimal subtotal = unitPrice.multiply(BigDecimal.valueOf(quantity));
        BigDecimal discount = subtotal.multiply(discountRate);
        return subtotal.subtract(discount).setScale(2, RoundingMode.HALF_UP);
    }
    
    /**
     * 计算运费——根据重量和距离的阶梯定价
     */
    public BigDecimal calculateShippingFee(double weightKg, int distanceKm) {
        if (weightKg <= 0 || distanceKm <= 0) {
            throw new IllegalArgumentException("重量和距离必须为正数");
        }
        
        BigDecimal baseFee = new BigDecimal("5.00"); // 基础运费
        
        // 重量附加费：每超过 1kg 加 2 元
        BigDecimal weightSurcharge = BigDecimal.ZERO;
        if (weightKg > 1.0) {
            weightSurcharge = new BigDecimal(String.valueOf(Math.ceil(weightKg - 1.0)))
                .multiply(new BigDecimal("2.00"));
        }
        
        // 距离附加费：超过 500km 加 50%
        BigDecimal distanceMultiplier = distanceKm > 500 
            ? new BigDecimal("1.50") 
            : BigDecimal.ONE;
        
        return baseFee.add(weightSurcharge)
                       .multiply(distanceMultiplier)
                       .setScale(2, RoundingMode.HALF_UP);
    }
    
    /**
     * 判断是否满足满减条件
     */
    public BigDecimal applyFullReduction(BigDecimal totalAmount, 
                                          List<FullReductionRule> rules) {
        if (rules == null || rules.isEmpty()) {
            return totalAmount;
        }
        
        // 按门槛降序排列，匹配最大的满减规则
        return rules.stream()
            .sorted(Comparator.comparing(FullReductionRule::getThreshold).reversed())
            .filter(rule -> totalAmount.compareTo(rule.getThreshold()) >= 0)
            .findFirst()
            .map(rule -> totalAmount.subtract(rule.getReduction()))
            .orElse(totalAmount);
    }
}
```

为 `PriceCalculator` 编写完整的单元测试——覆盖正常路径、边界条件和异常情况：

```java
package com.ecommerce.service;

import com.ecommerce.model.FullReductionRule;
import com.ecommerce.test.support.UnitTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.*;

@UnitTest
@DisplayName("PriceCalculator - 价格计算器单元测试")
class PriceCalculatorTest {

    private PriceCalculator calculator;

    @BeforeEach
    void setUp() {
        calculator = new PriceCalculator();
    }

    @Nested
    @DisplayName("calculateTotalPrice - 总价计算")
    class CalculateTotalPriceTest {

        @Test
        @DisplayName("基本场景：单价 × 数量 × (1 - 折扣率)")
        void shouldCalculateBasicTotalPrice() {
            BigDecimal result = calculator.calculateTotalPrice(
                new BigDecimal("29.99"), 3, new BigDecimal("0.15"));
            
            // 29.99 × 3 = 89.97, 89.97 × 0.15 = 13.4955
            // 89.97 - 13.4955 = 76.4745 → 四舍五入 → 76.47
            assertThat(result).isEqualByComparingTo("76.47");
        }

        @Test
        @DisplayName("零折扣应返回原价 × 数量")
        void shouldReturnFullPriceWhenNoDiscount() {
            BigDecimal result = calculator.calculateTotalPrice(
                new BigDecimal("100.00"), 2, BigDecimal.ZERO);
            
            assertThat(result).isEqualByComparingTo("200.00");
        }

        @Test
        @DisplayName("100% 折扣应返回零")
        void shouldReturnZeroWhenFullDiscount() {
            BigDecimal result = calculator.calculateTotalPrice(
                new BigDecimal("99.99"), 5, BigDecimal.ONE);
            
            assertThat(result).isEqualByComparingTo("0.00");
        }

        @ParameterizedTest(name = "单价={0}, 数量={1}, 折扣={2}, 期望={3}")
        @CsvSource({
            "10.00,  1, 0.00, 10.00",
            "10.00,  1, 0.10,  9.00",
            "10.00, 10, 0.10, 90.00",
            "0.01,   1, 0.00,  0.01",   // 最小单价
            "99999.99, 1, 0.00, 99999.99", // 大金额
            "33.33,  3, 0.333, 66.64",  // 需要精确四舍五入的场景
        })
        @DisplayName("参数化测试：各种价格组合")
        void shouldCalculateCorrectly(String price, int qty, String discount, 
                                       String expected) {
            BigDecimal result = calculator.calculateTotalPrice(
                new BigDecimal(price), qty, new BigDecimal(discount));
            
            assertThat(result).isEqualByComparingTo(expected);
        }

        @Test
        @DisplayName("单价为 null 应抛出 IllegalArgumentException")
        void shouldThrowWhenPriceIsNull() {
            assertThatIllegalArgumentException()
                .isThrownBy(() -> calculator.calculateTotalPrice(
                    null, 1, BigDecimal.ZERO))
                .withMessageContaining("单价不能为空");
        }

        @Test
        @DisplayName("单价为负数应抛出 IllegalArgumentException")
        void shouldThrowWhenPriceIsNegative() {
            assertThatIllegalArgumentException()
                .isThrownBy(() -> calculator.calculateTotalPrice(
                    new BigDecimal("-1.00"), 1, BigDecimal.ZERO))
                .withMessageContaining("单价不能为空或负数");
        }

        @ParameterizedTest
        @ValueSource(ints = {0, -1, -100})
        @DisplayName("数量为零或负数应抛出异常")
        void shouldThrowWhenQuantityIsInvalid(int quantity) {
            assertThatIllegalArgumentException()
                .isThrownBy(() -> calculator.calculateTotalPrice(
                    new BigDecimal("10.00"), quantity, BigDecimal.ZERO))
                .withMessageContaining("数量必须为正整数");
        }

        @Test
        @DisplayName("折扣率超过 1 应抛出异常")
        void shouldThrowWhenDiscountExceedsOne() {
            assertThatIllegalArgumentException()
                .isThrownBy(() -> calculator.calculateTotalPrice(
                    new BigDecimal("10.00"), 1, new BigDecimal("1.01")))
                .withMessageContaining("折扣率必须在 0 到 1 之间");
        }
    }

    @Nested
    @DisplayName("calculateShippingFee - 运费计算")
    class CalculateShippingFeeTest {

        @Test
        @DisplayName("1kg 以内、500km 以内应只收基础运费")
        void shouldChargeBaseFeeForLightNearbyPackage() {
            BigDecimal fee = calculator.calculateShippingFee(0.5, 100);
            assertThat(fee).isEqualByComparingTo("5.00");
        }

        @Test
        @DisplayName("恰好 1kg 不应收取重量附加费")
        void shouldNotChargeWeightSurchargeAtExactlyOneKg() {
            BigDecimal fee = calculator.calculateShippingFee(1.0, 100);
            assertThat(fee).isEqualByComparingTo("5.00");
        }

        @Test
        @DisplayName("1.1kg 应收取 1kg 的重量附加费（向上取整）")
        void shouldChargeOneKgSurchargeForSlightlyOver() {
            BigDecimal fee = calculator.calculateShippingFee(1.1, 100);
            // 基础 5 + 附加 2×1 = 7
            assertThat(fee).isEqualByComparingTo("7.00");
        }

        @Test
        @DisplayName("3.5kg 应收取 3kg 的重量附加费")
        void shouldCalculateWeightSurchargeCorrectly() {
            BigDecimal fee = calculator.calculateShippingFee(3.5, 100);
            // 基础 5 + 附加 2×3(ceil(2.5)=3) = 11
            assertThat(fee).isEqualByComparingTo("11.00");
        }

        @Test
        @DisplayName("超过 500km 应加收 50% 距离附加费")
        void shouldApplyDistanceSurcharge() {
            BigDecimal fee = calculator.calculateShippingFee(0.5, 501);
            // (基础 5 + 附加 0) × 1.5 = 7.50
            assertThat(fee).isEqualByComparingTo("7.50");
        }

        @Test
        @DisplayName("恰好 500km 不应加收距离附加费")
        void shouldNotApplyDistanceSurchargeAtExactly500km() {
            BigDecimal fee = calculator.calculateShippingFee(0.5, 500);
            assertThat(fee).isEqualByComparingTo("5.00");
        }

        @Test
        @DisplayName("重量和距离附加费应叠加计算")
        void shouldCombineWeightAndDistanceSurcharges() {
            BigDecimal fee = calculator.calculateShippingFee(5.0, 1000);
            // 基础 5 + 重量附加 2×4 = 13, 距离 ×1.5 = 19.50
            assertThat(fee).isEqualByComparingTo("19.50");
        }
    }

    @Nested
    @DisplayName("applyFullReduction - 满减计算")
    class ApplyFullReductionTest {

        @Test
        @DisplayName("无满减规则时应返回原价")
        void shouldReturnOriginalPriceWhenNoRules() {
            BigDecimal result = calculator.applyFullReduction(
                new BigDecimal("100.00"), Collections.emptyList());
            assertThat(result).isEqualByComparingTo("100.00");
        }

        @Test
        @DisplayName("规则为 null 时应返回原价")
        void shouldReturnOriginalPriceWhenRulesNull() {
            BigDecimal result = calculator.applyFullReduction(
                new BigDecimal("100.00"), null);
            assertThat(result).isEqualByComparingTo("100.00");
        }

        @Test
        @DisplayName("满足单条满减规则时应正确减免")
        void shouldApplySingleRule() {
            List<FullReductionRule> rules = List.of(
                new FullReductionRule(new BigDecimal("100"), new BigDecimal("10"))
            );
            
            BigDecimal result = calculator.applyFullReduction(
                new BigDecimal("150.00"), rules);
            assertThat(result).isEqualByComparingTo("140.00");
        }

        @Test
        @DisplayName("多条规则时应匹配最高门槛的规则")
        void shouldApplyHighestMatchingRule() {
            List<FullReductionRule> rules = List.of(
                new FullReductionRule(new BigDecimal("100"), new BigDecimal("10")),
                new FullReductionRule(new BigDecimal("200"), new BigDecimal("30")),
                new FullReductionRule(new BigDecimal("300"), new BigDecimal("60"))
            );
            
            BigDecimal result = calculator.applyFullReduction(
                new BigDecimal("250.00"), rules);
            // 满足 100 减 10 和 200 减 30，应匹配 200 减 30
            assertThat(result).isEqualByComparingTo("220.00");
        }

        @Test
        @DisplayName("金额恰好等于门槛时应触发满减")
        void shouldApplyRuleWhenExactlyAtThreshold() {
            List<FullReductionRule> rules = List.of(
                new FullReductionRule(new BigDecimal("200"), new BigDecimal("25"))
            );
            
            BigDecimal result = calculator.applyFullReduction(
                new BigDecimal("200.00"), rules);
            assertThat(result).isEqualByComparingTo("175.00");
        }

        @Test
        @DisplayName("金额低于所有门槛时不应触发任何满减")
        void shouldNotApplyAnyRuleWhenBelowAllThresholds() {
            List<FullReductionRule> rules = List.of(
                new FullReductionRule(new BigDecimal("100"), new BigDecimal("10")),
                new FullReductionRule(new BigDecimal("200"), new BigDecimal("30"))
            );
            
            BigDecimal result = calculator.applyFullReduction(
                new BigDecimal("50.00"), rules);
            assertThat(result).isEqualByComparingTo("50.00");
        }
    }
}
```

**步骤二：打破第一批依赖——Extract Interface 与 Parameterize Constructor**

现在进入关键步骤：让原本不可测试的 Service 代码变得可测试。我们使用两种最安全的重构手法。

**手法一：Extract Interface（提取接口）**

将 `OrderService` 直接依赖的 `JdbcTemplate` 数据库操作抽取为 Repository 接口：

```java
// 第一步：定义 Repository 接口（新增文件）
package com.ecommerce.repository;

import com.ecommerce.model.Order;
import com.ecommerce.model.OrderItem;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface OrderRepository {
    
    Order save(Order order);
    
    Optional<Order> findById(Long orderId);
    
    List<Order> findByUserId(Long userId);
    
    void updateStatus(Long orderId, String status);
}
```

```java
// 第二步：定义商品 Repository 接口
package com.ecommerce.repository;

import java.math.BigDecimal;
import java.util.Optional;

public interface ProductRepository {
    
    Optional<BigDecimal> findPriceById(Long productId);
    
    boolean decreaseStock(Long productId, int quantity);
    
    int getStock(Long productId);
}
```

```java
// 第三步：将原有的 JdbcTemplate 代码移入接口实现类
package com.ecommerce.repository.impl;

import com.ecommerce.model.Order;
import com.ecommerce.repository.OrderRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.*;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public class JdbcOrderRepository implements OrderRepository {

    private final JdbcTemplate jdbcTemplate;

    public JdbcOrderRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public Order save(Order order) {
        String sql = "INSERT INTO orders (user_id, status, total_amount, created_at) " +
                     "VALUES (?, ?, ?, ?)";
        
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, 
                Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, order.getUserId());
            ps.setString(2, order.getStatus());
            ps.setBigDecimal(3, order.getTotalAmount());
            ps.setTimestamp(4, Timestamp.from(Instant.now()));
            return ps;
        }, keyHolder);
        
        order.setId(keyHolder.getKey().longValue());
        return order;
    }

    @Override
    public Optional<Order> findById(Long orderId) {
        String sql = "SELECT * FROM orders WHERE id = ?";
        List<Order> orders = jdbcTemplate.query(sql, this::mapRowToOrder, orderId);
        return orders.isEmpty() ? Optional.empty() : Optional.of(orders.get(0));
    }

    @Override
    public List<Order> findByUserId(Long userId) {
        String sql = "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC";
        return jdbcTemplate.query(sql, this::mapRowToOrder, userId);
    }

    @Override
    public void updateStatus(Long orderId, String status) {
        String sql = "UPDATE orders SET status = ? WHERE id = ?";
        jdbcTemplate.update(sql, status, orderId);
    }

    private Order mapRowToOrder(ResultSet rs, int rowNum) throws SQLException {
        Order order = new Order();
        order.setId(rs.getLong("id"));
        order.setUserId(rs.getLong("user_id"));
        order.setStatus(rs.getString("status"));
        order.setTotalAmount(rs.getBigDecimal("total_amount"));
        order.setCreatedAt(rs.getTimestamp("created_at").toInstant());
        return order;
    }
}
```

**手法二：Parameterize Constructor（参数化构造器）**

重构 `OrderService`，通过构造器注入替代字段注入和直接 `new`：

```java
// 重构后的 OrderService——依赖接口而非具体实现
package com.ecommerce.service;

import com.ecommerce.model.Order;
import com.ecommerce.model.OrderItem;
import com.ecommerce.repository.OrderRepository;
import com.ecommerce.repository.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final PriceCalculator priceCalculator;

    // 构造器注入——所有依赖通过参数传入，测试时可替换为 Mock
    public OrderService(OrderRepository orderRepository,
                        ProductRepository productRepository,
                        PriceCalculator priceCalculator) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.priceCalculator = priceCalculator;
    }

    @Transactional
    public Order createOrder(Long userId, List<OrderItem> items) {
        if (userId == null) {
            throw new IllegalArgumentException("用户ID不能为空");
        }
        if (items == null || items.isEmpty()) {
            throw new IllegalArgumentException("订单项不能为空");
        }

        BigDecimal totalAmount = BigDecimal.ZERO;

        for (OrderItem item : items) {
            // 通过接口获取价格——可被 Mock
            BigDecimal price = productRepository.findPriceById(item.getProductId())
                .orElseThrow(() -> new ProductNotFoundException(
                    "商品不存在: " + item.getProductId()));

            totalAmount = totalAmount.add(
                priceCalculator.calculateTotalPrice(
                    price, item.getQuantity(), item.getDiscountRate()));

            // 通过接口扣减库存——可被 Mock
            boolean stockDeducted = productRepository.decreaseStock(
                item.getProductId(), item.getQuantity());
            if (!stockDeducted) {
                throw new InsufficientStockException(
                    "库存不足: 商品 " + item.getProductId() + 
                    ", 需要 " + item.getQuantity());
            }
        }

        Order order = new Order();
        order.setUserId(userId);
        order.setStatus("PENDING");
        order.setTotalAmount(totalAmount);

        return orderRepository.save(order);
    }

    public Optional<Order> getOrder(Long orderId) {
        return orderRepository.findById(orderId);
    }

    public List<Order> getUserOrders(Long userId) {
        return orderRepository.findByUserId(userId);
    }

    @Transactional
    public void cancelOrder(Long orderId) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new OrderNotFoundException("订单不存在: " + orderId));

        if (!"PENDING".equals(order.getStatus())) {
            throw new IllegalStateException(
                "只有待支付状态的订单可以取消，当前状态: " + order.getStatus());
        }

        orderRepository.updateStatus(orderId, "CANCELLED");
        // TODO: 释放库存（后续迭代）
    }
}
```

**步骤三：为 OrderService 编写完整的单元测试**

现在 `OrderService` 已经依赖接口而非具体实现，我们可以使用 Mockito 进行隔离测试：

```java
package com.ecommerce.service;

import com.ecommerce.model.Order;
import com.ecommerce.model.OrderItem;
import com.ecommerce.repository.OrderRepository;
import com.ecommerce.repository.ProductRepository;
import com.ecommerce.service.exception.InsufficientStockException;
import com.ecommerce.service.exception.OrderNotFoundException;
import com.ecommerce.service.exception.ProductNotFoundException;
import com.ecommerce.test.support.UnitTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;

@UnitTest
@ExtendWith(MockitoExtension.class)
@DisplayName("OrderService - 订单服务单元测试")
class OrderServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private PriceCalculator priceCalculator;

    @Captor
    private ArgumentCaptor<Order> orderCaptor;

    private OrderService orderService;

    @BeforeEach
    void setUp() {
        orderService = new OrderService(orderRepository, productRepository, 
                                         priceCalculator);
    }

    @Nested
    @DisplayName("createOrder - 创建订单")
    class CreateOrderTest {

        @Test
        @DisplayName("正常创建单商品订单")
        void shouldCreateOrderWithSingleItem() {
            // Given - 准备测试数据和 Mock 行为
            Long userId = 1001L;
            OrderItem item = new OrderItem(2001L, 2, BigDecimal.ZERO);
            
            given(productRepository.findPriceById(2001L))
                .willReturn(Optional.of(new BigDecimal("49.99")));
            given(priceCalculator.calculateTotalPrice(
                new BigDecimal("49.99"), 2, BigDecimal.ZERO))
                .willReturn(new BigDecimal("99.98"));
            given(productRepository.decreaseStock(2001L, 2))
                .willReturn(true);
            given(orderRepository.save(any(Order.class)))
                .willAnswer(invocation -> {
                    Order saved = invocation.getArgument(0);
                    saved.setId(5001L);
                    return saved;
                });

            // When - 执行被测方法
            Order result = orderService.createOrder(userId, List.of(item));

            // Then - 验证结果
            assertThat(result.getId()).isEqualTo(5001L);
            assertThat(result.getUserId()).isEqualTo(userId);
            assertThat(result.getStatus()).isEqualTo("PENDING");
            assertThat(result.getTotalAmount()).isEqualByComparingTo("99.98");

            // 验证调用顺序和参数
            then(productRepository).should().findPriceById(2001L);
            then(productRepository).should().decreaseStock(2001L, 2);
            then(orderRepository).should().save(orderCaptor.capture());
            
            Order savedOrder = orderCaptor.getValue();
            assertThat(savedOrder.getTotalAmount()).isEqualByComparingTo("99.98");
        }

        @Test
        @DisplayName("正常创建多商品订单——总价应为各商品价格之和")
        void shouldCreateOrderWithMultipleItems() {
            // Given
            Long userId = 1001L;
            List<OrderItem> items = List.of(
                new OrderItem(2001L, 1, BigDecimal.ZERO),
                new OrderItem(2002L, 3, new BigDecimal("0.10"))
            );

            given(productRepository.findPriceById(2001L))
                .willReturn(Optional.of(new BigDecimal("100.00")));
            given(productRepository.findPriceById(2002L))
                .willReturn(Optional.of(new BigDecimal("50.00")));
            given(priceCalculator.calculateTotalPrice(
                new BigDecimal("100.00"), 1, BigDecimal.ZERO))
                .willReturn(new BigDecimal("100.00"));
            given(priceCalculator.calculateTotalPrice(
                new BigDecimal("50.00"), 3, new BigDecimal("0.10")))
                .willReturn(new BigDecimal("135.00"));
            given(productRepository.decreaseStock(anyLong(), anyInt()))
                .willReturn(true);
            given(orderRepository.save(any(Order.class)))
                .willAnswer(invocation -> {
                    Order saved = invocation.getArgument(0);
                    saved.setId(5002L);
                    return saved;
                });

            // When
            Order result = orderService.createOrder(userId, items);

            // Then
            assertThat(result.getTotalAmount()).isEqualByComparingTo("235.00");
            then(productRepository).should(times(2)).findPriceById(anyLong());
            then(productRepository).should(times(2)).decreaseStock(anyLong(), anyInt());
        }

        @Test
        @DisplayName("商品不存在时应抛出 ProductNotFoundException")
        void shouldThrowWhenProductNotFound() {
            // Given
            Long userId = 1001L;
            OrderItem item = new OrderItem(9999L, 1, BigDecimal.ZERO);
            
            given(productRepository.findPriceById(9999L))
                .willReturn(Optional.empty());

            // When & Then
            assertThatThrownBy(() -> orderService.createOrder(userId, List.of(item)))
                .isInstanceOf(ProductNotFoundException.class)
                .hasMessageContaining("商品不存在: 9999");

            // 验证不应该尝试扣减库存或保存订单
            then(productRepository).should(never()).decreaseStock(anyLong(), anyInt());
            then(orderRepository).should(never()).save(any());
        }

        @Test
        @DisplayName("库存不足时应抛出 InsufficientStockException")
        void shouldThrowWhenStockInsufficient() {
            // Given
            Long userId = 1001L;
            OrderItem item = new OrderItem(2001L, 100, BigDecimal.ZERO);
            
            given(productRepository.findPriceById(2001L))
                .willReturn(Optional.of(new BigDecimal("10.00")));
            given(priceCalculator.calculateTotalPrice(any(), anyInt(), any()))
                .willReturn(new BigDecimal("1000.00"));
            given(productRepository.decreaseStock(2001L, 100))
                .willReturn(false); // 库存扣减失败

            // When & Then
            assertThatThrownBy(() -> orderService.createOrder(userId, List.of(item)))
                .isInstanceOf(InsufficientStockException.class)
                .hasMessageContaining("库存不足")
                .hasMessageContaining("2001");

            // 验证不应该保存订单
            then(orderRepository).should(never()).save(any());
        }

        @Test
        @DisplayName("多商品订单中第二个商品库存不足时应回滚")
        void shouldFailIfSecondItemHasInsufficientStock() {
            // Given
            Long userId = 1001L;
            List<OrderItem> items = List.of(
                new OrderItem(2001L, 1, BigDecimal.ZERO),
                new OrderItem(2002L, 999, BigDecimal.ZERO)
            );

            given(productRepository.findPriceById(2001L))
                .willReturn(Optional.of(new BigDecimal("10.00")));
            given(productRepository.findPriceById(2002L))
                .willReturn(Optional.of(new BigDecimal("20.00")));
            given(priceCalculator.calculateTotalPrice(any(), anyInt(), any()))
                .willReturn(new BigDecimal("10.00"));
            given(productRepository.decreaseStock(2001L, 1))
                .willReturn(true);
            given(productRepository.decreaseStock(2002L, 999))
                .willReturn(false);

            // When & Then
            assertThatThrownBy(() -> orderService.createOrder(userId, items))
                .isInstanceOf(InsufficientStockException.class);

            then(orderRepository).should(never()).save(any());
        }

        @Test
        @DisplayName("用户ID为空时应抛出 IllegalArgumentException")
        void shouldThrowWhenUserIdIsNull() {
            OrderItem item = new OrderItem(2001L, 1, BigDecimal.ZERO);
            
            assertThatIllegalArgumentException()
                .isThrownBy(() -> orderService.createOrder(null, List.of(item)))
                .withMessageContaining("用户ID不能为空");
        }

        @Test
        @DisplayName("订单项列表为空时应抛出 IllegalArgumentException")
        void shouldThrowWhenItemsEmpty() {
            assertThatIllegalArgumentException()
                .isThrownBy(() -> orderService.createOrder(1001L, 
                    Collections.emptyList()))
                .withMessageContaining("订单项不能为空");
        }

        @Test
        @DisplayName("订单项列表为 null 时应抛出 IllegalArgumentException")
        void shouldThrowWhenItemsNull() {
            assertThatIllegalArgumentException()
                .isThrownBy(() -> orderService.createOrder(1001L, null))
                .withMessageContaining("订单项不能为空");
        }
    }

    @Nested
    @DisplayName("cancelOrder - 取消订单")
    class CancelOrderTest {

        @Test
        @DisplayName("PENDING 状态的订单应能成功取消")
        void shouldCancelPendingOrder() {
            // Given
            Order order = new Order();
            order.setId(5001L);
            order.setStatus("PENDING");
            
            given(orderRepository.findById(5001L))
                .willReturn(Optional.of(order));

            // When
            orderService.cancelOrder(5001L);

            // Then
            then(orderRepository).should().updateStatus(5001L, "CANCELLED");
        }

        @Test
        @DisplayName("已支付的订单不能取消——应抛出 IllegalStateException")
        void shouldNotCancelPaidOrder() {
            // Given
            Order order = new Order();
            order.setId(5001L);
            order.setStatus("PAID");
            
            given(orderRepository.findById(5001L))
                .willReturn(Optional.of(order));

            // When & Then
            assertThatThrownBy(() -> orderService.cancelOrder(5001L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("只有待支付状态的订单可以取消")
                .hasMessageContaining("PAID");

            then(orderRepository).should(never()).updateStatus(anyLong(), anyString());
        }

        @Test
        @DisplayName("已发货的订单不能取消")
        void shouldNotCancelShippedOrder() {
            Order order = new Order();
            order.setId(5001L);
            order.setStatus("SHIPPED");
            
            given(orderRepository.findById(5001L))
                .willReturn(Optional.of(order));

            assertThatThrownBy(() -> orderService.cancelOrder(5001L))
                .isInstanceOf(IllegalStateException.class);
        }

        @Test
        @DisplayName("订单不存在时应抛出 OrderNotFoundException")
        void shouldThrowWhenOrderNotFound() {
            given(orderRepository.findById(9999L))
                .willReturn(Optional.empty());

            assertThatThrownBy(() -> orderService.cancelOrder(9999L))
                .isInstanceOf(OrderNotFoundException.class)
                .hasMessageContaining("订单不存在: 9999");
        }
    }

    @Nested
    @DisplayName("getOrder / getUserOrders - 查询订单")
    class QueryOrderTest {

        @Test
        @DisplayName("按 ID 查询存在的订单应返回 Optional 包装的订单")
        void shouldReturnOrderWhenExists() {
            Order order = new Order();
            order.setId(5001L);
            order.setUserId(1001L);
            
            given(orderRepository.findById(5001L))
                .willReturn(Optional.of(order));

            Optional<Order> result = orderService.getOrder(5001L);

            assertThat(result).isPresent();
            assertThat(result.get().getId()).isEqualTo(5001L);
        }

        @Test
        @DisplayName("按 ID 查询不存在的订单应返回 empty Optional")
        void shouldReturnEmptyWhenOrderNotExists() {
            given(orderRepository.findById(9999L))
                .willReturn(Optional.empty());

            Optional<Order> result = orderService.getOrder(9999L);

            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("查询用户的所有订单")
        void shouldReturnAllUserOrders() {
            Order order1 = new Order();
            order1.setId(5001L);
            Order order2 = new Order();
            order2.setId(5002L);
            
            given(orderRepository.findByUserId(1001L))
                .willReturn(List.of(order1, order2));

            List<Order> results = orderService.getUserOrders(1001L);

            assertThat(results).hasSize(2);
            assertThat(results).extracting(Order::getId)
                               .containsExactly(5001L, 5002L);
        }
    }
}
```

**步骤四：验证覆盖率进展**

两周结束后，运行覆盖率报告：

```bash
$ ./gradlew test jacocoTestReport

> Task :test
PriceCalculatorTest > 总价计算 > 基本场景 PASSED
PriceCalculatorTest > 总价计算 > 零折扣应返回原价 PASSED
PriceCalculatorTest > 总价计算 > 100% 折扣应返回零 PASSED
...（共 27 个 PriceCalculator 测试）
OrderServiceTest > 创建订单 > 正常创建单商品订单 PASSED
OrderServiceTest > 创建订单 > 商品不存在时应抛出异常 PASSED
...（共 15 个 OrderService 测试）

BUILD SUCCESSFUL in 8s
46 tests completed, 46 passed

> Task :jacocoTestReport
生成覆盖率报告: build/reports/jacoco/test/html/index.html
```

**第二阶段覆盖率报告摘要：**

| 模块 | 行覆盖率 | 分支覆盖率 | 测试数量 |
|------|---------|-----------|---------|
| PriceCalculator | 98% | 95% | 27 |
| OrderService | 89% | 82% | 15 |
| PaymentUtils（已重构部分） | 45% | 30% | 4 |
| 其他 Service | 0% | 0% | 0 |
| **总计** | **37%** | **28%** | **46** |

覆盖率从 **0% 提升到 37%**，略超 35% 的阶段目标。更重要的是，最高风险的价格计算和订单创建逻辑已被覆盖，引发事故的同类 Bug 不会再次发生。

**第二阶段关键经验：**

| 教训 | 详情 |
|------|------|
| 从纯函数入手建立信心 | `PriceCalculator` 的 27 个测试让团队看到了测试的即时价值 |
| Extract Interface 是最安全的重构 | 新增接口 + 实现类，不修改原有代码行为，风险极低 |
| 构造器注入是可测试性的基石 | 从 `@Autowired` 字段注入切换到构造器注入后，Mock 变得自然 |
| `@Nested` 让测试结构清晰 | 按方法分组，每个 `@Nested` 类对应一个被测方法 |
| BDD 风格 (Given/When/Then) 提高可读性 | 配合 Mockito 的 `given().willReturn()` 语法，测试即文档 |

### 第三阶段：集成测试（第4-5周）

```java
// src/test/java/com/xianweida/integration/OrderFlowIntegrationTest.java
class OrderFlowIntegrationTest extends BaseIntegrationTest {

    private String userToken;

    @BeforeEach
    void seedData() {
        userToken = registerAndLogin("buyer@test.com", "Pass123!");

        // 创建商品（管理员操作，直接 SQL）
        jdbc.update("""
            INSERT INTO products (id, name, price, stock, category)
            VALUES
              ('p1', '有机苹果', 12.80, 100, 'fruit'),
              ('p2', '进口牛排', 68.00, 50, 'meat'),
              ('p3', '农家鸡蛋', 25.00, 200, 'egg')
            """);
    }

    @Test
    @DisplayName("完整购物流程：浏览 → 加购 → 下单 → 支付 → 查看状态")
    void shouldCompleteFullPurchaseFlow() {
        // Step 1: 浏览商品
        var products = given()
            .header("Authorization", "Bearer " + userToken)
            .get(baseUrl() + "/products")
            .then().statusCode(200)
            .extract().jsonPath().getList("content", Map.class);
        assertThat(products).hasSize(3);

        // Step 2: 加入购物车
        given()
            .header("Authorization", "Bearer " + userToken)
            .contentType(ContentType.JSON)
            .body(Map.of("productId", "p1", "quantity", 3))
            .post(baseUrl() + "/cart/items")
            .then().statusCode(201);

        given()
            .header("Authorization", "Bearer " + userToken)
            .contentType(ContentType.JSON)
            .body(Map.of("productId", "p2", "quantity", 1))
            .post(baseUrl() + "/cart/items")
            .then().statusCode(201);

        // Step 3: 查看购物车
        var cart = given()
            .header("Authorization", "Bearer " + userToken)
            .get(baseUrl() + "/cart")
            .then().statusCode(200)
            .extract().as(CartResponse.class);
        assertThat(cart.getItems()).hasSize(2);
        assertThat(cart.getTotal()).isEqualByComparingTo(new BigDecimal("106.40"));
        // 12.80 * 3 + 68.00 * 1 = 106.40, 满99免运费

        // Step 4: 创建订单
        var orderId = given()
            .header("Authorization", "Bearer " + userToken)
            .contentType(ContentType.JSON)
            .body(Map.of(
                "items", List.of(
                    Map.of("productId", "p1", "quantity", 3),
                    Map.of("productId", "p2", "quantity", 1)
                ),
                "address", "上海市浦东新区张江路100号"
            ))
            .post(baseUrl() + "/orders")
            .then().statusCode(201)
            .extract().path("id").toString();

        // Step 5: 验证订单状态
        given()
            .header("Authorization", "Bearer " + userToken)
            .get(baseUrl() + "/orders/" + orderId + "/status")
            .then().statusCode(200)
            .body("status", equalTo("PENDING_PAYMENT"));

        // Step 6: 模拟支付
        given()
            .header("Authorization", "Bearer " + userToken)
            .contentType(ContentType.JSON)
            .body(Map.of("paymentMethod", "alipay"))
            .post(baseUrl() + "/orders/" + orderId + "/pay")
            .then().statusCode(200)
            .body("status", equalTo("PAID"));

        // Step 7: 验证库存减少
        var apple = given()
            .header("Authorization", "Bearer " + userToken)
            .get(baseUrl() + "/products/p1")
            .then().statusCode(200)
            .extract().as(ProductResponse.class);
        assertThat(apple.getStock()).isEqualTo(97); // 100 - 3
    }

    @Test
    @DisplayName("未认证用户不能访问购物车")
    void shouldReject401ForUnauthenticatedUser() {
        given()
            .get(baseUrl() + "/cart")
            .then().statusCode(401);
    }

    @Test
    @DisplayName("商品搜索 + 分页")
    void shouldSearchAndPaginate() {
        var response = given()
            .header("Authorization", "Bearer " + userToken)
            .queryParam("keyword", "机")
            .queryParam("page", 0)
            .queryParam("size", 10)
            .get(baseUrl() + "/products")
            .then().statusCode(200)
            .extract().as(PageResponse.class);

        assertThat(response.getContent()).hasSize(1); // 只有"有机苹果"
        assertThat(response.getTotalElements()).isEqualTo(1);
    }
}
```

### 第四阶段：CI/CD（第6周）

```yaml
# .github/workflows/test.yml
name: Test Pipeline

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'

      - name: Cache Gradle
        uses: actions/cache@v4
        with:
          path: |
            ~/.gradle/caches
            ~/.gradle/wrapper
          key: gradle-${{ hashFiles('**/*.gradle*', '**/gradle-wrapper.properties') }}

      - name: Run unit tests
        run: ./gradlew test -x integrationTest --parallel
        timeout-minutes: 5

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: unit-test-results
          path: build/reports/tests/test/

  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: xianweida_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'

      - name: Run integration tests
        run: ./gradlew integrationTest
        timeout-minutes: 10
        env:
          SPRING_DATASOURCE_URL: jdbc:postgresql://localhost:5432/xianweida_test
          SPRING_DATASOURCE_USERNAME: test
          SPRING_DATASOURCE_PASSWORD: test

  coverage-gate:
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'

      - name: Generate coverage report
        run: ./gradlew jacocoTestReport

      - name: Check coverage threshold
        run: ./gradlew jacocoTestCoverageVerification
        # build.gradle 中配置: minimum 80% line coverage
```

### 最终结果

```
┌──────────────────────────────────────────────────────────┐
│                  6 周后的成果                              │
│                                                          │
│  指标              改造前          改造后        变化      │
│  ─────────────     ──────         ──────       ─────     │
│  测试覆盖率         0%             82%          +82%      │
│  测试用例数         0              99           +99       │
│  回归 Bug/月       6              1            -83%      │
│  部署频率          1次/周          3次/周       +200%     │
│  部署信心          "祈祷"          "放心"       ∞         │
│  线上事故          2次/月          0次/月       -100%     │
│                                                          │
│  测试分布:                                                │
│  ┌─────────────────────────────────────┐                 │
│  │  单元测试:  63 个  ████████████████ │  耗时 12s       │
│  │  集成测试:  28 个  █████████        │  耗时 45s       │
│  │  E2E 测试:   8 个  ███             │  耗时 90s       │
│  └─────────────────────────────────────┘                 │
│  总 CI 时间: ~3 分钟                                      │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 经验教训

1. **先修最痛的 Bug**——价格计算 Bug 的测试在第一周就写了，立刻赢得团队信任
2. **重构 DI 是前提**——没有依赖注入就没有可测试性，花 2 天做这件事是值得的
3. **用覆盖率门禁保护成果**——PR 必须绿灯才能合并，防止回退
4. **不要追求 100%**——82% 已经捕获了所有关键路径，剩余 18% 是 getter/setter 和异常分支

---

## 20.2 案例二：React Native 健康 App 的测试策略

### 背景

**项目：** 一个类似 AuraFitness 的 AI 餐食识别 + 营养追踪 + 打卡系统

**技术栈：** React Native 0.81 + Expo 54 + TypeScript 5.9 + Zustand

**核心功能：**
- AI 餐食照片识别（调用 Gemini Vision API）
- 营养环形图（SVG 动画）
- 每日打卡 + 连续打卡徽章
- 离线数据缓存 + 同步

### 挑战

| 挑战 | 具体表现 | 难度 |
|------|---------|------|
| AI 接口不确定性 | 同一张照片，AI 可能返回不同的食物识别结果 | 高 |
| 相机权限 | 需要设备相机，模拟器中行为不一致 | 中 |
| 离线场景 | 无网络时应缓存数据，恢复后自动同步 | 高 |
| 动画测试 | Reanimated 动画在测试环境中不执行 | 中 |
| Navigation | 多层嵌套导航栈的状态管理 | 中 |

### 测试策略

```
┌──────────────────────────────────────────────────────────┐
│                  移动端测试金字塔                           │
│                                                          │
│                    /\                                     │
│                   /  \     Detox E2E (5个)                │
│                  / E2E\    真机/模拟器                     │
│                 /──────\                                  │
│                / 集成    \   Navigation + API (15个)       │
│               / 测试      \                               │
│              /─────────────\                              │
│             / 组件 + Hook   \  RTL + Hook 测试 (45个)     │
│            / 测试            \                            │
│           /───────────────────\                           │
│          / 纯逻辑单元测试      \  工具函数 + Store (35个) │
│         /──────────────────────\                          │
│                                                          │
│  总计: 100 个测试, CI 耗时 2 分 40 秒                     │
└──────────────────────────────────────────────────────────┘
```

### AI Mock 策略

```typescript
// src/tests/mocks/aiService.mock.ts

/**
 * AI 接口的 Mock 策略：分层模拟
 *
 * Level 1: 固定响应 —— 用于大多数组件测试
 * Level 2: 基于输入的响应 —— 用于集成测试
 * Level 3: 随机扰动 —— 用于模糊测试
 */

export const AI_MOCK_RESPONSES = {
  // Level 1: 固定响应
  singleFood: {
    foods: [
      {
        name: '宫保鸡丁',
        calories: 320,
        protein: 22,
        carbs: 18,
        fat: 15,
        confidence: 0.94,
      },
    ],
    totalCalories: 320,
    processingTimeMs: 1200,
  },

  multipleFood: {
    foods: [
      { name: '米饭', calories: 230, protein: 4.3, carbs: 50, fat: 0.4, confidence: 0.97 },
      { name: '红烧排骨', calories: 380, protein: 25, carbs: 12, fat: 28, confidence: 0.89 },
      { name: '清炒时蔬', calories: 85, protein: 3, carbs: 8, fat: 5, confidence: 0.91 },
    ],
    totalCalories: 695,
    processingTimeMs: 2100,
  },

  lowConfidence: {
    foods: [
      { name: '未识别食物', calories: 0, protein: 0, carbs: 0, fat: 0, confidence: 0.23 },
    ],
    totalCalories: 0,
    processingTimeMs: 3000,
    warning: '识别置信度较低，请手动确认',
  },

  error: {
    error: 'AI_SERVICE_UNAVAILABLE',
    message: 'AI 服务暂时不可用，请稍后重试',
  },
};

// Level 2: 基于输入的 Mock
export function createSmartAIMock() {
  const responses = new Map<string, any>();

  return {
    // 注册特定图片的响应
    whenImage(imageUri: string) {
      return {
        thenReturn(response: any) {
          responses.set(imageUri, response);
        },
      };
    },

    // Mock 实现
    analyzeMealPhoto: jest.fn(async (imageUri: string) => {
      // 检查是否有预设响应
      if (responses.has(imageUri)) {
        return responses.get(imageUri);
      }
      // 默认返回单一食物
      return AI_MOCK_RESPONSES.singleFood;
    }),
  };
}
```

#### 使用 AI Mock 的组件测试

```typescript
// src/tests/screens/ReviewMealScreen.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { ReviewMealScreen } from '../../screens/ReviewMealScreen';
import { AI_MOCK_RESPONSES, createSmartAIMock } from '../mocks/aiService.mock';

// Mock AI 服务
const mockAI = createSmartAIMock();
jest.mock('../../services/aiService', () => ({
  AIService: { analyzeMealPhoto: mockAI.analyzeMealPhoto },
}));

// Mock 导航
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
  useRoute: () => ({
    params: { photoUri: 'file:///test/meal.jpg', mealType: 'lunch' },
  }),
}));

describe('ReviewMealScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('应显示 AI 识别的食物列表', async () => {
    mockAI.analyzeMealPhoto.mockResolvedValueOnce(AI_MOCK_RESPONSES.multipleFood);

    render(<ReviewMealScreen />);

    // 等待加载完成
    await waitFor(() => {
      expect(screen.getByText('米饭')).toBeTruthy();
    });

    expect(screen.getByText('红烧排骨')).toBeTruthy();
    expect(screen.getByText('清炒时蔬')).toBeTruthy();
    expect(screen.getByText('695 kcal')).toBeTruthy();
  });

  test('低置信度时应显示警告', async () => {
    mockAI.analyzeMealPhoto.mockResolvedValueOnce(AI_MOCK_RESPONSES.lowConfidence);

    render(<ReviewMealScreen />);

    await waitFor(() => {
      expect(screen.getByText(/识别置信度较低/)).toBeTruthy();
    });

    // 应该显示手动编辑按钮
    expect(screen.getByTestId('manual-edit-btn')).toBeTruthy();
  });

  test('AI 服务不可用时应显示离线输入界面', async () => {
    mockAI.analyzeMealPhoto.mockRejectedValueOnce(new Error('Network Error'));

    render(<ReviewMealScreen />);

    await waitFor(() => {
      expect(screen.getByText('AI 分析失败')).toBeTruthy();
    });

    // 应该显示手动输入表单
    expect(screen.getByTestId('manual-food-input')).toBeTruthy();
    expect(screen.getByTestId('manual-calories-input')).toBeTruthy();
  });

  test('确认后应保存餐食并跳转', async () => {
    mockAI.analyzeMealPhoto.mockResolvedValueOnce(AI_MOCK_RESPONSES.singleFood);

    render(<ReviewMealScreen />);

    await waitFor(() => {
      expect(screen.getByText('宫保鸡丁')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('confirm-meal-btn'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('Dashboard');
    });
  });
});
```

### Hook 测试

```typescript
// src/tests/hooks/useStreak.test.ts
import { renderHook, act } from '@testing-library/react-hooks';
import { useStreak } from '../../hooks/useStreak';

// Mock AsyncStorage
const mockStorage: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] ?? null)),
  setItem: jest.fn((key: string, value: string) => {
    mockStorage[key] = value;
    return Promise.resolve();
  }),
}));

describe('useStreak', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('首次使用连续天数为 0', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useStreak());
    await waitForNextUpdate();

    expect(result.current.currentStreak).toBe(0);
    expect(result.current.badgeTier).toBe('none');
  });

  test('连续3天打卡应达到铜牌', async () => {
    // 模拟前两天已打卡
    const twoDaysAgo = new Date('2026-04-02').toISOString();
    const yesterday = new Date('2026-04-03').toISOString();
    mockStorage['streak_log'] = JSON.stringify([twoDaysAgo, yesterday]);

    jest.setSystemTime(new Date('2026-04-04T10:00:00Z'));

    const { result, waitForNextUpdate } = renderHook(() => useStreak());
    await waitForNextUpdate();

    // 今天还没打卡，streak=2
    expect(result.current.currentStreak).toBe(2);

    // 执行今天的打卡
    await act(async () => {
      await result.current.logToday();
    });

    expect(result.current.currentStreak).toBe(3);
    expect(result.current.badgeTier).toBe('bronze'); // 3天=铜牌
  });

  test('中断一天后连续天数重置', async () => {
    // 3天前和2天前打了卡，昨天没打
    const threeDaysAgo = new Date('2026-04-01').toISOString();
    const twoDaysAgo = new Date('2026-04-02').toISOString();
    mockStorage['streak_log'] = JSON.stringify([threeDaysAgo, twoDaysAgo]);

    jest.setSystemTime(new Date('2026-04-04T10:00:00Z'));

    const { result, waitForNextUpdate } = renderHook(() => useStreak());
    await waitForNextUpdate();

    // 昨天断了，streak 应重置
    expect(result.current.currentStreak).toBe(0);
  });

  test('徽章等级映射正确', async () => {
    const tiers = [
      { days: 0, tier: 'none' },
      { days: 3, tier: 'bronze' },
      { days: 7, tier: 'silver' },
      { days: 14, tier: 'gold' },
      { days: 30, tier: 'platinum' },
      { days: 100, tier: 'diamond' },
    ];

    for (const { days, tier } of tiers) {
      const dates = Array.from({ length: days }, (_, i) => {
        const d = new Date('2026-04-04');
        d.setDate(d.getDate() - (days - 1 - i));
        return d.toISOString();
      });
      mockStorage['streak_log'] = JSON.stringify(dates);

      jest.setSystemTime(new Date('2026-04-04T10:00:00Z'));
      const { result, waitForNextUpdate } = renderHook(() => useStreak());
      await waitForNextUpdate();

      expect(result.current.badgeTier).toBe(tier);
    }
  });
});
```

### Navigation 测试

```typescript
// src/tests/navigation/AppNavigator.test.tsx
import { render, screen, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { AppNavigator } from '../../navigation/AppNavigator';

// 包装器：提供 NavigationContainer
function renderWithNavigation(initialRoute = 'Dashboard') {
  return render(
    <NavigationContainer>
      <AppNavigator initialRouteName={initialRoute} />
    </NavigationContainer>
  );
}

describe('AppNavigator', () => {
  test('默认显示 Dashboard 页面', () => {
    renderWithNavigation();
    expect(screen.getByTestId('dashboard-screen')).toBeTruthy();
  });

  test('底部 Tab 切换到 Nutrition 页面', () => {
    renderWithNavigation();

    fireEvent.press(screen.getByTestId('tab-nutrition'));

    expect(screen.getByTestId('nutrition-screen')).toBeTruthy();
  });

  test('点击相机 FAB 应打开相机页面', () => {
    renderWithNavigation();

    fireEvent.press(screen.getByTestId('camera-fab'));

    expect(screen.getByTestId('camera-screen')).toBeTruthy();
  });

  test('从 Dashboard 深层导航到 MealDetail', () => {
    renderWithNavigation();

    // 点击一个餐食卡片
    fireEvent.press(screen.getByTestId('meal-card-0'));

    expect(screen.getByTestId('meal-detail-screen')).toBeTruthy();
  });
});
```

### 经验教训

1. **AI Mock 分层是关键**——90% 的测试用固定响应（Level 1），只有集成测试需要智能 Mock
2. **不要测试动画细节**——测试动画的触发条件和最终状态，而非每一帧
3. **离线优先设计使测试更容易**——如果功能本身设计为离线可用，那 Mock 网络就是自然的
4. **React Native 测试要绕开原生层**——相机、文件系统、传感器全部 Mock

---

## 20.3 案例三：遗留 Node.js 电商系统的测试改造

### 背景

**项目：** "老街百货" —— 一个运行了 5 年的 Node.js + Express + MongoDB 电商系统

**现状：**

| 指标 | 数值 |
|------|------|
| 代码行数 | 28,000 行 |
| Node.js 版本 | 14（已 EOL） |
| 测试覆盖率 | 0% |
| 全局变量 | 37 个 |
| 回调嵌套 | 最深 7 层 |
| ESLint 警告 | 1,247 个 |
| 文档 | 无 |

**典型代码片段：**

```javascript
// ❌ 真实的遗留代码（已脱敏）
var db = require('../db');  // 全局数据库连接

app.post('/api/order', function(req, res) {
  var userId = req.session.userId;
  if (!userId) return res.status(401).send('not login');

  db.collection('carts').findOne({ userId: userId }, function(err, cart) {
    if (err) return res.status(500).send('db error');
    if (!cart || cart.items.length == 0)
      return res.status(400).send('cart empty');

    var total = 0;
    var i = 0;
    // 回调地狱：逐个查商品价格
    function processItem() {
      if (i >= cart.items.length) {
        // 创建订单
        db.collection('orders').insert({
          userId: userId,
          items: cart.items,
          total: total,  // Bug: 浮点数累加
          status: 'pending',
          createdAt: new Date()
        }, function(err, result) {
          if (err) return res.status(500).send('db error');
          // 清空购物车
          db.collection('carts').update(
            { userId: userId },
            { $set: { items: [] } },
            function(err) {
              if (err) console.log('clear cart failed');
              GLOBAL_ORDER_COUNT++;  // 全局计数器
              res.json({ orderId: result.insertedId, total: total });
            }
          );
        });
        return;
      }
      db.collection('products').findOne(
        { _id: cart.items[i].productId },
        function(err, product) {
          if (err) return res.status(500).send('db error');
          total += product.price * cart.items[i].quantity;
          i++;
          processItem();
        }
      );
    }
    processItem();
  });
});
```

### 改造过程

```
┌─────────────────────────────────────────────────────────────┐
│                 遗留系统改造五步法                             │
│                                                             │
│  Step 1         Step 2         Step 3                       │
│  ┌──────┐      ┌──────┐      ┌──────┐                      │
│  │特征化 │ ──→ │打破   │ ──→ │提取   │                      │
│  │测试   │      │依赖  │      │函数   │                      │
│  └──────┘      └──────┘      └──────┘                      │
│  "先拍快照"    "注入 db"     "回调 → async"                  │
│                                                             │
│  Step 4         Step 5                                      │
│  ┌──────┐      ┌──────┐                                     │
│  │补单元 │ ──→ │持续   │                                     │
│  │测试   │      │守护  │                                     │
│  └──────┘      └──────┘                                     │
│  "每个函数"    "CI 门禁"                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Step 1: 特征化测试（Characterization Test）

> 特征化测试不是测试"代码应该做什么"，而是测试"代码目前做了什么"。先固定现有行为，再安全重构。

```javascript
// tests/characterization/order-api.char.test.js
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');

let mongoServer, mongoClient, db, app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  mongoClient = new MongoClient(mongoServer.getUri());
  await mongoClient.connect();
  db = mongoClient.db('testdb');

  // 关键：用内存 MongoDB 替换全局 db
  jest.mock('../../db', () => {
    return {
      collection: (name) => db.collection(name),
    };
  });

  // 重新加载 app（此时会使用 mock 的 db）
  app = require('../../app');
});

afterAll(async () => {
  await mongoClient.close();
  await mongoServer.stop();
});

beforeEach(async () => {
  // 清理所有集合
  const collections = await db.listCollections().toArray();
  for (const col of collections) {
    await db.collection(col.name).deleteMany({});
  }
});

describe('POST /api/order — 特征化测试', () => {
  test('【快照】正常下单的完整响应结构', async () => {
    // 准备数据
    await db.collection('products').insertOne({
      _id: 'prod-1', name: '测试商品', price: 25.5, stock: 100
    });
    await db.collection('carts').insertOne({
      userId: 'user-1',
      items: [{ productId: 'prod-1', quantity: 2 }]
    });

    // 模拟已登录 session
    const agent = request.agent(app);
    await agent.post('/api/test-login').send({ userId: 'user-1' });

    const res = await agent.post('/api/order');

    // 特征化：记录当前行为（不判断对错）
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('orderId');
    expect(res.body).toHaveProperty('total');

    // ⚠️ 注意：当前 total 是 51（浮点数累加）
    // 这可能是 Bug，但特征化测试先记录现状
    expect(res.body.total).toBe(51);
  });

  test('【快照】未登录应返回 401', async () => {
    const res = await request(app).post('/api/order');
    expect(res.status).toBe(401);
    expect(res.text).toBe('not login');
  });

  test('【快照】空购物车应返回 400', async () => {
    await db.collection('carts').insertOne({
      userId: 'user-1', items: []
    });

    const agent = request.agent(app);
    await agent.post('/api/test-login').send({ userId: 'user-1' });

    const res = await agent.post('/api/order');
    expect(res.status).toBe(400);
    expect(res.text).toBe('cart empty');
  });
});
```

### Step 2: 打破全局依赖

```javascript
// ❌ 改造前：全局 require
var db = require('../db');  // 模块级全局变量

app.post('/api/order', function(req, res) {
  db.collection('carts').findOne(/*...*/);
});

// ✅ 改造后：工厂函数 + 依赖注入
// routes/order.js
function createOrderRouter(dependencies) {
  const { db, logger } = dependencies;
  const router = require('express').Router();

  router.post('/', async function(req, res) {
    // 使用注入的 db
    const cart = await db.collection('carts').findOne({
      userId: req.session.userId
    });
    // ...
  });

  return router;
}

module.exports = { createOrderRouter };

// app.js
const db = require('./db');
const { createOrderRouter } = require('./routes/order');

app.use('/api/order', createOrderRouter({ db, logger: console }));
```

### Step 3: 回调地狱 → async/await

```javascript
// ❌ 改造前：7 层回调嵌套
function processItem() {
  if (i >= cart.items.length) {
    db.collection('orders').insert(/*...*/, function(err, result) {
      if (err) return res.status(500).send('db error');
      db.collection('carts').update(/*...*/, function(err) {
        GLOBAL_ORDER_COUNT++;
        res.json({/*...*/});
      });
    });
    return;
  }
  db.collection('products').findOne(/*...*/, function(err, product) {
    total += product.price * cart.items[i].quantity;
    i++;
    processItem();
  });
}

// ✅ 改造后：async/await + 提取纯函数
// services/orderService.js
class OrderService {
  constructor(db) {
    this.db = db;
  }

  async createOrder(userId) {
    const cart = await this.db.collection('carts').findOne({ userId });
    if (!cart || cart.items.length === 0) {
      throw new AppError('CART_EMPTY', '购物车为空', 400);
    }

    const itemsWithPrices = await this.resolveItemPrices(cart.items);
    const total = this.calculateTotal(itemsWithPrices);

    const order = {
      userId,
      items: itemsWithPrices,
      total,
      status: 'pending',
      createdAt: new Date(),
    };

    const result = await this.db.collection('orders').insertOne(order);
    await this.db.collection('carts').updateOne(
      { userId },
      { $set: { items: [] } }
    );

    return { orderId: result.insertedId, total };
  }

  async resolveItemPrices(cartItems) {
    const resolved = [];
    for (const item of cartItems) {
      const product = await this.db.collection('products').findOne({
        _id: item.productId,
      });
      if (!product) {
        throw new AppError('PRODUCT_NOT_FOUND', `商品 ${item.productId} 不存在`, 404);
      }
      resolved.push({
        ...item,
        name: product.name,
        unitPrice: product.price,
        subtotal: product.price * item.quantity,
      });
    }
    return resolved;
  }

  /** 纯函数：可独立测试 */
  calculateTotal(items) {
    // 使用整数运算避免浮点精度问题
    const totalCents = items.reduce(
      (sum, item) => sum + Math.round(item.subtotal * 100),
      0
    );
    return totalCents / 100;
  }
}

module.exports = { OrderService };
```

### Step 4: 为提取的纯函数补充单元测试

```javascript
// tests/unit/orderService.test.js
const { OrderService } = require('../../services/orderService');

describe('OrderService.calculateTotal', () => {
  const service = new OrderService(null); // 纯函数不需要 db

  test('应正确计算总价', () => {
    const items = [
      { subtotal: 25.5 },
      { subtotal: 12.3 },
      { subtotal: 8.8 },
    ];
    expect(service.calculateTotal(items)).toBe(46.6);
  });

  test('浮点精度：0.1 + 0.2 应等于 0.3', () => {
    const items = [
      { subtotal: 0.1 },
      { subtotal: 0.2 },
    ];
    expect(service.calculateTotal(items)).toBe(0.3);
  });

  test('空数组应返回 0', () => {
    expect(service.calculateTotal([])).toBe(0);
  });

  test('大金额不应溢出', () => {
    const items = [
      { subtotal: 99999.99 },
      { subtotal: 88888.88 },
    ];
    expect(service.calculateTotal(items)).toBe(188888.87);
  });
});

// tests/unit/orderService.createOrder.test.js
describe('OrderService.createOrder', () => {
  let service;
  let mockDb;

  beforeEach(() => {
    // 构建内存 Mock DB
    const collections = {
      carts: {
        findOne: jest.fn(),
        updateOne: jest.fn().mockResolvedValue({}),
      },
      products: {
        findOne: jest.fn(),
      },
      orders: {
        insertOne: jest.fn().mockResolvedValue({ insertedId: 'order-001' }),
      },
    };
    mockDb = { collection: (name) => collections[name] };
    mockDb._collections = collections;
    service = new OrderService(mockDb);
  });

  test('正常创建订单', async () => {
    mockDb._collections.carts.findOne.mockResolvedValue({
      userId: 'u1',
      items: [{ productId: 'p1', quantity: 2 }],
    });
    mockDb._collections.products.findOne.mockResolvedValue({
      _id: 'p1', name: '苹果', price: 5.5,
    });

    const result = await service.createOrder('u1');

    expect(result.orderId).toBe('order-001');
    expect(result.total).toBe(11);
    expect(mockDb._collections.carts.updateOne).toHaveBeenCalledWith(
      { userId: 'u1' },
      { $set: { items: [] } }
    );
  });

  test('购物车为空应抛出错误', async () => {
    mockDb._collections.carts.findOne.mockResolvedValue({
      userId: 'u1', items: [],
    });

    await expect(service.createOrder('u1')).rejects.toThrow('购物车为空');
  });

  test('商品不存在应抛出错误', async () => {
    mockDb._collections.carts.findOne.mockResolvedValue({
      userId: 'u1',
      items: [{ productId: 'ghost', quantity: 1 }],
    });
    mockDb._collections.products.findOne.mockResolvedValue(null);

    await expect(service.createOrder('u1')).rejects.toThrow('商品 ghost 不存在');
  });
});
```

### 最终结果

```
┌──────────────────────────────────────────────────────────┐
│                  改造前后对比                              │
│                                                          │
│  指标              改造前        改造后 (8周)              │
│  ─────────────     ──────       ──────                   │
│  全局变量          37 个         3 个 (仅配置)            │
│  回调最大嵌套      7 层          0 层 (全部 async)        │
│  测试覆盖率        0%            67%                     │
│  测试数量          0             78 个                    │
│  平均响应时间      340ms         280ms (重构减少开销)     │
│  月均线上 Bug      8 个          2 个                     │
│  新功能交付速度     3天/功能      1.5天/功能              │
│  ESLint 警告       1,247         83                      │
│                                                          │
│  关键修复:                                                │
│  • 浮点精度 Bug → 使用整数运算，修复 ¥ 差异问题           │
│  • 全局计数器 → 移除，改用数据库 count                    │
│  • 回调地狱 → async/await，代码行数减少 40%              │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 经验教训

1. **特征化测试是安全网**——在不理解代码意图的情况下，先固定现有行为
2. **打破全局依赖是第一步**——没有 DI 就没有可测试性
3. **纯函数先行**——从最容易提取的纯函数开始，快速积累测试数量
4. **不要一步到位**——67% 覆盖率比 0% 好无数倍，不需要等到 100%

---

## 20.4 案例四：支付系统的严格测试

### 背景

**项目：** 为 "鲜味达" 电商平台集成支付宝和微信支付

**特殊性：** 支付系统不允许有 Bug——每个 Bug 都是真金白银的损失。

**风险清单：**

| 风险 | 严重程度 | 发生概率 | 后果 |
|------|---------|---------|------|
| 金额计算错误 | 致命 | 中 | 直接经济损失 |
| 重复支付（幂等性失败） | 致命 | 中 | 用户投诉 + 退款成本 |
| 并发扣款竞态 | 高 | 低 | 超额扣款或漏扣 |
| Webhook 乱序/重放 | 高 | 中 | 订单状态错乱 |
| 对账不一致 | 高 | 中 | 财务审计问题 |
| 第三方 SDK 超时 | 中 | 高 | 用户体验差 |

### 幂等性测试

```java
// src/test/java/com/xianweida/payment/IdempotencyTest.java
@SpringBootTest
@Testcontainers
class IdempotencyTest extends BaseIntegrationTest {

    @Autowired
    private PaymentService paymentService;

    @Autowired
    private OrderRepository orderRepo;

    @Test
    @DisplayName("相同的幂等键重复提交应只处理一次")
    void shouldProcessPaymentOnlyOnce() {
        // Arrange
        var order = createOrder("user-1", new BigDecimal("99.00"));
        var idempotencyKey = "idem-key-" + UUID.randomUUID();

        // Act: 提交 3 次相同请求
        var result1 = paymentService.initiatePayment(
            order.getId(), "alipay", idempotencyKey);
        var result2 = paymentService.initiatePayment(
            order.getId(), "alipay", idempotencyKey);
        var result3 = paymentService.initiatePayment(
            order.getId(), "alipay", idempotencyKey);

        // Assert: 三次应返回相同的支付凭证
        assertThat(result1.getPaymentId()).isEqualTo(result2.getPaymentId());
        assertThat(result2.getPaymentId()).isEqualTo(result3.getPaymentId());

        // 数据库中只有 1 条支付记录
        var payments = jdbc.queryForList(
            "SELECT * FROM payments WHERE order_id = ?", order.getId()
        );
        assertThat(payments).hasSize(1);
    }

    @Test
    @DisplayName("不同的幂等键应创建不同的支付记录")
    void shouldCreateSeparatePaymentsForDifferentKeys() {
        var order = createOrder("user-1", new BigDecimal("99.00"));

        var result1 = paymentService.initiatePayment(
            order.getId(), "alipay", "key-A");
        var result2 = paymentService.initiatePayment(
            order.getId(), "alipay", "key-B");

        assertThat(result1.getPaymentId()).isNotEqualTo(result2.getPaymentId());
    }
}
```

### 并发竞态条件测试

```java
// src/test/java/com/xianweida/payment/ConcurrencyTest.java
@SpringBootTest
class ConcurrencyTest extends BaseIntegrationTest {

    @Autowired
    private PaymentService paymentService;

    @Test
    @DisplayName("并发支付同一订单应只成功一次")
    void shouldPreventDoublePay() throws InterruptedException {
        var order = createOrder("user-1", new BigDecimal("50.00"));
        int threadCount = 10;
        var latch = new CountDownLatch(threadCount);
        var startBarrier = new CyclicBarrier(threadCount);
        var results = new ConcurrentHashMap<Integer, String>();
        var errors = new ConcurrentHashMap<Integer, Exception>();

        ExecutorService executor = Executors.newFixedThreadPool(threadCount);

        for (int i = 0; i < threadCount; i++) {
            final int idx = i;
            executor.submit(() -> {
                try {
                    startBarrier.await(); // 所有线程同时开始
                    var result = paymentService.initiatePayment(
                        order.getId(), "alipay",
                        "concurrent-key-" + idx  // 不同的幂等键
                    );
                    results.put(idx, result.getPaymentId());
                } catch (Exception e) {
                    errors.put(idx, e);
                } finally {
                    latch.countDown();
                }
            });
        }

        latch.await(30, TimeUnit.SECONDS);
        executor.shutdown();

        // 应该只有 1 次成功，其余 9 次因为乐观锁冲突或状态检查失败
        assertThat(results.size()).isEqualTo(1);
        assertThat(errors.size()).isEqualTo(threadCount - 1);

        // 所有失败应该是 OrderAlreadyPaidException
        errors.values().forEach(e ->
            assertThat(e).isInstanceOf(OrderAlreadyPaidException.class)
        );
    }

    @Test
    @DisplayName("并发更新库存不应出现超卖")
    void shouldPreventOverselling() throws InterruptedException {
        // 商品库存 = 5
        var product = createProduct("限量商品", new BigDecimal("100"), 5);
        int buyerCount = 20; // 20 人同时抢购
        var latch = new CountDownLatch(buyerCount);
        var barrier = new CyclicBarrier(buyerCount);
        var successCount = new AtomicInteger(0);

        ExecutorService executor = Executors.newFixedThreadPool(buyerCount);

        for (int i = 0; i < buyerCount; i++) {
            final int idx = i;
            executor.submit(() -> {
                try {
                    barrier.await();
                    orderService.createOrder("user-" + idx, List.of(
                        new OrderItemRequest(product.getId(), 1)
                    ));
                    successCount.incrementAndGet();
                } catch (InsufficientStockException e) {
                    // 预期：库存不足
                } catch (Exception e) {
                    fail("意外异常: " + e.getMessage());
                } finally {
                    latch.countDown();
                }
            });
        }

        latch.await(30, TimeUnit.SECONDS);
        executor.shutdown();

        // 最多只有 5 笔成功
        assertThat(successCount.get()).isLessThanOrEqualTo(5);

        // 库存不应为负
        var remaining = jdbc.queryForObject(
            "SELECT stock FROM products WHERE id = ?",
            Integer.class, product.getId()
        );
        assertThat(remaining).isGreaterThanOrEqualTo(0);
    }
}
```

### 金额精度测试

```java
@Nested
@DisplayName("金额精度")
class AmountPrecision {

    @ParameterizedTest
    @CsvSource({
        "0.1,  0.2,  0.30",
        "19.99, 0.01, 20.00",
        "9.99, 9.99, 19.98",
        "0.01, 0.01, 0.02",
        "99999.99, 0.01, 100000.00",
    })
    @DisplayName("加法精度")
    void shouldAddPrecisely(String a, String b, String expected) {
        var result = MoneyUtils.add(new BigDecimal(a), new BigDecimal(b));
        assertThat(result).isEqualByComparingTo(new BigDecimal(expected));
    }

    @ParameterizedTest
    @CsvSource({
        "100.00, 3, 33.33",   // 除不尽取两位小数
        "10.00, 3, 3.33",
        "1.00, 3, 0.33",
    })
    @DisplayName("除法精度：四舍五入到分")
    void shouldDivideWithRounding(String amount, int divisor, String expected) {
        var result = MoneyUtils.divide(new BigDecimal(amount), divisor);
        assertThat(result).isEqualByComparingTo(new BigDecimal(expected));
    }

    @Test
    @DisplayName("分摊金额之和应等于原始金额")
    void shouldSplitWithoutLoss() {
        // 将 100 元分给 3 人，应该是 33.34 + 33.33 + 33.33 = 100.00
        var splits = MoneyUtils.splitEvenly(new BigDecimal("100.00"), 3);

        assertThat(splits).hasSize(3);
        var total = splits.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        assertThat(total).isEqualByComparingTo(new BigDecimal("100.00"));

        // 第一人承担余数
        assertThat(splits.get(0)).isEqualByComparingTo(new BigDecimal("33.34"));
        assertThat(splits.get(1)).isEqualByComparingTo(new BigDecimal("33.33"));
        assertThat(splits.get(2)).isEqualByComparingTo(new BigDecimal("33.33"));
    }
}
```

### Webhook 测试

```java
@Nested
@DisplayName("支付回调 Webhook")
class WebhookTests {

    @Test
    @DisplayName("正常支付成功回调")
    void shouldHandleSuccessCallback() {
        var order = createOrder("user-1", new BigDecimal("99.00"));
        var payment = initiatePayment(order.getId());

        // 模拟支付宝回调
        var callbackBody = Map.of(
            "trade_no", "ALI202604041234567890",
            "out_trade_no", payment.getPaymentId(),
            "trade_status", "TRADE_SUCCESS",
            "total_amount", "99.00"
        );

        given()
            .contentType(ContentType.FORM)
            .formParams(callbackBody)
            .post(baseUrl() + "/webhooks/payment/alipay")
            .then().statusCode(200)
            .body(equalTo("success"));

        // 验证订单状态已更新
        var updatedOrder = orderRepo.findById(order.getId()).orElseThrow();
        assertThat(updatedOrder.getStatus()).isEqualTo(OrderStatus.PAID);
    }

    @Test
    @DisplayName("重复回调应该幂等处理")
    void shouldHandleDuplicateCallback() {
        var order = createOrder("user-1", new BigDecimal("50.00"));
        var payment = initiatePayment(order.getId());

        var callbackBody = Map.of(
            "trade_no", "ALI202604041234567890",
            "out_trade_no", payment.getPaymentId(),
            "trade_status", "TRADE_SUCCESS",
            "total_amount", "50.00"
        );

        // 发送 3 次相同回调
        for (int i = 0; i < 3; i++) {
            given()
                .contentType(ContentType.FORM)
                .formParams(callbackBody)
                .post(baseUrl() + "/webhooks/payment/alipay")
                .then().statusCode(200);
        }

        // 订单状态只变更了一次
        var logs = jdbc.queryForList(
            "SELECT * FROM order_status_log WHERE order_id = ?",
            order.getId()
        );
        long paidTransitions = logs.stream()
            .filter(l -> "PAID".equals(l.get("new_status")))
            .count();
        assertThat(paidTransitions).isEqualTo(1);
    }

    @Test
    @DisplayName("金额不匹配应拒绝回调")
    void shouldRejectAmountMismatch() {
        var order = createOrder("user-1", new BigDecimal("99.00"));
        var payment = initiatePayment(order.getId());

        // 篡改金额
        var callbackBody = Map.of(
            "trade_no", "ALI202604041234567890",
            "out_trade_no", payment.getPaymentId(),
            "trade_status", "TRADE_SUCCESS",
            "total_amount", "1.00"  // 篡改为 1 元
        );

        given()
            .contentType(ContentType.FORM)
            .formParams(callbackBody)
            .post(baseUrl() + "/webhooks/payment/alipay")
            .then().statusCode(400);

        // 订单状态不应变更
        var updatedOrder = orderRepo.findById(order.getId()).orElseThrow();
        assertThat(updatedOrder.getStatus()).isEqualTo(OrderStatus.PENDING_PAYMENT);
    }

    @Test
    @DisplayName("乱序回调：先收到退款，再收到支付成功")
    void shouldHandleOutOfOrderCallbacks() {
        var order = createOrder("user-1", new BigDecimal("99.00"));
        var payment = initiatePayment(order.getId());

        // 1. 先收到退款回调（异常场景）
        given()
            .contentType(ContentType.FORM)
            .formParams(Map.of(
                "trade_no", "ALI202604041234567890",
                "out_trade_no", payment.getPaymentId(),
                "trade_status", "TRADE_CLOSED",
                "total_amount", "99.00"
            ))
            .post(baseUrl() + "/webhooks/payment/alipay")
            .then().statusCode(200);

        // 2. 再收到支付成功回调
        given()
            .contentType(ContentType.FORM)
            .formParams(Map.of(
                "trade_no", "ALI202604041234567890",
                "out_trade_no", payment.getPaymentId(),
                "trade_status", "TRADE_SUCCESS",
                "total_amount", "99.00"
            ))
            .post(baseUrl() + "/webhooks/payment/alipay")
            .then().statusCode(200);

        // 最终状态应以时间戳最新的为准（或遵循状态机规则）
        var updatedOrder = orderRepo.findById(order.getId()).orElseThrow();
        // 根据业务规则：CLOSED 后不能变回 PAID
        assertThat(updatedOrder.getStatus()).isEqualTo(OrderStatus.CLOSED);
    }
}
```

### 经验教训

1. **BigDecimal 强制使用**——支付代码禁止出现 double/float
2. **幂等键是必需品**——不是可选的，是强制的
3. **并发测试必须有**——支付场景是并发 Bug 的重灾区
4. **状态机要严格**——订单状态转换必须有状态机保护，不能跳跃
5. **Webhook 签名验证**——本案例简化了，真实系统必须验证支付宝/微信的签名

---

## 20.5 案例五：CI/CD 流水线从 30 分钟优化到 5 分钟

### 背景

**项目：** 一个中型 SaaS 应用（React + Node.js + PostgreSQL）

**问题：**

```
┌────────────────────────────────────────────────────────────┐
│                  优化前的 CI 流水线                          │
│                                                            │
│  npm install ─────────── 3 分 20 秒                        │
│       │                                                    │
│       ▼                                                    │
│  lint ──────────────── 1 分 10 秒                          │
│       │                                                    │
│       ▼                                                    │
│  type-check ─────────── 2 分 05 秒                         │
│       │                                                    │
│       ▼                                                    │
│  unit tests (serial) ── 8 分 40 秒  ← 🐌                  │
│       │                                                    │
│       ▼                                                    │
│  integration tests ──── 9 分 15 秒  ← 🐌                  │
│       │                                                    │
│       ▼                                                    │
│  e2e tests ──────────── 6 分 30 秒  ← 🐌                  │
│       │                                                    │
│       ▼                                                    │
│  build ──────────────── 1 分 45 秒                         │
│                                                            │
│  总计: 32 分 45 秒                                         │
│                                                            │
│  后果:                                                     │
│  • 开发者平均等待 33 分钟才知道 PR 是否通过                  │
│  • 47% 的开发者承认"偶尔"跳过测试直接合并                   │
│  • 每月有 3-5 次 "CI 太慢我先合了" 导致的线上事故            │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 性能分析

首先用数据定位问题，而不是凭感觉优化。

```bash
# 分析每个测试文件的执行时间
npx jest --verbose --json > test-timing.json

# 用 jq 提取最慢的 10 个测试文件
cat test-timing.json | jq '
  .testResults
  | sort_by(-.perfStats.runtime)
  | .[:10]
  | .[] | {
      file: .testFilePath,
      duration_sec: ((.perfStats.runtime / 1000) | floor)
    }
'
```

分析结果：

```
┌─────────────────────────────────────────────────────────────┐
│                  慢测试分类                                   │
│                                                             │
│  类别             数量    总耗时    占比                      │
│  ───────────      ────    ──────   ────                     │
│  DB 重连测试      12      420s     29%    ← 每个测试重启DB   │
│  E2E 浏览器       8       390s     27%    ← 串行, 无并行     │
│  大数据集测试     5       310s     21%    ← 测试用 10万行数据 │
│  HTTP 超时测试    6       180s     12%    ← 真实等超时        │
│  正常测试        158      160s     11%    ← 本身没问题        │
│                                                             │
│  关键发现:                                                   │
│  1. 前 25 个慢测试占据了 89% 的执行时间                      │
│  2. npm install 没有缓存，每次重新下载                       │
│  3. 所有步骤串行执行，没有利用并行能力                        │
│  4. integration test 每个文件都启动一个新的 PG 容器           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 优化措施

#### 优化 1：依赖缓存（3分20秒 → 15秒）

```yaml
# .github/workflows/ci.yml — 优化后
jobs:
  setup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'  # 自动缓存 node_modules

      - name: Install dependencies
        run: npm ci  # ci 比 install 更快（跳过版本解析）

      - name: Cache node_modules for downstream jobs
        uses: actions/cache@v4
        with:
          path: node_modules
          key: nm-${{ hashFiles('package-lock.json') }}
```

#### 优化 2：并行化独立步骤

```yaml
  # Lint + Type Check + Unit Tests 并行运行
  lint:
    needs: setup
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/cache@v4
        with:
          path: node_modules
          key: nm-${{ hashFiles('package-lock.json') }}
      - run: npx eslint . --max-warnings=0
    timeout-minutes: 3

  type-check:
    needs: setup
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/cache@v4
        with:
          path: node_modules
          key: nm-${{ hashFiles('package-lock.json') }}
      - run: npx tsc --noEmit
    timeout-minutes: 3

  unit-tests:
    needs: setup
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1, 2, 3, 4]  # 4 个分片并行
    steps:
      - uses: actions/checkout@v4
      - uses: actions/cache@v4
        with:
          path: node_modules
          key: nm-${{ hashFiles('package-lock.json') }}
      - name: Run unit test shard ${{ matrix.shard }}
        run: npx jest --shard=${{ matrix.shard }}/4 --forceExit
    timeout-minutes: 5
```

#### 优化 3：共享数据库容器（420秒 → 60秒）

```typescript
// jest.globalSetup.ts — 所有集成测试共享一个 PG 容器
import { PostgreSqlContainer } from '@testcontainers/postgresql';

export default async function globalSetup() {
  const container = await new PostgreSqlContainer('postgres:16-alpine')
    .withReuse(true)  // 容器复用
    .start();

  // 运行迁移
  process.env.DATABASE_URL = container.getConnectionUri();
  const { execSync } = require('child_process');
  execSync('npx prisma db push', {
    env: { ...process.env, DATABASE_URL: container.getConnectionUri() },
  });

  // 存储容器信息供测试使用
  (globalThis as any).__PG_CONTAINER__ = container;
}

// jest.globalTeardown.ts
export default async function globalTeardown() {
  // 不停止容器 — withReuse(true) 让它保持运行
  // 下次 CI 运行可以复用
}
```

#### 优化 4：测试数据降级（310秒 → 30秒）

```typescript
// ❌ 优化前：测试用 10 万行数据
test('分页查询性能', async () => {
  // 插入 100,000 条商品
  for (let i = 0; i < 100000; i++) {
    await db.product.create({ data: { name: `商品${i}`, price: i } });
  }
  // ... 测试分页
});

// ✅ 优化后：用 100 行数据 + 性能断言
test('分页查询应在 50ms 内返回', async () => {
  // 插入 100 条即可验证分页逻辑
  await db.product.createMany({
    data: Array.from({ length: 100 }, (_, i) => ({
      name: `商品${i}`, price: i * 10,
    })),
  });

  const start = performance.now();
  const result = await productService.findPaginated({ page: 3, size: 10 });
  const duration = performance.now() - start;

  expect(result.content).toHaveLength(10);
  expect(result.totalPages).toBe(10);
  expect(duration).toBeLessThan(50); // 性能门槛
});

// 大数据集性能测试移到 scheduled job，每天凌晨跑一次
```

#### 优化 5：HTTP 超时 Mock（180秒 → 5秒）

```typescript
// ❌ 优化前：真实等待超时
test('API 超时应返回 504', async () => {
  // 这个测试真的等 30 秒超时...
  nock('https://external-api.com')
    .get('/data')
    .delayConnection(31000);  // 等 31 秒

  const response = await apiClient.fetchData();
  expect(response.status).toBe(504);
}, 35000);

// ✅ 优化后：Mock 立即抛出超时错误
test('API 超时应返回 504', async () => {
  nock('https://external-api.com')
    .get('/data')
    .replyWithError({ code: 'ETIMEDOUT' });

  const response = await apiClient.fetchData();
  expect(response.status).toBe(504);
});
```

#### 优化 6：E2E 分级运行

```yaml
  # E2E 分为两级：
  # - Smoke（核心路径，每个 PR 都跑）
  # - Full（全量 E2E，只在合入 main 时跑）

  e2e-smoke:
    needs: [unit-tests, integration-tests]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/cache@v4
        with:
          path: node_modules
          key: nm-${{ hashFiles('package-lock.json') }}
      - name: Run smoke E2E tests
        run: npx playwright test --grep @smoke
        timeout-minutes: 5

  e2e-full:
    if: github.ref == 'refs/heads/main'
    needs: [e2e-smoke]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/cache@v4
        with:
          path: node_modules
          key: nm-${{ hashFiles('package-lock.json') }}
      - name: Run full E2E suite
        run: npx playwright test
        timeout-minutes: 15
```

E2E 测试标记：

```typescript
// e2e/tests/login.spec.ts
test('@smoke 用户登录后跳转到首页', async ({ page }) => {
  // 核心路径 — 每个 PR 必须跑
});

test('用户登录后点击忘记密码流程', async ({ page }) => {
  // 非核心 — 只在 main 合入时跑
});
```

### 最终优化结果

```
┌─────────────────────────────────────────────────────────────┐
│                  优化前后时间线对比                            │
│                                                             │
│  ████ 优化前 (串行, 32分45秒)                                │
│  ──────────────────────────────────────────────── 33min     │
│  [install][lint][tsc][────unit────][──integ──][─e2e─][bld]  │
│                                                             │
│  ████ 优化后 (并行, 4分52秒)                                 │
│  ─────────── 5min                                           │
│  [setup 15s]                                                │
│       ├── [lint 45s]                                        │
│       ├── [tsc 50s]                                         │
│       ├── [unit-1 58s]                                      │
│       ├── [unit-2 55s]                                      │
│       ├── [unit-3 52s]                                      │
│       └── [unit-4 49s]                                      │
│               │                                             │
│               ├── [integ 65s]                               │
│               │                                             │
│               └── [e2e-smoke 72s]                           │
│                       │                                     │
│                       └── [build 35s]                       │
│                                                             │
│  优化明细:                                                   │
│  ┌──────────────────┬──────────┬──────────┬────────┐        │
│  │ 阶段             │ 优化前   │ 优化后   │ 改进   │        │
│  ├──────────────────┼──────────┼──────────┼────────┤        │
│  │ 依赖安装          │ 3m 20s  │ 15s     │ -93%   │        │
│  │ Lint + Typecheck │ 3m 15s  │ 50s(并行)│ -74%   │        │
│  │ 单元测试         │ 8m 40s  │ 58s(4片) │ -89%   │        │
│  │ 集成测试         │ 9m 15s  │ 1m 05s  │ -88%   │        │
│  │ E2E 测试         │ 6m 30s  │ 1m 12s  │ -82%   │        │
│  │ 构建             │ 1m 45s  │ 35s     │ -67%   │        │
│  ├──────────────────┼──────────┼──────────┼────────┤        │
│  │ 总计             │ 32m 45s │ 4m 52s  │ -85%   │        │
│  └──────────────────┴──────────┴──────────┴────────┘        │
│                                                             │
│  业务影响:                                                   │
│  • 跳过测试的开发者比例: 47% → 3%                            │
│  • "CI 太慢先合了" 事故: 3-5次/月 → 0次/月                  │
│  • 日均合并 PR 数: 4 → 11                                    │
│  • 开发者满意度: 2.1/5 → 4.6/5                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 经验教训

1. **先测量再优化**——用 `--json` 输出定位真正的瓶颈
2. **并行是最大杠杆**——串行到并行的改变带来最大提升
3. **容器复用大有可为**——testcontainers 的 `withReuse(true)` 可以跨次运行复用
4. **分级运行是必须的**——不是所有测试都需要在每个 PR 运行
5. **开发者体验就是生产力**——CI 从 33 分钟到 5 分钟，日均 PR 合并量翻了近 3 倍

---

## 20.6 综合实战练习

### 练习 1：为你当前的项目制定测试策略

**任务：** 选择你正在参与的一个真实项目（或开源项目），按照案例一的方法论：

1. 审计当前测试状况（覆盖率、测试数量、CI 时间）
2. 识别最痛的 3 个 Bug 或质量问题
3. 制定 4 周的测试建设计划（含每周目标和具体测试数量）
4. 编写至少 5 个关键路径的测试用例

**交付物：**
- 审计报告（表格形式）
- 4 周计划甘特图（ASCII art）
- 5 个测试用例代码

### 练习 2：AI 不确定性测试设计

**任务：** 设计一个测试策略来处理以下场景——你的 App 调用 AI API 进行图片识别，但 AI 的输出具有不确定性（同一张图可能返回略微不同的结果）。

**要求：**
- 设计 3 层 Mock 策略（固定 / 智能 / 模糊）
- 编写置信度阈值测试（高于 80% 自动接受，低于 50% 要求用户确认）
- 编写 AI 降级测试（API 超时 / 返回错误 / 返回空结果）
- 设计"黄金数据集"策略：用 20 张标准照片验证 AI 准确率

### 练习 3：支付幂等性实现与测试

**任务：** 从零实现一个简单的幂等性中间件，并为其编写完整的测试套件：

**要求（使用 Node.js + Express + Redis）：**
- 实现 `idempotency` 中间件
- 测试：相同幂等键返回缓存结果
- 测试：不同幂等键正常处理
- 测试：幂等键过期后可以重新请求
- 测试：并发相同幂等键只处理一次
- 测试：处理中的请求（进行中锁定）

### 练习 4：CI 性能分析与优化

**任务：** 分析你的项目（或一个开源项目）的 CI 流水线，按照案例五的方法论进行优化：

1. 记录当前 CI 每个步骤的耗时
2. 绘制瓶颈分析图
3. 提出至少 3 项优化措施
4. 实施优化并记录前后对比

**交付物：**
- 优化前的时间线图（ASCII art）
- 瓶颈分析表格
- 优化方案及预期效果
- 优化后的 CI 配置文件

### 练习 5：遗留代码的特征化测试

**任务：** 找一段你项目中（或开源项目中）没有测试的复杂函数（至少 50 行），为它编写特征化测试：

1. 不阅读代码，仅通过黑盒方式调用函数，记录输入和输出
2. 编写至少 10 个特征化测试用例
3. 找到至少 1 个通过特征化测试发现的潜在 Bug
4. 在特征化测试的保护下，安全重构该函数
5. 确认重构后所有特征化测试仍然通过

**交付物：**
- 原始函数代码
- 10+ 特征化测试
- 发现的 Bug 描述
- 重构后的代码
- 重构前后的测试运行截图

---

## 附录 A：各语言测试框架速查

### JavaScript / TypeScript

| 框架 | 用途 | 特点 |
|------|------|------|
| **Jest** | 全能型 | 零配置、快照、并行 |
| **Vitest** | Vite 项目首选 | 与 Vite 共享配置、极快 |
| **React Testing Library** | React 组件 | 以用户行为驱动 |
| **Playwright** | E2E (Web) | 多浏览器、自动等待、Trace |
| **Cypress** | E2E (Web) | 交互式调试、时间旅行 |
| **Detox** | E2E (移动端) | React Native 原生测试 |
| **MSW** | API Mocking | Service Worker 拦截 |
| **fast-check** | 属性基测试 | 随机输入生成 |
| **Stryker** | 变异测试 | 多框架支持 |

### Java / Kotlin

| 框架 | 用途 | 特点 |
|------|------|------|
| **JUnit 5** | 单元测试标准 | 参数化、嵌套、扩展模型 |
| **Mockito** | Mock 框架 | 最流行的 Java mock 库 |
| **AssertJ** | 流畅断言 | 链式调用、丰富的断言 |
| **Spring Boot Test** | Spring 集成测试 | `@WebMvcTest`, `@DataJpaTest` |
| **Testcontainers** | 容器化依赖 | 真实数据库/消息队列 |
| **ArchUnit** | 架构测试 | 验证包依赖、分层规则 |
| **PIT** | 变异测试 | Java 标准 |

### Python

| 框架 | 用途 | 特点 |
|------|------|------|
| **pytest** | 全能型 | 简洁、Fixture、参数化 |
| **unittest.mock** | Mock | 标准库自带 |
| **Hypothesis** | 属性基测试 | 最强大的 PBT 库之一 |
| **Factory Boy** | 测试数据工厂 | Django/SQLAlchemy 集成 |
| **responses** | HTTP Mock | 简洁的请求拦截 |

### Go

| 框架 | 用途 | 特点 |
|------|------|------|
| **testing** | 标准库 | 零依赖 |
| **testify** | 断言 + Mock | 最流行的第三方库 |
| **gomock** | Mock 生成 | 接口自动生成 mock |
| **httptest** | HTTP 测试 | 标准库，无需依赖 |
| **testcontainers-go** | 容器化依赖 | Go 版 Testcontainers |

---

## 附录 B：推荐阅读

### 必读经典（按推荐顺序）

1. **《Test Driven Development: By Example》** — Kent Beck
   - 适合：所有开发者
   - 核心：TDD 的哲学与实践，Red-Green-Refactor 循环
   - 推荐理由：TDD 的圣经，薄而精，一周可读完

2. **《The Art of Unit Testing》(第 3 版)** — Roy Osherove
   - 适合：初中级开发者
   - 核心：单元测试的命名、结构、可维护性
   - 推荐理由：最实用的单元测试入门书

3. **《xUnit Test Patterns》** — Gerard Meszaros
   - 适合：中高级开发者
   - 核心：测试替身分类法、测试异味
   - 推荐理由：测试领域的"设计模式"，工具书式参考

4. **《Growing Object-Oriented Software, Guided by Tests》** — Freeman & Pryce
   - 适合：中高级开发者
   - 核心：Outside-In TDD、Mock 驱动设计
   - 推荐理由：将测试与设计完美融合的杰作

5. **《Working Effectively with Legacy Code》** — Michael Feathers
   - 适合：维护遗留系统的开发者
   - 核心：依赖打破技术、特征化测试
   - 推荐理由：面对没有测试的代码时的救命指南

6. **《Software Engineering at Google》** — Winters, Manshreck, Wright
   - 适合：所有开发者
   - 核心：大规模工程中的测试实践
   - 推荐理由：Google 数十年测试经验的总结

### 在线资源

- **Martin Fowler 的测试文章集** — martinfowler.com/testing
- **Kent C. Dodds 的 Testing JavaScript** — testingjavascript.com
- **Google Testing Blog** — testing.googleblog.com

---

## 总结：测试从零到精通的路线图

```
阶段 1：入门（1-2 周）
  ├── 理解测试金字塔
  ├── 学会写 AAA 结构的单元测试
  ├── 掌握一个测试框架（Jest / JUnit / pytest）
  └── 为现有代码补写 10 个测试

阶段 2：基础（1-2 月）
  ├── 理解测试替身（Mock / Stub / Fake）
  ├── 学会集成测试（数据库 / API）
  ├── 在 CI 中运行测试
  ├── 达到核心模块 60% 覆盖率
  └── 读完《The Art of Unit Testing》

阶段 3：进阶（3-6 月）
  ├── 实践 TDD（至少一个完整功能）
  ├── 掌握 E2E 测试（Playwright / Detox）
  ├── 学会处理 Flaky 测试
  ├── 引入契约测试
  └── 读完《TDD by Example》

阶段 4：精通（6-12 月）
  ├── 在团队中推广测试文化
  ├── 设计测试架构（分层、并行、门禁）
  ├── 掌握属性基测试和变异测试
  ├── 能给遗留代码安全地补充测试
  ├── 读完《xUnit Test Patterns》和《GOOS》
  └── 成为团队的测试 Champion

阶段 5：布道（持续）
  ├── 分享测试经验（博客/演讲）
  ├── 参与开源测试工具开发
  ├── 指导初级开发者
  └── 持续学习新的测试技术
```

> *"质量不是一种行为，它是一种习惯。"*
> —— 亚里士多德

---

*本书基于 Kent Beck、Gerard Meszaros、Steve Freeman、Nat Pryce、Roy Osherove、Michael Feathers、Martin Fowler、Kent C. Dodds 等测试领域先驱者的思想与著作编写。所有引用已标明出处。*

*最后更新：2026 年 4 月*
