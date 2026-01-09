# syntax=docker/dockerfile:1

# Stage 1: Build frontend
FROM --platform=$BUILDPLATFORM node:18-alpine AS frontend-builder
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy frontend source
COPY src ./src
COPY public ./public
COPY index.html ./
COPY vite.config.js ./
COPY tailwind.config.js ./
COPY postcss.config.js ./
COPY tsconfig.json* ./

# Build frontend
RUN npm run build

# Stage 2: Python backend
FROM --platform=$BUILDPLATFORM python:3.11-slim AS backend

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    procps \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt ./
RUN pip3 install --no-cache-dir --upgrade pip && \
    pip3 install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Copy built frontend from builder stage
COPY --from=frontend-builder /app/dist ./dist

# Create directory for database
RUN mkdir -p /app/data && \
    chmod 755 /app/data

# Create non-root user for security
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

USER appuser

# Cloud Run uses PORT environment variable (default 8080)
# But we also support custom ports via PORT env var
ENV PORT=8080
EXPOSE 8080

# Health check (use PORT env variable)
# Note: Cloud Run has its own health checks, but this is useful for local Docker
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || exit 1

# Entrypoint script
COPY --chown=appuser:appuser docker-entrypoint.sh /app/
USER root
RUN chmod +x /app/docker-entrypoint.sh
USER appuser

# For Cloud Run: Use the PORT environment variable
# This makes the container work on any platform
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"]
