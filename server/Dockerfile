# Multi-stage build: static binary, distroless runtime (~15 MB image).
FROM golang:1.23-alpine AS build
WORKDIR /src

# Cache module downloads.
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server

FROM gcr.io/distroless/static-debian12:nonroot

COPY --from=build /out/server /server

# Non-root, no shell, no package manager.
USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["/server"]
