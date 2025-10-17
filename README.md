# Fitness App MVP Backend

Backend services for the Camera First Fitness MVP. This repository includes a Spring Boot service, PostgreSQL, and Redis all orchestrated via Docker Compose.

## Prerequisites
- Docker Desktop 4.0+ (engine + compose plugin)
- Java 21 (Temurin recommended) if running the app locally without Docker
- Make a copy of `.env.example` as `.env` and populate the values before running services

## Quick Start (5 minutes)
1. Duplicate `.env.example` to `.env` and update any secrets (e.g. `YOUTUBE_API_KEY`).
2. Build the Spring Boot artifacts for the first time:
   ```bash
   ./gradlew clean build
   ```
3. Start the stack:
   ```bash
   docker compose up --build
   ```
4. Verify health:
   - API Health: http://localhost:8080/actuator/health
   - PostgreSQL: `psql postgresql://fitnessuser:dev_password@localhost:5432/fitness_mvp`
   - Redis: `redis-cli -h localhost -p 6379 ping`

5. The application seeds a starter content library on boot (120 workout cards + 60 recipes).
   - Set `APP_SEED_ENABLED=false` if you want to skip seeding (e.g., when restoring from a dump).

## Project Structure
- `docker-compose.yml` – Docker services for PostgreSQL, Redis, and the Spring Boot app
- `.env.example` – Template for environment-specific secrets and connection strings
- `src/main/resources/application.yml` – Spring profiles (`dev` and `prod`) and shared configuration
- `src/main/resources/db/migration` – Flyway migration scripts (created in later steps)
- `src/main/java/com/fitnessapp/backend` – Spring Boot source code

## Testing
Run the unit tests at any time with:
```bash
./gradlew test
```

Flyway migrations can be executed manually using:
```bash
./gradlew flywayMigrate
```

## YouTube API Key
The YouTube Data API v3 key **must not** be committed. Store it in your secrets manager of choice (1Password or AWS Secrets Manager) and inject it via the `YOUTUBE_API_KEY` environment variable referenced by `.env` and `application.yml`.

## Troubleshooting
- If `docker compose up` fails on the `app` service because dependencies are unavailable, rerun once the database and Redis containers report healthy.
- To apply database changes quickly in development, stop the stack, run `docker compose down -v` to drop volumes, and start again.

## Useful Commands
| Purpose | Command |
|---|---|
| Build Spring Boot jar | `./gradlew build` |
| Start services | `docker compose up --build` |
| Stop services | `docker compose down` |
| Run migrations | `./gradlew flywayMigrate` |
| Format code (Spotless to be added) | _coming soon_ |
