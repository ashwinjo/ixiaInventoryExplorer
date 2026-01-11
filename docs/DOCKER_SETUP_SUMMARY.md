# Docker Setup Summary

This document summarizes all the Docker-related files created and how they work together.

## Files Created/Updated

### 1. **Dockerfile**
- Multi-stage build supporting both Mac (ARM64) and Linux (AMD64)
- Stage 1: Builds React frontend using Node.js
- Stage 2: Sets up Python backend and copies built frontend
- Uses Python 3.11-slim for smaller image size
- Runs as non-root user (appuser) for security
- Includes health check endpoint

### 2. **docker-entrypoint.sh**
- Initializes database on first run
- Creates symlink for backward compatibility with sqlite3_utilities.py
- Starts all background polling processes:
  - Chassis polling
  - Cards polling
  - Ports polling
  - Licensing polling
  - Performance metrics polling
  - Sensors polling
  - Data purge
- Handles graceful shutdown of background processes
- Sets up proper signal handling

### 3. **docker-compose.yml**
- Updated with multi-platform support
- Proper volume mounts for data persistence
- Environment variables configuration
- Health check configuration
- Restart policy

### 4. **.dockerignore**
- Excludes unnecessary files from Docker build context
- Reduces build time and image size
- Excludes development files, node_modules, cache, etc.

### 5. **build-docker.sh**
- Helper script for building multi-platform images
- Automatically creates buildx builder if needed
- Builds for both linux/amd64 and linux/arm64

### 6. **docs/DOCKER_DEPLOYMENT.md**
- Comprehensive deployment guide
- Instructions for building and running
- Volume mount explanations
- Troubleshooting section
- Production deployment guidelines

## How It Works

### Database Handling
- Database is stored at `/app/data/inventory.db` (configurable via `DATABASE_PATH`)
- On first run, `init_db.py` creates the database
- A symlink `/app/inventory.db -> /app/data/inventory.db` is created for backward compatibility
- The symlink allows `sqlite3_utilities.py` (which hardcodes 'inventory.db') to work correctly
- The FastAPI app uses `DATABASE_PATH` environment variable via `app/database.py`

### Background Processes
- All polling processes run as background jobs
- Each process polls its category at intervals configured in the database
- Processes are gracefully terminated on container shutdown
- Process IDs are tracked for proper cleanup

### Volume Mounts
- **Required:** `./data:/app/data` - Database persistence
- **Optional:** `./logs:/app/logs` - Application logs

## Quick Start for End Customers

### Option 1: Docker Compose (Recommended)
```bash
# 1. Create data directory
mkdir -p data

# 2. Start container
docker-compose up -d

# 3. Access application
# Open browser: http://localhost:3000
```

### Option 2: Docker Run
```bash
# 1. Create data directory
mkdir -p data

# 2. Run container
docker run -d \
  --name ixia-inventory-explorer \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  --restart unless-stopped \
  ixia-inventory-explorer:latest

# 3. Access application
# Open browser: http://localhost:3000
```

## Building the Image

### Multi-Platform Build
```bash
./build-docker.sh
```

Or manually:
```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t ixia-inventory-explorer:latest \
  --load \
  .
```

## Key Features

1. **Multi-Platform Support**: Works on both Mac (ARM64) and Linux (AMD64)
2. **Data Persistence**: Database stored in mounted volume
3. **Automatic Initialization**: Database and tables created on first run
4. **Background Polling**: All polling processes start automatically
5. **Health Checks**: Built-in health check endpoint
6. **Security**: Runs as non-root user
7. **Graceful Shutdown**: Properly terminates all background processes

## Architecture

```
┌─────────────────────────────────────┐
│   Docker Container                   │
│                                       │
│  ┌───────────────────────────────┐  │
│  │   FastAPI (Port 3000)         │  │
│  │   - Serves React Frontend     │  │
│  │   - REST API                  │  │
│  └───────────────────────────────┘  │
│                                       │
│  ┌───────────────────────────────┐  │
│  │   Background Pollers         │  │
│  │   - Chassis                  │  │
│  │   - Cards                    │  │
│  │   - Ports                    │  │
│  │   - Licensing                │  │
│  │   - Performance              │  │
│  │   - Sensors                  │  │
│  │   - Data Purge               │  │
│  └───────────────────────────────┘  │
│                                       │
│  ┌───────────────────────────────┐  │
│  │   SQLite Database             │  │
│  │   /app/data/inventory.db      │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
         │
         │ Volume Mount
         ▼
    ./data/inventory.db
    (Host Machine)
```

## Notes

- The container automatically initializes the database on first run
- All polling intervals can be configured via the web UI (Config page)
- Database is persisted in the `./data` directory on the host
- The container runs all services in a single process (not microservices)
- Background processes are managed by the entrypoint script

