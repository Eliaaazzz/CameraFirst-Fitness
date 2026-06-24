# syntax=docker/dockerfile:1

# ---- build stage ----
FROM golang:1.26-alpine AS build
WORKDIR /src

# Cache modules first.
COPY go.mod go.sum* ./
# Fetch deps if the network is available; ignore failure so an offline build can
# still proceed with the `noprom` fallback (no external modules required).
RUN go mod download || true

COPY . .

# Default build uses prometheus/client_golang. If module resolution fails
# (offline), retry with the hand-rolled /metrics fallback (-tags noprom), which
# has zero external dependencies.
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -o /auramock ./... \
    || CGO_ENABLED=0 GOOS=linux go build -trimpath -tags noprom -o /auramock ./...

# ---- runtime stage ----
FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /
COPY --from=build /auramock /auramock
EXPOSE 8089
USER nonroot:nonroot
ENTRYPOINT ["/auramock"]
