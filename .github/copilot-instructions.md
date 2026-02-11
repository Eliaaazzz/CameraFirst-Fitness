# AuraFitness AI Coding Agent Instructions

## Architecture Overview

**Tech Stack:** Spring Boot 3.3.5 (Java 21) + React Native (Expo 54) + PostgreSQL 16 + Redis 7  
**Project Type:** Full-stack fitness/nutrition platform with AI-powered food recognition and pose detection

### Service Boundaries

```
┌─────────────────┐      ┌──────────────────┐      ┌────────────────┐
│  React Native   │─────▶│  Spring Boot API  │─────▶│   PostgreSQL   │
│  (Expo Mobile)  │      │   (Port 8080)     │      │   + pgvector   │
└─────────────────┘      └──────────────────┘      └────────────────┘
         │                        │                          │
         │                  ┌─────▼─────┐                   │
         │                  │   Redis   │                   │
         └──────────────────│   Cache   │◀──────────────────┘
                            └───────────┘
                     ┌───────────┴────────────┐
                     │  AI Providers (Primary) │
                     │  - Gemini 2.0 Flash     │
                     │  - Claude (fallback)    │
                     │  - OpenAI (optional)    │
                     └─────────────────────────┘
```

**Backend Packages:**
- `backend/src/main/java/com/fitnessapp/backend/`
  - `nutrition/` - Food recognition, meal tracking, USDA integration (400K+ foods)
  - `recipe/` - Recipe search with vector embeddings, scaling, meal plans
  - `workout/` - Exercise videos, pose detection, leaderboards
  - `auth/` - Dual authentication (API Key + JWT) - see SecurityConfig.java
  - `user/` - Profiles, goals, dietary preferences

**Frontend Structure:**
- `frontend/src/` - TypeScript React Native
  - `screens/` - Main app views (NutritionScreen, WorkoutScreen, etc.)
  - `components/nutrition/` - Glassmorphic meal cards, macros display
  - `services/apiClient.ts` - Dual auth headers (X-API-Key + Bearer token)

## Critical Developer Workflows

### Building & Running

**Backend (from `backend/` directory):**
```bash
# Build JAR (skips slow tests)
./gradlew clean build -PexcludeSlowTests

# Run locally
./gradlew bootRun

# Run ALL tests (including Testcontainers integration tests)
./gradlew test
```

**Frontend (from `frontend/` directory):**
```bash
npm start              # Expo dev server
npm run android        # Build & run Android
npm run ios            # Build & run iOS
npm test               # Jest tests
npm run type-check     # TypeScript validation
```

**Docker Compose (from project root):**
```bash
docker-compose up -d   # Starts postgres + redis + backend
```

### Environment Setup

**CRITICAL:** Copy `.env.example` to `.env` before running anything. Required keys:
- `GEMINI_API_KEY` - Primary AI provider for food recognition
- `JWT_SECRET` - Generate with: `openssl rand -base64 64`
- Database credentials match `docker-compose.yml`

Backend reads from `application.yml` with fallbacks to env vars. Frontend reads from `.env` via `@env` module (see `babel.config.js` module resolver).

## Authentication Architecture (Non-Obvious)

**Two-layer security model:**
1. **Layer 1 - API Key (Access Card 门禁卡):** All requests require `X-API-Key` header. Validated by `ApiKeyAuthFilter` before reaching controllers.
2. **Layer 2 - JWT (ID Card 身份证):** After login, user-specific `Authorization: Bearer {token}` is required. Validated by `JwtAuthFilter`.

**Implementation:** See `SecurityConfig.java` - filters are chained in specific order. Frontend `apiClient.ts` injects both headers automatically.

**Login Flow:**
1. Google OAuth via `expo-auth-session` → ID token
2. Backend validates ID token → issues JWT + refresh token
3. Frontend stores in `SecureStore` → auto-includes in all requests
4. Token refresh handled by interceptor in `apiClient.ts`

**Public Endpoints:** `/actuator/**`, `/swagger-ui/**`, `/api/v1/auth/**` - bypass both filters.

## AI Food Recognition Pattern

**Multi-provider fallback strategy:** Gemini 2.0 Flash (primary) → Claude (fallback) → OpenAI (optional).

**Service:** `FoodRecognitionService` orchestrates providers implementing `FoodRecognitionProvider` interface.

**Image Processing Flow:**
```
User uploads image → Base64 encode → AI vision API → Structured food list
→ USDA fuzzy search (Levenshtein distance) → Nutrition lookup → Response
```

**Key Files:**
- `GeminiVisionServiceImpl.java` - Uses OkHttp for Gemini API
- `UsdaFoodSearchService.java` - 400K+ food database with FTS
- `NutritionTrackingService.java` - Meal persistence & daily aggregation

**Testing:** `RecipeSearchServiceTest` uses Testcontainers for PostgreSQL+pgvector. **Do not mock the database** - use real PG in tests.

## Database Migrations (Flyway)

**Location:** `backend/src/main/resources/db/migration/`  
**Pattern:** `V{version}__{description}.sql` (e.g., `V017__Add_meal_insights_table.sql`)

**Migration Rules:**
- Never modify existing migrations after they run in any environment
- Always use `IF NOT EXISTS` for idempotent operations
- Test with `./gradlew flywayMigrate` before committing
- Schema changes require matching entity updates in `backend/src/main/java/com/fitnessapp/backend/domain/`

## Project-Specific Conventions

### Code Style
- **Backend:** Lombok annotations (`@Data`, `@Builder`, `@Slf4j`) on entities/DTOs
- **Frontend:** Functional components with hooks, no class components
- **Naming:** Controllers end with `Controller`, Services with `Service` (standard Spring)

### API Responses
- Success: `200 OK` with payload
- Errors: `APIError` class with status code + message
- Validation: Spring `@Valid` on request bodies → 400 errors

### Frontend State Management
- **React Query** (`@tanstack/react-query`) for server state
- Custom hooks: `useDailyNutrition()`, `useWorkouts()` in `src/hooks/`
- Local state: `AsyncStorage` for non-sensitive, `SecureStore` for tokens

### Testing Exclusions
Slow/broken tests excluded in CI with `-PexcludeSlowTests`. **Do not run these in CI:**
- `**/DatabaseSchemaIntegrationTest*` (slow)
- `**/RecipePerformanceTest*` (slow)
- `**/*ControllerTest*` with missing bean mocks (need fixing)

## Documentation & References

**Key Docs:**
- [docs/AURA_DEVELOPMENT_PLAN_COMPLETE.md](../docs/AURA_DEVELOPMENT_PLAN_COMPLETE.md) - Development roadmap & implementation status
- [docs/JWT-AUTHENTICATION-GUIDE.md](../docs/JWT-AUTHENTICATION-GUIDE.md) - Auth flow diagrams
- [frontend/CODE_STRUCTURE.md](../frontend/CODE_STRUCTURE.md) - Component hierarchy & state flow
- `cloudbuild.yaml` - Google Cloud Build (backend)
- `firebase.json` - Firebase Hosting (frontend + API proxy to Cloud Run)

**API Documentation:** Swagger UI at `http://localhost:8080/swagger-ui.html` when backend is running

**Scripts:** `scripts/database/` - Data import utilities (USDA, recipes, workout videos)
