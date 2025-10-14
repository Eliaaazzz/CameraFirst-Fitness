# Project Log - October 13, 2025
## CameraFirst-Fitness Backend Setup & Docker Infrastructure

---

## Summary
Successfully set up and debugged a Spring Boot 3.3.x backend application with Docker Compose orchestration, PostgreSQL database, Redis cache, and Flyway database migrations. Resolved multiple configuration and compatibility issues to achieve a fully functional development environment.

---

## Today's Achievements

### 1. Docker & Container Orchestration
**What was accomplished:**
- Fixed Docker Compose health check for PostgreSQL container
- Resolved container name conflicts during stack restart
- Successfully orchestrated three services: `app`, `postgres`, and `redis`
- Configured proper service dependencies with health checks

**Problem solved:**
The PostgreSQL health check was failing because `pg_isready` defaults to checking a database named after the username (`fitnessuser`), but the actual database name is `fitness_mvp`. 

**Solution:**
Updated `docker-compose.yml` health check command:
```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"]
```

**Key lesson:** Always explicitly specify both username AND database name in PostgreSQL health checks to avoid silent failures.

---

### 2. Flyway Database Migration Setup
**What was accomplished:**
- Fixed Flyway compatibility with PostgreSQL 16.10
- Debugged and corrected SQL migration syntax errors
- Successfully applied initial database schema migration
- Verified migration history in `flyway_schema_history` table

**Problems solved:**
1. **Unsupported Database Error:** Flyway core didn't recognize PostgreSQL 16
2. **SQL Syntax Error:** JSON column seed data had incorrect escape sequences

**Solutions:**
1. Added database-specific Flyway driver in `build.gradle.kts`:
```kotlin
implementation("org.flywaydb:flyway-core:10.17.0")
implementation("org.flywaydb:flyway-database-postgresql:10.17.0")
```

2. Fixed JSON syntax in migration file:
```sql
-- WRONG: '[\"dumbbells\",\"strength\"]'
-- RIGHT: '["dumbbells","strength"]'
```

**Key lesson:** PostgreSQL doesn't need escaped quotes inside single-quoted strings for JSON columns. Use the raw JSON format.

---

### 3. Git Repository Setup
**What was accomplished:**
- Initialized local Git repository
- Connected to remote GitHub repository
- Successfully pushed codebase to `main` branch

**Commands used:**
```bash
git init
git remote add origin git@github.com:Eliaaazzz/CameraFirst-Fitness.git
git add .
git commit -m "Initial commit"
git push origin main
```

---

### 4. Spring Boot Configuration Deep Dive
**What was learned:**
- How `application.yml` manages multiple environments (dev/prod profiles)
- How Spring Security's `SecurityFilterChain` controls access
- Environment variable injection patterns: `${VAR_NAME:default_value}`
- Actuator endpoints for health monitoring

**Configuration highlights:**
- Dev profile allows local development with sensible defaults
- Prod profile enforces strict environment variable requirements (no defaults)
- Security config permits public access to health checks and API docs
- Flyway configured to run migrations on startup

---

### 5. Container Debugging & Troubleshooting
**What was accomplished:**
- Diagnosed "Connection refused" errors (app crash vs port binding)
- Learned to use `docker compose logs` effectively
- Verified service health with `docker compose ps`
- Used `docker compose exec` for in-container debugging

**Debugging workflow established:**
```bash
# Check service status
docker compose ps

# View logs for specific service
docker compose logs app -f

# Execute commands inside container
docker compose exec postgres psql -U fitnessuser -d fitness_mvp

# Clean restart when needed
docker compose down --remove-orphans
docker compose build --no-cache app
docker compose up
```

---

## Technical Concepts Mastered

### 1. Docker & Containerization
**Core concepts:**
- **Container:** Isolated runtime environment with application + dependencies
- **Image:** Blueprint for containers (like a class in OOP)
- **Volume:** Persistent storage that survives container restarts
- **Network:** Internal communication channel between containers
- **Health Check:** Automated test to verify service readiness

**Why Docker matters:**
- Consistency across dev/staging/prod environments
- Eliminates "works on my machine" problems
- Easy to tear down and rebuild clean environments
- Simplified onboarding for new team members

**Docker Compose orchestration:**
- Defines multi-container applications in one YAML file
- Manages startup order with `depends_on` and health checks
- Handles networking and volume mounting automatically

---

### 2. Database Migrations with Flyway
**Core concepts:**
- **Migration:** Versioned SQL script that evolves database schema
- **Version Control for Schema:** Treat database changes like code
- **Idempotency:** Migrations run once and are tracked
- **Audit Trail:** `flyway_schema_history` table records what/when/who

**Why migrations matter:**
- Prevents manual schema changes that break deployments
- Ensures all environments have identical database structure
- Makes rollbacks and debugging easier
- Enables collaboration without schema conflicts

**Flyway workflow:**
1. Developer creates `V{version}__{description}.sql` file
2. On app startup, Flyway checks `flyway_schema_history`
3. Pending migrations are applied in order
4. Success/failure is recorded in history table

**Best practices learned:**
- Never modify a migration after it runs in production
- Keep migrations small and focused
- Test migrations in CI before deploying
- Use transactional DDL when possible (PostgreSQL supports this)

---

### 3. Spring Boot Application Configuration
**Core concepts:**
- **Profiles:** Environment-specific configurations (dev, prod, test)
- **Property Injection:** `${ENV_VAR:default}` syntax for flexible config
- **Actuator:** Production-ready monitoring endpoints
- **Security Filter Chain:** Request authorization rules

**Configuration patterns learned:**
- Use defaults in dev for easy local development
- Require explicit values in prod for security
- Expose health checks publicly, protect business endpoints
- Enable detailed logging in dev, minimal in prod

---

### 4. Redis as a Caching Layer
**Core concepts:**
- **In-memory data store:** Extremely fast read/write (RAM-based)
- **Cache:** Stores frequently accessed data to reduce DB load
- **TTL (Time To Live):** Automatic expiration of cached data
- **Pub/Sub:** Lightweight message broker for events

**When to use Redis:**
- Caching expensive database queries
- Storing session data for stateless applications
- Rate limiting and API quotas
- Short-lived data (OTPs, tokens)
- Distributed locks across multiple app instances

**When NOT to use Redis:**
- Primary data storage (use PostgreSQL for durable data)
- Data requiring strong consistency guarantees
- Large datasets that exceed available RAM

---

### 5. PostgreSQL Health Checks
**What was learned:**
- `pg_isready` is the standard tool for PostgreSQL health checks
- Default behavior: checks database named after the user
- Best practice: explicitly specify both `-U` (user) and `-d` (database)
- Docker health checks determine when dependent services can start

**Health check anatomy:**
```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U $USER -d $DB"]
  interval: 10s    # How often to check
  timeout: 5s      # Max time to wait for response
  retries: 5       # Failures before marking unhealthy
```

---

## Coding Principles & Best Practices

### 1. Configuration Management
- **Principle:** Separate configuration from code
- **Implementation:** Use environment variables for secrets and environment-specific values
- **Benefit:** Same codebase deploys to dev/staging/prod safely

### 2. Infrastructure as Code
- **Principle:** Define infrastructure in version-controlled files
- **Implementation:** `docker-compose.yml`, migration scripts, Gradle configs
- **Benefit:** Reproducible, auditable, collaboratable infrastructure

### 3. Fail-Fast Development
- **Principle:** Detect problems as early as possible
- **Implementation:** Health checks, startup validation, migration checks
- **Benefit:** Faster debugging, fewer production issues

### 4. Idempotency
- **Principle:** Operations should be safe to repeat
- **Implementation:** Flyway tracks applied migrations, Docker Compose applies desired state
- **Benefit:** Safe to re-run deployments and scripts

### 5. Separation of Concerns
- **Principle:** Each component has a single, well-defined responsibility
- **Implementation:** 
  - PostgreSQL = durable data storage
  - Redis = ephemeral cache
  - Flyway = schema management
  - Spring Security = authorization
- **Benefit:** Easier to understand, test, and maintain

---

## Troubleshooting Patterns Learned

### Pattern 1: "Connection Refused" Errors
**Diagnosis approach:**
1. Check if the service is running: `docker compose ps`
2. Check if it crashed: `docker compose logs <service>`
3. Check if the port is bound: `docker compose ps` shows port mapping
4. Test from inside container: `docker compose exec <service> curl localhost:8080`

**Common causes:**
- Application crashed on startup (check logs)
- Port conflict with another process
- Service not yet healthy when accessed

---

### Pattern 2: Container Name Conflicts
**Symptom:** "Conflict. The container name is already in use"

**Root cause:** Previous container wasn't removed cleanly

**Solution:**
```bash
# Option 1: Clean shutdown
docker compose down --remove-orphans

# Option 2: Force remove specific container
docker rm <container_id>

# Option 3: Nuclear option (removes volumes too)
docker compose down -v
```

---

### Pattern 3: Dependency Version Mismatches
**Symptom:** "Unsupported Database" or similar compatibility errors

**Root cause:** Library doesn't support the specific version of a tool

**Solution:**
1. Check compatibility matrix in library documentation
2. Add database-specific or version-specific dependencies
3. Rebuild with `--no-cache` to ensure new dependencies are included

---

### Pattern 4: SQL Syntax Errors in Migrations
**Symptom:** Migration fails with "syntax error at or near..."

**Debugging approach:**
1. Check the line number in the error message
2. Read the SQL file at that line
3. Test the SQL directly in `psql` to isolate the problem
4. Fix the syntax and rebuild (never modify already-applied migrations!)

**Common mistakes:**
- JSON escape characters in PostgreSQL strings
- Missing semicolons
- Using MySQL syntax in PostgreSQL
- Incorrect quote types (single vs double)

---

## Acceptance Criteria Verification

All acceptance criteria from ticket **FIT-104** were successfully met:

### ✅ 1. Spring Boot App Starts on http://localhost:8080
**Verification:**
```bash
docker compose ps
# Output shows: 0.0.0.0:8080->8080/tcp (published)
```

### ✅ 2. Health Check Endpoint Returns UP
**Verification:**
```bash
curl http://localhost:8080/actuator/health
# Output: {"status":"UP"}
```

### ✅ 3. OpenAPI Docs Accessible
**Verification:**
- Swagger UI: http://localhost:8080/swagger-ui.html ✅
- API Docs JSON: http://localhost:8080/v3/api-docs ✅

### ✅ 4. Database Connection Successful
**Verification:**
```bash
docker compose logs app | grep -i hikari
# Output: HikariPool-1 - Started.

docker compose exec postgres psql -U fitnessuser -d fitness_mvp -c "\d"
# Output: Shows all tables created by migration
```

---

## Files Modified/Created Today

### Modified:
1. **`docker-compose.yml`** (line 6)
   - Fixed PostgreSQL health check command
   
2. **`build.gradle.kts`** (line 28)
   - Added Flyway PostgreSQL driver dependency

3. **`src/main/resources/db/migration/V1__initial_schema.sql`** (line 162)
   - Fixed JSON syntax for equipment arrays

### Created:
1. **`.git/` directory**
   - Initialized Git repository

2. **`docs/project-log-2025-10-13.md`** (this file)
   - Comprehensive project documentation

---

## Key Takeaways for Future Work

### 1. Always Check Dependencies Against Target Versions
When using tools like Flyway, verify they support the specific version of your database. Add database-specific drivers when needed.

### 2. Test Locally Before Committing
Run `docker compose up --build` to verify changes before pushing to Git. This catches migration syntax errors and dependency issues early.

### 3. Use Health Checks Properly
Health checks aren't just for uptime monitoring—they control startup order and prevent cascading failures. Be explicit with database names, ports, and credentials.

### 4. Keep Migrations Simple
Complex migrations increase risk. Break large changes into smaller, safer steps. Always test migrations against a copy of production data.

### 5. Document As You Go
Write down what you tried, what failed, and what worked. Future you (and your teammates) will thank you.

### 6. Understand the "Why" Not Just the "How"
Don't just copy-paste solutions. Understand:
- Why Docker improves consistency
- Why Flyway prevents schema drift
- Why Redis speeds up applications
- Why health checks matter in distributed systems

---

## Next Steps & Recommendations

### Immediate (Next Session):
1. **Add CI/CD Pipeline**
   - Create `.github/workflows/ci.yml` for automated testing
   - Run Flyway migrations in CI to catch syntax errors early
   - Build and push Docker images automatically

2. **Implement Caching**
   - Add `@Cacheable` annotations to expensive service methods
   - Configure Redis TTL and eviction policies
   - Test cache hit/miss behavior

3. **Add Integration Tests**
   - Use Testcontainers to spin up PostgreSQL/Redis for tests
   - Verify Flyway migrations work in test environment
   - Test API endpoints end-to-end

### Short-term (This Week):
1. **Security Hardening**
   - Replace HTTP Basic Auth with OAuth2/JWT
   - Add rate limiting for public endpoints
   - Configure CORS properly for frontend integration

2. **Monitoring & Observability**
   - Add structured logging (JSON format)
   - Configure Prometheus metrics export
   - Set up alerts for health check failures

3. **Database Optimization**
   - Add indexes to frequently queried columns
   - Configure connection pool size for expected load
   - Set up database backups in production

### Long-term (This Month):
1. **Feature Development**
   - Implement YouTube API integration
   - Build workout video management endpoints
   - Add user authentication and authorization

2. **Production Readiness**
   - Deploy to staging environment (AWS/GCP/Azure)
   - Set up Kubernetes for orchestration
   - Implement blue/green deployment strategy

3. **Documentation**
   - Write API documentation with examples
   - Create architecture diagrams
   - Document deployment procedures

---

## Commands Reference Sheet

### Docker Compose Essentials
```bash
# Start all services in background
docker compose up -d

# Rebuild and start
docker compose up --build

# Stop and remove containers
docker compose down

# Stop and remove containers + volumes (nuclear option)
docker compose down -v --remove-orphans

# View logs for all services
docker compose logs -f

# View logs for specific service
docker compose logs app -f

# Check service status
docker compose ps

# Rebuild specific service without cache
docker compose build --no-cache app

# Execute command in running container
docker compose exec postgres psql -U fitnessuser -d fitness_mvp

# Restart specific service
docker compose restart app
```

### PostgreSQL Commands
```bash
# Connect to database
psql postgresql://fitnessuser:dev_password@localhost:5432/fitness_mvp

# Inside psql:
\d                          # List all tables
\d table_name               # Describe table structure
SELECT * FROM flyway_schema_history;  # Check migration history
\q                          # Quit
```

### Git Commands
```bash
# Check status
git status

# Add files
git add .

# Commit
git commit -m "Your message"

# Push to remote
git push origin main

# Create and switch to new branch
git checkout -b feature-branch-name

# View remote
git remote -v
```

### Debugging Commands
```bash
# Check what's using port 8080
lsof -i :8080

# View Docker images
docker images

# Remove unused images
docker image prune

# View all containers (including stopped)
docker ps -a

# Remove specific container
docker rm <container_id>

# View Docker volumes
docker volume ls

# Remove specific volume
docker volume rm <volume_name>
```

---

## Conclusion

Today was a productive day of learning and problem-solving. We transformed a broken Docker setup into a fully functional development environment, learned fundamental DevOps concepts, and established best practices for database migrations and container orchestration.

**Most valuable lesson:** Understanding **why** we use each tool (Docker for consistency, Flyway for schema safety, Redis for performance, health checks for reliability) is more important than just knowing **how** to use them.

**Biggest challenge overcome:** Debugging the PostgreSQL health check issue taught us to read error messages carefully and understand the underlying tool behavior (in this case, `pg_isready`'s default assumptions).

**Ready for next phase:** With a solid foundation in place, we're now prepared to build features, add tests, and eventually deploy to production with confidence.

---

*Log created: October 13, 2025*  
*Project: CameraFirst-Fitness Backend*  
*Author: Backend Engineer*
