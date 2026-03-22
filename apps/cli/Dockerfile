# Build stage
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./
COPY libs/dsl/package.json ./libs/dsl/
COPY libs/core/package.json ./libs/core/
COPY apps/cli/package.json ./apps/cli/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source files
COPY libs/dsl/ ./libs/dsl/
COPY libs/core/ ./libs/core/
COPY apps/cli/ ./apps/cli/
COPY schema.json ./

# Build standalone executable
RUN bun build apps/cli/src/index.ts --compile --outfile /app/Morph

# Production stage - minimal image with just the binary
FROM alpine:3.19

WORKDIR /app

# Copy compiled binary from builder
COPY --from=builder /app/Morph ./Morph

# Environment defaults (override with docker run -e)
ENV NODE_ENV=production

ENTRYPOINT ["./Morph"]
