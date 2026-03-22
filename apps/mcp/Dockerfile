# Build stage
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./
COPY libs/dsl/package.json ./libs/dsl/
COPY libs/core/package.json ./libs/core/
COPY apps/mcp/package.json ./apps/mcp/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source files
COPY libs/dsl/ ./libs/dsl/
COPY libs/core/ ./libs/core/
COPY apps/mcp/ ./apps/mcp/
COPY schema.json ./

# Production stage
FROM oven/bun:1-alpine

WORKDIR /app/apps/mcp

# Copy from builder
COPY --from=builder /app /app

# Environment defaults (override with docker run -e)
ENV NODE_ENV=production

# MCP uses stdio, no port needed
CMD ["bun", "start"]
