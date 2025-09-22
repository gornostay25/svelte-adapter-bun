# syntax=docker/dockerfile:1
# Build arguments
ARG BUN_VERSION=1.2.22

# =========================================
# Stage 1: Build stage
# =========================================

FROM oven/bun:${BUN_VERSION}-alpine AS builder

# Copy package files first for better caching
COPY package.json bun.lock ./

# Install dependencies
RUN bun install

COPY . .
# Build app
RUN bun -b run build

# =========================================
# Stage 2: Production stage
# =========================================

FROM oven/bun:${BUN_VERSION}-alpine AS production

# Set timezone to Europe/Podgorica
ENV TZ=Europe/Podgorica
RUN apk add --no-cache tzdata

# Copy built site app
COPY --from=builder /home/bun/app/dist ./

# Create public directory with correct permissions
RUN mkdir -p /home/bun/public && chown -R bun:bun /home/bun/public

USER bun

# Expose port
ENV PORT=3000
EXPOSE 3000

ENTRYPOINT [ "sh", "./entrypoint.sh" ]
# Start the application
CMD ["bun", "./index.js"]