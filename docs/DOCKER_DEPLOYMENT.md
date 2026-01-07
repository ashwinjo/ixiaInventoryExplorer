# Docker Build and Deployment Guide

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Building Docker Image for Linux](#building-docker-image-for-linux)
4. [Running the Container](#running-the-container)
5. [Docker Compose](#docker-compose)
6. [Production Deployment](#production-deployment)
7. [Troubleshooting](#troubleshooting)

## Overview

This guide explains how to build and deploy the Ixia Inventory Explorer application using Docker on a Linux system. The application consists of:
- FastAPI backend (Python)
- React frontend (Node.js/Vite)
- SQLite database

## Prerequisites

- Docker Engine 20.10+ installed on Linux
- Docker Compose (optional, for multi-container setup)
- Git (to clone repository)
- At least 2GB free disk space

**Verify Docker Installation:**
```bash
docker --version
docker-compose --version
```

## Building Docker Image for Linux

### Step 1: Prepare the Build Context

Ensure you're in the project root directory:

```bash
cd /path/to/ixiaInventoryExplorer
```

### Step 2: Build Frontend (Production Build)

First, build the React frontend for production:

```bash
# Install dependencies and build
npm install
npm run build
```

This creates a `dist/` directory with optimized production files.

### Step 3: Update Dockerfile (if needed)

The Dockerfile should:
1. Use Python base image
2. Install system dependencies
3. Install Python dependencies
4. Copy application files
5. Build frontend (or copy pre-built files)
6. Expose port 3000
7. Run FastAPI with Uvicorn

**Example Multi-stage Dockerfile:**

```dockerfile
# Stage 1: Build frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Python backend
FROM python:3.8-slim-buster
WORKDIR /python-docker

# Install system dependencies
RUN apt-get update && apt-get install -y \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt
ENV PIP_ROOT_USER_ACTION=ignore

# Copy application files
COPY . .

# Copy built frontend from builder stage
COPY --from=frontend-builder /app/dist ./dist

# Expose port
EXPOSE 3000

# Run application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3000"]
```

### Step 4: Build Docker Image

**For Linux AMD64 (x86_64):**
```bash
docker build -t ixia-inventory-explorer:latest .
```

**For Linux ARM64:**
```bash
docker build --platform linux/arm64 -t ixia-inventory-explorer:latest .
```

**For specific architecture:**
```bash
docker build --platform linux/amd64 -t ixia-inventory-explorer:latest .
```

**With build arguments:**
```bash
docker build \
  --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
  --build-arg VERSION=2.0.0 \
  -t ixia-inventory-explorer:latest \
  .
```

**Verify Image:**
```bash
docker images | grep ixia-inventory-explorer
```

## Running the Container

### Basic Run Command

```bash
docker run -d \
  --name ixia-explorer \
  -p 3000:3000 \
  ixia-inventory-explorer:latest
```

### Run with Volume for Data Persistence

```bash
# Create volume for database persistence
docker volume create ixia-data

# Run container with volume
docker run -d \
  --name ixia-explorer \
  -p 3000:3000 \
  -v ixia-data:/python-docker \
  ixia-inventory-explorer:latest
```

### Run with Environment Variables

```bash
docker run -d \
  --name ixia-explorer \
  -p 3000:3000 \
  -e PORT=3000 \
  -e DEBUG=False \
  -e DATABASE_PATH=/python-docker/inventory.db \
  -e CORS_ORIGINS=http://localhost:3000 \
  -v ixia-data:/python-docker \
  ixia-inventory-explorer:latest
```

### Run with Environment File

Create `.env` file:
```env
PORT=3000
DEBUG=False
DATABASE_PATH=/python-docker/inventory.db
CORS_ORIGINS=http://localhost:3000
```

Run with env file:
```bash
docker run -d \
  --name ixia-explorer \
  -p 3000:3000 \
  --env-file .env \
  -v ixia-data:/python-docker \
  ixia-inventory-explorer:latest
```

### Run with Host Network (Linux only)

```bash
docker run -d \
  --name ixia-explorer \
  --network host \
  ixia-inventory-explorer:latest
```

## Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: ixia-inventory-explorer
    ports:
      - "3000:3000"
    volumes:
      - ixia-data:/python-docker
      - ./inventory.db:/python-docker/inventory.db  # Optional: mount specific file
    environment:
      - PORT=3000
      - DEBUG=False
      - DATABASE_PATH=/python-docker/inventory.db
      - CORS_ORIGINS=http://localhost:3000
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  ixia-data:
    driver: local
```

**Start with Docker Compose:**
```bash
docker-compose up -d
```

**View logs:**
```bash
docker-compose logs -f
```

**Stop:**
```bash
docker-compose down
```

**Rebuild:**
```bash
docker-compose up -d --build
```

## Production Deployment

### 1. Build Production Image

```bash
docker build \
  --platform linux/amd64 \
  -t ixia-inventory-explorer:v2.0.0 \
  -t ixia-inventory-explorer:latest \
  .
```

### 2. Tag for Registry (Optional)

```bash
docker tag ixia-inventory-explorer:latest \
  your-registry.com/ixia-inventory-explorer:latest
```

### 3. Push to Registry (Optional)

```bash
docker push your-registry.com/ixia-inventory-explorer:latest
```

### 4. Run Production Container

```bash
docker run -d \
  --name ixia-explorer-prod \
  --restart unless-stopped \
  -p 80:3000 \
  -v ixia-data:/python-docker \
  --env-file .env.production \
  ixia-inventory-explorer:latest
```

### 5. Using Systemd Service

Create `/etc/systemd/system/ixia-explorer.service`:

```ini
[Unit]
Description=Ixia Inventory Explorer
After=docker.service
Requires=docker.service

[Service]
Type=simple
Restart=always
RestartSec=10
ExecStart=/usr/bin/docker run --rm \
  --name ixia-explorer \
  -p 3000:3000 \
  -v ixia-data:/python-docker \
  --env-file /opt/ixia-explorer/.env \
  ixia-inventory-explorer:latest
ExecStop=/usr/bin/docker stop ixia-explorer

[Install]
WantedBy=multi-user.target
```

**Enable and start:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable ixia-explorer
sudo systemctl start ixia-explorer
sudo systemctl status ixia-explorer
```

## Container Management Commands

### View Running Containers
```bash
docker ps
docker ps -a  # Include stopped containers
```

### View Logs
```bash
docker logs ixia-explorer
docker logs -f ixia-explorer  # Follow logs
docker logs --tail 100 ixia-explorer  # Last 100 lines
```

### Execute Commands in Container
```bash
docker exec -it ixia-explorer bash
docker exec ixia-explorer python init_db.py
```

### Stop Container
```bash
docker stop ixia-explorer
```

### Start Container
```bash
docker start ixia-explorer
```

### Remove Container
```bash
docker rm ixia-explorer
docker rm -f ixia-explorer  # Force remove running container
```

### Remove Image
```bash
docker rmi ixia-inventory-explorer:latest
```

### Clean Up
```bash
# Remove stopped containers
docker container prune

# Remove unused images
docker image prune

# Remove unused volumes (careful!)
docker volume prune
```

## Volume Management

### List Volumes
```bash
docker volume ls
```

### Inspect Volume
```bash
docker volume inspect ixia-data
```

### Backup Database
```bash
docker run --rm \
  -v ixia-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/ixia-backup-$(date +%Y%m%d).tar.gz -C /data .
```

### Restore Database
```bash
docker run --rm \
  -v ixia-data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/ixia-backup-YYYYMMDD.tar.gz -C /data
```

## Network Configuration

### Create Custom Network
```bash
docker network create ixia-network
```

### Run Container on Custom Network
```bash
docker run -d \
  --name ixia-explorer \
  --network ixia-network \
  -p 3000:3000 \
  ixia-inventory-explorer:latest
```

### Connect Container to Network
```bash
docker network connect ixia-network ixia-explorer
```

## Troubleshooting

### Container Won't Start

**Check logs:**
```bash
docker logs ixia-explorer
```

**Common issues:**
1. Port already in use: Change port mapping `-p 3001:3000`
2. Permission issues: Check volume permissions
3. Missing dependencies: Verify Dockerfile includes all requirements

### Database Issues

**Initialize database:**
```bash
docker exec ixia-explorer python init_db.py
```

**Check database file:**
```bash
docker exec ixia-explorer ls -la /python-docker/inventory.db
```

### Frontend Not Loading

**Verify build:**
```bash
docker exec ixia-explorer ls -la /python-docker/dist
```

**Check FastAPI static files:**
```bash
docker exec ixia-explorer curl http://localhost:3000/static/
```

### Performance Issues

**Monitor resource usage:**
```bash
docker stats ixia-explorer
```

**Limit resources:**
```bash
docker run -d \
  --name ixia-explorer \
  --memory="512m" \
  --cpus="1.0" \
  -p 3000:3000 \
  ixia-inventory-explorer:latest
```

### Build Failures

**Clear build cache:**
```bash
docker builder prune
```

**Build without cache:**
```bash
docker build --no-cache -t ixia-inventory-explorer:latest .
```

## Security Considerations

1. **Don't run as root** - Use non-root user in Dockerfile
2. **Use secrets** - Don't hardcode credentials
3. **Keep images updated** - Regularly update base images
4. **Scan images** - Use `docker scan` to check vulnerabilities
5. **Limit resources** - Set memory and CPU limits
6. **Use read-only filesystem** where possible

## Example Production Deployment Script

```bash
#!/bin/bash
# deploy.sh

set -e

IMAGE_NAME="ixia-inventory-explorer"
VERSION="2.0.0"
CONTAINER_NAME="ixia-explorer"

echo "Building Docker image..."
docker build --platform linux/amd64 -t ${IMAGE_NAME}:${VERSION} .

echo "Stopping existing container..."
docker stop ${CONTAINER_NAME} || true
docker rm ${CONTAINER_NAME} || true

echo "Starting new container..."
docker run -d \
  --name ${CONTAINER_NAME} \
  --restart unless-stopped \
  -p 3000:3000 \
  -v ixia-data:/python-docker \
  --env-file .env.production \
  ${IMAGE_NAME}:${VERSION}

echo "Deployment complete!"
docker ps | grep ${CONTAINER_NAME}
```

Make executable and run:
```bash
chmod +x deploy.sh
./deploy.sh
```

