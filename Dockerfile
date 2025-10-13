# syntax=docker/dockerfile:1

FROM gradle:8.10.2-jdk21-alpine AS build
WORKDIR /home/gradle/project
COPY gradle gradle
COPY gradlew gradlew
COPY build.gradle.kts settings.gradle.kts ./
COPY src src
RUN chmod +x gradlew \
    && ./gradlew bootJar --no-daemon

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /home/gradle/project/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]
