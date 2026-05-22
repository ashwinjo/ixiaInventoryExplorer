# syntax=docker/dockerfile:1

# Stage 1: Build frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY src ./src
COPY public ./public
COPY index.html ./
COPY vite.config.js ./
COPY tailwind.config.js ./
COPY postcss.config.js ./
COPY tsconfig.json* ./

RUN npm run build

# Stage 2: Python backend
FROM python:3.11-slim AS backend

WORKDIR /app

# Install uv from official image (faster than pip install uv)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Install system dependencies
RUN apt-get update && apt-get install -y \
    procps \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt ./
RUN uv pip install --system --no-cache -r requirements.txt

# Copy application files
COPY . .

# Copy built frontend from builder stage
COPY --from=frontend-builder /app/dist ./dist

# Create data directory, fix permissions, make entrypoint executable
RUN mkdir -p /app/data && \
    chmod 755 /app/data && \
    chmod +x /app/docker-entrypoint.sh

# Create non-root user and hand off ownership
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

USER appuser

ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"]
