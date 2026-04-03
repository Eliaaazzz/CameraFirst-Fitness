# AuraFitness — AI-First Health & Nutrition Platform

## Product Vision

**One-liner:** AuraFitness is an AI-powered health platform that combines computer vision meal logging, personalized goal generation, and gamified habit tracking to make nutrition management effortless.

**Mission:** Eliminate the friction of calorie tracking by replacing manual food databases with camera-first logging, and transform nutrition data into actionable daily guidance — not just numbers.

**Target Users:** Health-conscious millennials/Gen-Z who want to track nutrition without the tedium of traditional apps. Secondary: people managing T2D or metabolic conditions who need consistent, low-friction logging.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│  Frontend: React Native 0.81 / Expo 54 / TS 5.9    │
│  iOS (App Store) + Web                              │
├─────────────────────────────────────────────────────┤
│  Backend: Spring Boot 3.3.5 / Java 21 / Gradle     │
│  REST API + WebSocket                               │
├──────────────┬──────────────┬───────────────────────┤
│  PostgreSQL  │    Redis     │  Cloudflare R2 (S3)   │
│  + pgvector  │   (cache)    │  (image storage)      │
├──────────────┴──────────────┴───────────────────────┤
│  AI Stack                                           │
│  • Gemini Vision — meal photo → food recognition    │
│  • Gemini LLM — personalized goal generation        │
│  • OpenAI Embeddings — vector similarity recs       │
│  • YouTube API — exercise video recommendations     │
├─────────────────────────────────────────────────────┤
│  Infra: GCP Cloud Run (au-southeast2)               │
│  CI/CD: GitHub Actions → Docker → GCR → Cloud Run   │
│  Auth: OAuth2 (Apple Sign In, Google) + JWT          │
└─────────────────────────────────────────────────────┘
```

---

## Design Philosophy

Every UI component is intentionally modeled after a proven pattern from a top-tier consumer app. This is not aesthetic copying — each choice solves a specific UX problem.

| Component | Inspired By | Why This Pattern | Implementation |
|---|---|---|---|
| Nutrition Rings | Apple Watch Activity Rings | Multi-metric progress visible at a glance without reading numbers | `NutritionRingsCard` — SVG arcs for calories/protein/carbs/fat |
| Daily Score (0-100) | Whoop Recovery Score / Oura Readiness | Single composite metric reduces cognitive load; users check one number instead of parsing 6 data points | `DailyScoreCard` — animated arc gauge, weighted composite of calories+macros+hydration+streak |
| Daily Tasks | Noom Daily Lessons / Duolingo Daily Quests | Micro-tasks create habit loops; completion dopamine drives retention | `DailyTasksCard` — checkbox list with progress bar |
| Streak Badges | Duolingo Streak / Snapchat Streaks | Loss aversion is the strongest retention lever in consumer apps | `StreakBadge` — 5 milestone tiers with flame animation |
| Bento Dashboard | Apple WWDC 2024 + Linear App | High information density without visual overwhelm; cards breathe | `BentoCard` — glass morphism with `backdrop-filter: blur(20-40px)` |
| Tab Bar | iOS 26 Liquid Glass | Platform-native premium feel; distinguishes from generic tab bars | `AppNavigator` — `expo-blur` intensity 56 + specular highlight + floating camera FAB |
| Quick Log Bar | Spotify Search Bar / Instagram Story Camera | Zero-tap access to primary action; reduces logging friction to <3 seconds | `QuickLogBar` — persistent bottom action bar |
| Color: Orange `#F97316` | Strava / Nike Training Club | Orange = energy, movement, warmth; differentiates from medical blue (MyFitnessPal) and clinical green (Noom) | `BRAND_COLORS.primary` in theme system |
| Dark Mode: Violet `#A78BFA` | Discord / Figma | Violet feels premium in dark contexts; avoids generic blue-on-dark | `BRAND_COLORS.primaryDark` in theme system |
| Trend Charts | Apple Health weekly view | 7-day rolling window is actionable; longer ranges feel academic | `NutritionTrendChart` — SVG path + Recharts (web) |

---

## Feature Parity vs Competitors

| Feature | AuraFitness | MyFitnessPal | Noom | MacroFactor | Fitbod | Lose It! | Yazio |
|---|---|---|---|---|---|---|---|
| AI Meal Photo Scan | ✅ Gemini Vision | ❌ (manual DB) | ❌ | ❌ | N/A | ✅ (Snap It) | ✅ (basic) |
| Personalized AI Goals | ✅ Gemini LLM | ❌ | ✅ (coach) | ✅ (algo) | ✅ (workout) | ❌ | ❌ |
| Vector-based Food Recs | ✅ pgvector+OpenAI | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Gamification (Streaks) | ✅ 5-tier system | ✅ (basic) | ✅ | ❌ | ❌ | ✅ | ✅ |
| Daily Score Composite | ✅ 0-100 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Exercise Videos | ✅ YouTube API | ❌ | ❌ | ❌ | ✅ (own DB) | ❌ | ❌ |
| Nutrition Rings | ✅ SVG arcs | ❌ | ❌ | ✅ (bar chart) | N/A | ❌ | ❌ |
| Glass Morphism UI | ✅ Full system | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Apple Sign In | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Free Tier | ✅ Full core | Freemium | Paid | Paid | Paid | Freemium | Freemium |
| **Pricing** | **Free–$9.99/mo** | **$19.99/mo** | **$70/mo** | **$11.99/mo** | **$12.99/mo** | **$39.99/yr** | **$6.99/mo** |

**Unique differentiators:**
1. **AI Stack narrative** — Three AI providers (Gemini Vision + Gemini LLM + OpenAI Embeddings) working together, not just one API call
2. **T2D niche positioning** — Metabolic health focus that incumbents ignore
3. **Zero-friction logging** — Camera-first, not database-search-first

---

## Monetization Model

| | Free | Pro ($6.99/mo) | Premium ($9.99/mo) |
|---|---|---|---|
| Manual meal logging | ✅ | ✅ | ✅ |
| AI meal photo scan | 3/day | Unlimited | Unlimited |
| Basic nutrition tracking | ✅ | ✅ | ✅ |
| AI-generated goals | ❌ | ✅ | ✅ |
| Daily Score & Insights | Basic | Full | Full |
| Nutrition Trend Charts | 7-day | 30-day | 90-day |
| Streak Badges | ✅ | ✅ | ✅ |
| Workout Library | Basic | Full | Full |
| AI Meal Plans | ❌ | ❌ | ✅ |
| Priority AI processing | ❌ | ❌ | ✅ |
| Export Data (CSV) | ❌ | ✅ | ✅ |

**Implementation:** RevenueCat SDK for subscription management, App Store & Google Play billing.

---

## Recruiter-Facing Technical Highlights

### Product & Design
- Designed and shipped a consumer health app to the App Store with AI-powered meal recognition, gamified habit tracking, and a Whoop-inspired daily health score
- Built a design system with glass morphism, animated SVG nutrition rings, and 5-tier streak badges modeled after Duolingo's retention mechanics
- Conducted competitive analysis against 6 major fitness apps to identify and fill feature gaps

### AI / ML
- Integrated 3 AI providers (Gemini Vision, Gemini LLM, OpenAI Embeddings) into a unified pipeline: photo → food recognition → nutritional analysis → personalized recommendations
- Implemented vector similarity search using pgvector + OpenAI embeddings for intelligent food and recipe recommendations
- Built AI goal generation system that adapts to user's nutritional history and body composition data

### Backend
- Architected a Spring Boot 3.3 / Java 21 REST API with Redis caching, Flyway migrations, and OAuth2 (Apple/Google) authentication
- Designed PostgreSQL schema with pgvector extension for embedding storage and cosine similarity queries
- Implemented multi-layer caching (Redis + Caffeine) reducing API response times

### Frontend
- Built a cross-platform React Native 0.81 + Expo 54 app with TypeScript, supporting iOS and web from a single codebase
- Implemented custom glass morphism tab bar with `backdrop-filter` blur, specular highlights, and spring animations using Reanimated 4
- Created responsive Bento-grid dashboard with animated SVG charts and real-time data updates

### Infrastructure
- Deployed containerized backend to GCP Cloud Run with GitHub Actions CI/CD, multi-stage Docker builds, and auto-scaling (1–N instances)
- Configured Cloudflare R2 for image storage with presigned URL uploads, reducing storage costs vs S3
- Set up Supabase PostgreSQL with connection pooling for production database management

---

## Development Guidelines

These rules apply to ALL new code written in this project:

### UI / Design
- **Design Philosophy table is law.** Every new UI component must reference an existing pattern from a top-tier consumer app. Document which app inspired it and why.
- **Colors must use theme tokens.** Never hardcode hex values. Use `BRAND_COLORS` from `theme.ts`. Light mode primary = `#F97316`, dark mode primary = `#A78BFA`.
- **Glass morphism is the visual language.** New cards use `backdrop-filter: blur()` with semi-transparent backgrounds. No flat opaque cards.
- **Animations must feel premium.** Use `react-native-reanimated` spring animations (damping: 12, stiffness: 150) for interactions. No jarring linear transitions.

### Architecture
- **Every screen must be wrapped with `withErrorBoundary`.** No unhandled crashes in production.
- **AI features must include a disclaimer.** Any AI-generated content (meal analysis, goals, recommendations) must show "AI-generated — verify with a healthcare professional" or equivalent.
- **API responses must be cached.** Use Redis for shared cache, Caffeine for local/hot cache. No raw DB queries on every request for frequently accessed data.
- **New API endpoints follow REST conventions.** Resource-based URLs, proper HTTP methods, consistent error response format.

### Code Quality
- **TypeScript strict mode.** No `any` types unless absolutely necessary with a comment explaining why.
- **No console.log in production code.** Use proper logging utilities.
- **Test critical paths.** AI integration, auth flows, and data mutations must have tests.

### Product Thinking
- **Every feature must answer: "How does this help the user build a health habit?"** If the answer is unclear, the feature needs rethinking.
- **Friction budget:** Core actions (log a meal, check daily score) must be achievable in ≤3 taps from the home screen.
- **Competitive awareness:** Before building a feature, check how MyFitnessPal/Noom/MacroFactor handle it. Do it better or differently — never worse.
