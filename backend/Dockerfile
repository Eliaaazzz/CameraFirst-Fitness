# syntax=docker/dockerfile:1

# Build stage
FROM gradle:8.10.2-jdk21-alpine AS build
WORKDIR /home/gradle/project

# Copy dependency files first (better layer caching)
COPY build.gradle.kts settings.gradle.kts gradle.properties ./
COPY gradle gradle
COPY gradlew ./

# Download dependencies (cached unless build files change)
RUN ./gradlew dependencies --no-daemon || true

# Copy source code
COPY src src

# Build the JAR
RUN ./gradlew bootJar --no-daemon

# Runtime stage
FROM eclipse-temurin:21-jre-alpine

# Create non-root user
RUN addgroup -S spring && adduser -S spring -G spring

WORKDIR /app

# Copy JAR from build stage
COPY --from=build --chown=spring:spring /home/gradle/project/build/libs/fitness-app.jar app.jar

# Switch to non-root user
USER spring:spring

# Expose application port
EXPOSE 8080

# Health check (Spring Boot Actuator)
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/actuator/health || exit 1

# JVM options for containerized environments
ENV JAVA_OPTS="-Xms256m -Xmx512m -XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
