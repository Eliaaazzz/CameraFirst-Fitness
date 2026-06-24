# syntax=docker/dockerfile:1

# ----- Build stage -----
FROM golang:1.26-alpine AS build
WORKDIR /src

# Cache module downloads first (only re-runs when go.mod/go.sum change).
COPY go.mod go.sum* ./
RUN go mod download

# Build a fully static binary so it can run on a distroless/static base.
COPY *.go ./
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/aura-gateway .

# ----- Runtime stage -----
FROM gcr.io/distroless/static:nonroot
WORKDIR /
COPY --from=build /out/aura-gateway /aura-gateway

# distroless:nonroot already runs as uid 65532.
USER nonroot:nonroot
EXPOSE 8090
ENTRYPOINT ["/aura-gateway"]
