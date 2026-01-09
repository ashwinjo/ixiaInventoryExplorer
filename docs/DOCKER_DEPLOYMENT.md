# Docker Deployment Guide for Ixia Inventory Explorer

## Overview

This guide explains how to build and run the Ixia Inventory Explorer application as a Docker container. The Docker image supports both **Mac (ARM64)** and **Linux (AMD64)** platforms.

## Prerequisites

- Docker Desktop (for Mac/Windows) or Docker Engine (for Linux)
- Docker Buildx (included with Docker Desktop, or install separately for Linux)
- At least 2GB of free disk space
- Port 3000 available on your host machine

## Building the Docker Image

### Multi-Platform Build (Recommended)

To build for both Mac (ARM64) and Linux (AMD64):

```bash
# Create a new buildx builder (if not already created)
docker buildx create --name multiplatform --use

# Build for multiple platforms
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t ixia-inventory-explorer:latest \
  --load \
  .
```

**Note:** The `--load` flag loads the image for your current platform. To push to a registry, use `--push` instead.

### Using the Build Script

We provide a convenient build script:

```bash
chmod +x build-docker.sh
./build-docker.sh
```

### Single Platform Build

#### For Mac (ARM64/M1/M2):
```bash
docker build --platform linux/arm64 -t ixia-inventory-explorer:latest .
```

#### For Linux (AMD64):
```bash
docker build --platform linux/amd64 -t ixia-inventory-explorer:latest .
```

## Running the Container

### Using Docker Compose (Recommended)

1. **Create data directory:**
   ```bash
   mkdir -p data logs
   ```

2. **Start the container:**
   ```bash
   docker-compose up -d
   ```

3. **View logs:**
   ```bash
   docker-compose logs -f
   ```

4. **Stop the container:**
   ```bash
   docker-compose down
   ```

### Using Docker Run

#### Basic Run Command

```bash
# Create data directory
mkdir -p data

# Run the container
docker run -d \
  --name ixia-inventory-explorer \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  --restart unless-stopped \
  ixia-inventory-explorer:latest
```

#### Complete Run Command with All Options

```bash
# Create directories
mkdir -p data logs

# Run the container
docker run -d \
  --name ixia-inventory-explorer \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  -e PORT=3000 \
  -e DATABASE_PATH=/app/data/inventory.db \
  -e CORS_ORIGINS=http://localhost:3000 \
  --restart unless-stopped \
  --health-cmd "curl -f http://localhost:3000/health || exit 1" \
  --health-interval=30s \
  --health-timeout=10s \
  --health-retries=3 \
  ixia-inventory-explorer:latest
```

## Volume Mounts

The application uses volume mounts to persist data:

### Required Volumes

1. **Database Directory** (`/app/data`)
   - **Host Path:** `./data` (or your custom path)
   - **Container Path:** `/app/data`
   - **Purpose:** Stores the SQLite database (`inventory.db`)
   - **Example:**
     ```bash
     -v $(pwd)/data:/app/data
     ```

### Optional Volumes

2. **Logs Directory** (`/app/logs`)
   - **Host Path:** `./logs` (or your custom path)
   - **Container Path:** `/app/logs`
   - **Purpose:** Application logs
   - **Example:**
     ```bash
     -v $(pwd)/logs:/app/logs
     ```

### Volume Mount Examples

#### Linux/Mac:
```bash
# Using absolute path
-v /home/user/ixia-data:/app/data

# Using relative path
-v ./data:/app/data

# Using Docker volume
docker volume create ixia-data
-v ixia-data:/app/data
```

#### Windows (PowerShell):
```powershell
# Using absolute path
-v C:\Users\YourName\ixia-data:/app/data

# Using relative path
-v ${PWD}/data:/app/data
```

## Accessing the Application

Once the container is running:

- **Web UI:** Open your browser and navigate to `http://localhost:3000`
- **API Documentation:** `http://localhost:3000/docs`
- **Health Check:** `http://localhost:3000/health`

## Environment Variables

You can customize the application behavior using environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Port on which the application runs |
| `HOST` | `0.0.0.0` | Host address to bind to |
| `DATABASE_PATH` | `/app/data/inventory.db` | Path to SQLite database |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated list of allowed CORS origins |
| `DEBUG` | `False` | Enable debug mode |

### Setting Environment Variables

#### Docker Run:
```bash
-e PORT=8080 \
-e CORS_ORIGINS=http://localhost:8080,http://example.com
```

#### Docker Compose:
```yaml
environment:
  - PORT=8080
  - CORS_ORIGINS=http://localhost:8080
```

## Container Management

### View Logs
```bash
# Docker Compose
docker-compose logs -f

# Docker Run
docker logs -f ixia-inventory-explorer
```

### Stop Container
```bash
# Docker Compose
docker-compose down

# Docker Run
docker stop ixia-inventory-explorer
```

### Start Container
```bash
# Docker Compose
docker-compose up -d

# Docker Run
docker start ixia-inventory-explorer
```

### Remove Container
```bash
# Docker Compose
docker-compose down -v  # -v removes volumes

# Docker Run
docker rm -f ixia-inventory-explorer
```

### Execute Commands in Container
```bash
docker exec -it ixia-inventory-explorer bash
```

## Database Management

### Database Location

The database is stored at `/app/data/inventory.db` inside the container, which is mounted to your host machine at `./data/inventory.db`.

### Backup Database

```bash
# Copy database from container
docker cp ixia-inventory-explorer:/app/data/inventory.db ./backup-inventory.db

# Or directly from mounted volume
cp ./data/inventory.db ./backup-inventory.db
```

### Restore Database

```bash
# Copy database to container
docker cp ./backup-inventory.db ixia-inventory-explorer:/app/data/inventory.db

# Or directly to mounted volume
cp ./backup-inventory.db ./data/inventory.db
```

## Troubleshooting

### Container Won't Start

1. **Check logs:**
   ```bash
   docker logs ixia-inventory-explorer
   ```

2. **Verify port availability:**
   ```bash
   # Linux/Mac
   lsof -i :3000
   
   # Windows
   netstat -ano | findstr :3000
   ```

3. **Check volume permissions:**
   ```bash
   ls -la ./data
   ```

### Database Issues

1. **Database not persisting:**
   - Ensure volume mount is correct
   - Check volume permissions
   - Verify database path in environment variables

2. **Database locked errors:**
   - Ensure only one container instance is running
   - Check for background processes accessing the database

### Performance Issues

1. **High memory usage:**
   - Multiple polling processes run in background
   - Consider adjusting polling intervals in the UI

2. **Slow startup:**
   - First startup initializes the database
   - Subsequent starts are faster

## Production Deployment

### Using Docker Compose

1. **Update docker-compose.yml** with production settings:
   ```yaml
   environment:
     - PORT=3000
     - DEBUG=False
     - CORS_ORIGINS=https://yourdomain.com
   ```

2. **Use named volumes for data persistence:**
   ```yaml
   volumes:
     - ixia-data:/app/data
   
   volumes:
     ixia-data:
       driver: local
   ```

3. **Add reverse proxy (nginx/traefik)** for SSL termination

### Using Docker Swarm/Kubernetes

The container is compatible with orchestration platforms. Ensure:
- Volume mounts are configured correctly
- Health checks are enabled
- Resource limits are set appropriately

## Building for Production

### Build and Push to Registry

```bash
# Build and tag
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t your-registry/ixia-inventory-explorer:latest \
  -t your-registry/ixia-inventory-explorer:v2.0.0 \
  --push \
  .
```

### Pull and Run

```bash
docker pull your-registry/ixia-inventory-explorer:latest
docker run -d -p 3000:3000 -v ./data:/app/data your-registry/ixia-inventory-explorer:latest
```

## Architecture

The Docker image contains:

1. **Frontend:** React application built with Vite, served as static files
2. **Backend:** FastAPI application running on Uvicorn
3. **Background Workers:** Multiple Python processes for polling different data categories:
   - Chassis polling
   - Cards polling
   - Ports polling
   - Licensing polling
   - Performance metrics polling
   - Sensors polling
   - Data purge
4. **Database:** SQLite database stored in mounted volume

## Security Considerations

1. **Non-root user:** Container runs as `appuser` (UID 1000)
2. **Minimal base image:** Uses slim Python image
3. **No secrets in image:** Use environment variables or secrets management
4. **Volume permissions:** Ensure proper file permissions on mounted volumes

## Quick Start for End Customers

### Step 1: Create Required Directories
```bash
mkdir -p data logs
```

### Step 2: Run with Docker Compose (Easiest)
```bash
docker-compose up -d
```

### Step 3: Access the Application
Open your browser to: `http://localhost:3000`

### Step 4: Stop the Application
```bash
docker-compose down
```

## Support

For issues or questions:
- Check application logs: `docker logs ixia-inventory-explorer`
- Review health endpoint: `http://localhost:3000/health`
- Verify volume mounts are working correctly
- Ensure port 3000 is not already in use
