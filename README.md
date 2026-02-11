# AuraFitness

AI-powered fitness and nutrition platform with pose detection and personalized meal planning.

## Project Overview

AuraFitness is a comprehensive health and wellness application that combines:
- **AI-powered pose detection** for real-time workout form analysis
- **Intelligent recipe recommendations** based on dietary goals
- **Personalized nutrition tracking** and meal planning
- **Progress monitoring** and gamification features

## Monorepo Structure

```
AuraFitness/
├── backend/                    # Spring Boot REST API (Java 21)
│   ├── src/                   # Java source code
│   ├── build.gradle.kts       # Gradle build configuration
│   └── Dockerfile             # Backend container image
│
├── frontend/                   # React Native mobile app (Expo)
│   ├── src/                   # TypeScript/React source code
│   │   ├── components/        # Reusable UI components
│   │   ├── screens/           # App screens
│   │   ├── services/          # API and business logic
│   │   └── utils/             # Helper functions
│   ├── app.json               # Expo configuration
│   └── package.json           # npm dependencies
│
├── shared/                     # Shared TypeScript packages
│   └── package.json           # Shared types and utilities
│
├── infrastructure/             # Infrastructure as Code
│   ├── docker-compose.yml     # Development environment
│   ├── docker-compose.supabase.yml # Optional: local Supabase stack
│
├── scripts/                    # Utility scripts
│   ├── setup/                 # Environment setup scripts
│   ├── deployment/            # Deployment scripts
│   ├── database/              # Database management scripts
│   └── testing/               # Test automation scripts
│
├── docs/                       # Documentation
│
├── .github/workflows/          # CI/CD pipelines
│
├── package.json               # Root workspace configuration
├── firebase.json              # Firebase Hosting config (frontend + API proxy)
├── cloudbuild.yaml            # Google Cloud Build (backend)
├── .env                       # Environment variables (gitignored)
└── .gitignore                 # Git ignore rules
```

## Quick Start

### Prerequisites

- **Java 21+** (for backend)
- **Node.js 18+** (for frontend)
- **PostgreSQL 16+** with pgvector extension
- **Docker & Docker Compose** (recommended)
- **Android Studio** or **Xcode** (for mobile development)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/AuraFitness.git
   cd AuraFitness
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start development infrastructure (PostgreSQL + Redis)**
   ```bash
   npm run docker:up
   ```

### Running Locally

#### Backend (Spring Boot)
```bash
# Run development server
npm run backend:run

# Or using Gradle directly
cd backend && ./gradlew bootRun

# Backend will be available at http://localhost:8080
```

#### Frontend (React Native)
```bash
# Run Expo development server
npm run frontend:start

# Run on iOS
npm run frontend:ios

# Run on Android
npm run frontend:android

# Run on Web
npm run frontend:web
```

## Available Scripts

### Root Level (npm workspaces)
- `npm run docker:up` - Start development infrastructure
- `npm run docker:down` - Stop development infrastructure
- `npm run docker:logs` - View container logs
- `npm test` - Run all tests
- `npm run clean` - Clean build artifacts

### Backend
- `npm run backend:build` - Build backend with Gradle
- `npm run backend:test` - Run backend tests
- `npm run backend:run` - Start backend dev server
- `npm run backend:clean` - Clean backend build

### Frontend
- `npm run frontend:start` - Start Expo dev server
- `npm run frontend:ios` - Run on iOS
- `npm run frontend:android` - Run on Android
- `npm run frontend:web` - Run on Web
- `npm run frontend:test` - Run frontend tests
- `npm run frontend:type-check` - TypeScript type checking

## Testing

```bash
# Run all tests
npm test

# Run backend tests
npm run backend:test

# Run frontend tests
npm run frontend:test

# Run integration tests
bash scripts/testing/test-api.sh
```

## Deployment

### Using Docker Compose (Local)
```bash
# Development environment
npm run docker:up

# Optional: local Supabase stack (if you're developing against Supabase)
npm run docker:supabase:up
```

### Production (Google Cloud + Firebase)
- Backend: Google Cloud Run (Docker), configured via `cloudbuild.yaml`
- Frontend: Firebase Hosting, with API proxy to Cloud Run

### Manual Build
```bash
# Backend - build JAR
npm run backend:build

# Frontend - build for web
npm run frontend:build
```

See `cloudbuild.yaml` and `firebase.json` for deployment configuration.

## Documentation

See the `docs/` directory for detailed documentation on:
- Nutrition database schema and ETL pipeline
- API endpoints and usage
- Development guides

## Technology Stack

### Backend
- **Spring Boot 3.3** - Application framework
- **Java 21** - Runtime
- **PostgreSQL 16** with pgvector - Primary database with vector search
- **Caffeine** - In-memory cache
- **Gradle** - Build tool
- **Spring Security + JWT** - Authentication
- **Flyway** - Database migrations

### Frontend
- **React Native 0.81** - Mobile framework
- **Expo 54** - Development platform
- **TypeScript 5.9** - Type-safe JavaScript
- **React Navigation 7** - Navigation library
- **TanStack Query** - Data fetching

### Infrastructure
- **Google Cloud Run** - Backend hosting (Docker)
- **Firebase Hosting** - Frontend hosting with API proxy
- **Supabase** - Postgres (managed)
- **Cloudflare R2** - Object storage
- **Docker** - Containerization
- **Google Cloud Build** - CI/CD

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is proprietary and confidential.
