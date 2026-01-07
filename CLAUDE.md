# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## coding rule
1. achieve high cohesion, low coupling
2. follow SOLID rule
3. refer to https://github.com/gilbarbara/react-joyride

## Project Overview

AuraFitness is an AI-powered fitness and nutrition platform with pose detection and personalized meal planning. It uses a monorepo structure with a Spring Boot backend and React Native (Expo) frontend.

## Development Commands

### Backend (Spring Boot - Java 21)
```bash
cd backend
./gradlew bootRun                    # Start dev server (port 8080)
./gradlew test                       # Run all tests (includes Testcontainers)
./gradlew clean build -PexcludeSlowTests  # Build JAR, skip slow/integration tests
./gradlew flywayMigrate              # Run database migrations
```

### Frontend (React Native - Expo 54)
```bash
cd frontend
npm start                    # Expo dev server
npm run ios                  # Build & run iOS
npm run android              # Build & run Android
npm run type-check           # TypeScript validation
npm test                     # Jest tests
```

### Docker (from project root)
```bash
npm run docker:up            # Start PostgreSQL + Redis + Backend
npm run docker:down          # Stop all containers
npm run docker:logs          # View container logs
```

## Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌────────────────┐
│  React Native   │─────▶│  Spring Boot API  │─────▶│   PostgreSQL   │
│  (Expo Mobile)  │      │   (Port 8080)     │      │   + pgvector   │
└─────────────────┘      └──────────────────┘      └────────────────┘
                                  │
                            ┌─────▼─────┐
                            │   Redis   │
                            │   Cache   │
                            └───────────┘
```

### Backend Package Structure (`backend/src/main/java/com/fitnessapp/backend/`)
- `nutrition/` - Food recognition, meal tracking, USDA integration (400K+ foods)
- `recipe/` - Recipe search with vector embeddings, scaling, meal plans
- `workout/` - Exercise videos, pose detection, leaderboards
- `auth/` - Dual authentication (API Key + JWT)
- `user/` - Profiles, goals, dietary preferences
- `security/` - SecurityConfig, ApiKeyAuthFilter, JwtAuthFilter

### Frontend Structure (`frontend/src/`)
- `screens/` - Main app views
- `components/` - Reusable UI components
- `services/apiClient.ts` - API client with dual auth headers
- `hooks/` - Custom hooks (useDailyNutrition, useWorkouts)
- `stores/` - Zustand state management

## Authentication System

Two-layer security model:
1. **API Key (X-API-Key header)** - All requests require this, validated by `ApiKeyAuthFilter`
2. **JWT (Authorization: Bearer header)** - User-specific, validated by `JwtAuthFilter`

Public endpoints (bypass both filters): `/actuator/**`, `/swagger-ui/**`, `/api/v1/auth/**`

Frontend `apiClient.ts` injects both headers automatically. Tokens stored in `SecureStore`.

## Database Migrations (Flyway)

Location: `backend/src/main/resources/db/migration/`
Pattern: `V{version}__{description}.sql`

Rules:
- Never modify existing migrations after deployment
- Use `IF NOT EXISTS` for idempotent operations
- Schema changes require matching entity updates in `domain/`

## AI Food Recognition

Multi-provider fallback: Gemini 2.0 Flash (primary) → Claude → OpenAI

Key files:
- `GeminiVisionServiceImpl.java` - Primary vision API
- `UsdaFoodSearchService.java` - Food database with FTS
- `NutritionTrackingService.java` - Meal persistence

## Testing

Backend tests use Testcontainers for PostgreSQL+pgvector. Use `-PexcludeSlowTests` in CI to skip slow integration tests.

API documentation: `http://localhost:8080/swagger-ui.html`

## Key Configuration

- Backend: `application.yml` with env var fallbacks
- Frontend: `.env.development` / `.env.production` via `@env` module
- Required env vars: `GEMINI_API_KEY`, `JWT_SECRET`, database credentials
