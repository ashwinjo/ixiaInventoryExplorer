# Docker Deployment Guide - Ixia Inventory Explorer

Complete guide for building and running frontend and backend Docker containers separately or together.

---

## 🚀 Quick Start

### Option 1: Docker Compose (Easiest - Recommended)

```bash
# Development mode (separate frontend + backend)
docker-compose -f docker-compose.dev.yml up -d

# Production mode (single container)
docker-compose up -d
```

### Option 2: Standalone Containers

```bash
# 1. Build images
docker build -f Dockerfile.backend -t ixia-backend:latest .
docker build -f Dockerfile.frontend -t ixia-frontend:latest .

# 2. Create network
docker network create ixia-network

# 3. Run backend
docker run -d --name ixia-backend --network ixia-network \
  -p 3001:3001 -e PORT=3001 -v $(pwd)/data:/app/data ixia-backend:latest

# 4. Run frontend
docker run -d --name ixia-frontend --network ixia-network \
  -p 5174:5174 -e PORT=5174 \
  -e VITE_BACKEND_URL=http://ixia-backend:3001 ixia-frontend:latest
```

**Access:**
- Frontend: http://localhost:5174
- Backend: http://localhost:3001

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Building Docker Images](#building-docker-images)
3. [Running Containers Separately](#running-containers-separately)
4. [Running Containers Together](#running-containers-together)
5. [Container Networking](#container-networking)
6. [Environment Variables](#environment-variables)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Docker Desktop (Mac/Windows) or Docker Engine (Linux)
- Docker Compose (included with Docker Desktop)
- At least 2GB free disk space
- Ports available: 3001 (backend), 5174 (frontend), or custom ports

---

## Building Docker Images

### Build Frontend Image

```bash
docker build -f Dockerfile.frontend -t ixia-frontend:latest .
```

**What this builds:**
- Node.js 18 Alpine base image
- Installs npm dependencies
- Copies React/Vite source code
- Sets up Vite dev server configuration
- Image size: ~500MB

**Build time:** ~2-3 minutes (first build), ~30 seconds (cached)

---

### Build Backend Image

```bash
docker build -f Dockerfile.backend -t ixia-backend:latest .
```

**What this builds:**
- Python 3.11 slim base image
- Installs system dependencies (curl, procps)
- Installs Python dependencies using `uv` (fast package installer)
- Copies FastAPI application code
- Sets up entrypoint script for database init and background pollers
- Image size: ~1.4GB

**Build time:** ~5-10 minutes (first build), ~1 minute (cached)

---

### Build Production Image (Frontend + Backend Combined)

```bash
docker build -t ixia-inventory-explorer:latest .
```

**What this builds:**
- Multi-stage build:
  - Stage 1: Builds React frontend (npm build)
  - Stage 2: Python backend + built frontend static files
- Single container serving both frontend and API
- Image size: ~1.4GB

**Build time:** ~8-12 minutes (first build), ~2 minutes (cached)

---

## Running Containers Separately

When running containers separately, you need to set up Docker networking so they can communicate.

### Step 1: Create a Docker Network

```bash
docker network create ixia-network
```

This creates a bridge network where containers can communicate using their container names.

---

### Step 2: Run Backend Container

```bash
docker run -d \
  --name ixia-backend \
  --network ixia-network \
  -p 3001:3001 \
  -e PORT=3001 \
  -e DATABASE_PATH=/app/data/inventory.db \
  -e CORS_ORIGINS=* \
  -v $(pwd)/data:/app/data \
  ixia-backend:latest
```

**Parameters:**
- `--name ixia-backend`: Container name (used for networking)
- `--network ixia-network`: Joins the Docker network
- `-p 3001:3001`: Maps host port 3001 to container port 3001
- `-e PORT=3001`: Sets the backend port (must match port mapping)
- `-v $(pwd)/data:/app/data`: Mounts data directory for database persistence

**Verify backend is running:**
```bash
curl http://localhost:3001/health
# Should return: {"status":"healthy"}
```

---

### Step 3: Run Frontend Container

```bash
docker run -d \
  --name ixia-frontend \
  --network ixia-network \
  -p 5174:5174 \
  -e PORT=5174 \
  -e VITE_BACKEND_URL=http://ixia-backend:3001 \
  ixia-frontend:latest
```

**Parameters:**
- `--name ixia-frontend`: Container name
- `--network ixia-network`: **Same network as backend** (required!)
- `-p 5174:5174`: Maps host port 5174 to container port 5174
- `-e PORT=5174`: Sets the frontend port
- `-e VITE_BACKEND_URL=http://ixia-backend:3001`: **Uses container name** `ixia-backend` to connect to backend

**Key Point:** `VITE_BACKEND_URL` uses `http://ixia-backend:3001` (container name) not `http://localhost:3001` because containers communicate via Docker network.

**Verify frontend is running:**
```bash
curl http://localhost:5174
# Should return HTML content
```

---

### Access the Application

- **Frontend:** http://localhost:5174
- **Backend API:** http://localhost:3001
- **API Docs:** http://localhost:3001/docs

---

## Running Containers Together (Docker Compose)

Docker Compose automatically creates a network and handles container communication.

### Development Mode (Separate Frontend + Backend)

```bash
# Start both containers
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop containers
docker-compose -f docker-compose.dev.yml down
```

**What happens:**
- Creates network `ixia-network` automatically
- Backend starts first, waits for health check
- Frontend starts after backend is healthy
- Containers communicate via service names (`backend` and `frontend`)

**Custom Ports:**
```bash
FRONTEND_PORT=3000 BACKEND_PORT=8080 docker-compose -f docker-compose.dev.yml up -d
```

---

### Production Mode (Single Container)

```bash
# Start production container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop container
docker-compose down
```

**What happens:**
- Single container serves both frontend (static files) and backend API
- Frontend and API are on the same origin (no CORS issues)
- Simpler deployment, fewer moving parts

**Custom Port:**
```bash
PORT=9000 docker-compose up -d
```

---

## Container Networking

### Service Names vs Container Names

| Context | Service Name | Container Name | Use This in VITE_BACKEND_URL |
|---------|--------------|----------------|------------------------------|
| **docker-compose.dev.yml** | `backend` | `ixia-backend` | `http://backend:3001` ✅ |
| **docker-compose.dev.yml** | `frontend` | `ixia-frontend` | N/A |
| **Standalone containers** | N/A | `ixia-backend` | `http://ixia-backend:3001` ✅ |
| **Standalone containers** | N/A | `ixia-frontend` | N/A |

**Key Rule:** 
- **Docker Compose:** Use service name (`backend`)
- **Standalone:** Use container name (`ixia-backend`)

### How Containers Reference Each Other

When containers are on the same Docker network, they can communicate using:

1. **Container Name** (when running containers separately)
   ```bash
   # Container name: ixia-backend
   VITE_BACKEND_URL=http://ixia-backend:3001
   ```

2. **Service Name** (when using docker-compose)
   ```bash
   # Service name: backend (defined in docker-compose.yml)
   VITE_BACKEND_URL=http://backend:3001
   ```
   **Note:** In docker-compose, use the **service name** (from `services:` section), not the container name!

3. **Network Alias** (if configured)
   ```bash
   # Custom alias
   VITE_BACKEND_URL=http://api:3001
   ```

**Important:** 
- Docker Compose: Use **service name** (`backend`, `frontend`)
- Standalone containers: Use **container name** (`ixia-backend`, `ixia-frontend`)

### Network Scenarios

#### Scenario 1: Both Containers on Same Network ✅

```bash
# Create network
docker network create ixia-network

# Run backend
docker run -d --name backend --network ixia-network -p 3001:3001 ixia-backend:latest

# Run frontend (can connect to backend)
docker run -d --name frontend --network ixia-network -p 5174:5174 \
  -e VITE_BACKEND_URL=http://backend:3001 ixia-frontend:latest
```

**Result:** ✅ Frontend can connect to backend using `http://backend:3001`

---

#### Scenario 2: Containers on Different Networks ❌

```bash
# Backend on network1
docker run -d --name backend --network network1 -p 3001:3001 ixia-backend:latest

# Frontend on network2
docker run -d --name frontend --network network2 -p 5174:5174 \
  -e VITE_BACKEND_URL=http://backend:3001 ixia-frontend:latest
```

**Result:** ❌ Frontend cannot resolve `backend` hostname (different networks)

**Solution:** Connect frontend to backend's network:
```bash
docker network connect network1 frontend
```

---

#### Scenario 3: Frontend Connecting to Backend on Host Machine

If backend is running on your host machine (not in Docker):

**Mac/Windows:**
```bash
docker run -d --name frontend -p 5174:5174 \
  -e VITE_BACKEND_URL=http://host.docker.internal:3001 ixia-frontend:latest
```

**Linux:**
```bash
# Find host IP
ip addr show docker0 | grep inet

# Use host IP (e.g., 172.17.0.1)
docker run -d --name frontend -p 5174:5174 \
  -e VITE_BACKEND_URL=http://172.17.0.1:3001 ixia-frontend:latest
```

---

## Environment Variables

### Frontend Container

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5174` | Vite dev server port |
| `VITE_BACKEND_URL` | `http://backend:3001` | Backend API URL for proxy |
| `NODE_ENV` | `development` | Node environment |

**Important:** `VITE_BACKEND_URL` must use:
- Container name/service name when containers are on same network
- `host.docker.internal` when connecting to host machine (Mac/Windows)
- Host IP when connecting to host machine (Linux)
- Full URL when connecting to remote server

---

### Backend Container

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | FastAPI server port |
| `DATABASE_PATH` | `/app/data/inventory.db` | SQLite database path |
| `CORS_ORIGINS` | `*` | Allowed CORS origins (comma-separated) |
| `HOST` | `0.0.0.0` | Bind address |
| `MINIMAL_MODE` | `false` | Skip background pollers if `true` |
| `DEBUG` | `False` | Enable debug logging |

---

## Complete Examples

### Example 1: Development Setup (Separate Containers)

```bash
# 1. Build images
docker build -f Dockerfile.backend -t ixia-backend:latest .
docker build -f Dockerfile.frontend -t ixia-frontend:latest .

# 2. Create network
docker network create ixia-network

# 3. Run backend
docker run -d \
  --name ixia-backend \
  --network ixia-network \
  -p 3001:3001 \
  -e PORT=3001 \
  -v $(pwd)/data:/app/data \
  ixia-backend:latest

# 4. Wait for backend to be healthy
sleep 10
curl http://localhost:3001/health

# 5. Run frontend
docker run -d \
  --name ixia-frontend \
  --network ixia-network \
  -p 5174:5174 \
  -e PORT=5174 \
  -e VITE_BACKEND_URL=http://ixia-backend:3001 \
  ixia-frontend:latest

# 6. Access application
# Frontend: http://localhost:5174
# Backend: http://localhost:3001
```

---

### Example 2: Production Setup (Single Container)

```bash
# 1. Build production image
docker build -t ixia-inventory-explorer:latest .

# 2. Create data directory
mkdir -p data

# 3. Run container
docker run -d \
  --name ixia-explorer \
  -p 8080:8080 \
  -e PORT=8080 \
  -v $(pwd)/data:/app/data \
  ixia-inventory-explorer:latest

# 4. Access application
# http://localhost:8080 (frontend + API)
```

---

### Example 3: Custom Ports

```bash
# Backend on port 9000
docker run -d \
  --name ixia-backend \
  --network ixia-network \
  -p 9000:9000 \
  -e PORT=9000 \
  -v $(pwd)/data:/app/data \
  ixia-backend:latest

# Frontend on port 3000, connecting to backend on 9000
docker run -d \
  --name ixia-frontend \
  --network ixia-network \
  -p 3000:3000 \
  -e PORT=3000 \
  -e VITE_BACKEND_URL=http://ixia-backend:9000 \
  ixia-frontend:latest
```

---

## Troubleshooting

### Frontend Can't Connect to Backend

**Symptoms:**
- Browser console shows: `Network Error` or `Proxy error`
- Frontend loads but API calls fail

**Solutions:**

1. **Verify containers are on same network:**
   ```bash
   docker network inspect ixia-network
   ```
   Should show both `ixia-backend` and `ixia-frontend` containers

2. **Check backend is accessible:**
   ```bash
   # From host
   curl http://localhost:3001/health
   
   # From frontend container
   docker exec ixia-frontend wget -O- http://ixia-backend:3001/health
   ```

3. **Verify VITE_BACKEND_URL:**
   ```bash
   docker exec ixia-frontend env | grep VITE_BACKEND_URL
   ```
   Should show: `VITE_BACKEND_URL=http://ixia-backend:3001` (or service name)

4. **Check Vite proxy logs:**
   ```bash
   docker logs ixia-frontend | grep -i proxy
   ```

---

### Port Already in Use

**Error:** `Bind for 0.0.0.0:3001 failed: port is already allocated`

**Solution:**
```bash
# Find process using port
lsof -i :3001  # Mac/Linux
netstat -ano | findstr :3001  # Windows

# Stop the process or use different port
docker run -d -p 9000:3001 -e PORT=3001 ixia-backend:latest
```

---

### Database Permission Errors

**Error:** `Permission denied: /app/data/inventory.db`

**Solution:**
```bash
# Fix permissions on host
chmod 755 data
chmod 644 data/inventory.db

# Or run container with different user
docker run -d --user $(id -u):$(id -g) ...
```

---

### Container Name Conflicts

**Error:** `Conflict. The container name "ixia-backend" is already in use`

**Solution:**
```bash
# Remove existing container
docker rm -f ixia-backend

# Or use different name
docker run -d --name ixia-backend-v2 ...
```

---

## Quick Reference Commands

### Build Commands
```bash
# Frontend only
docker build -f Dockerfile.frontend -t ixia-frontend:latest .

# Backend only
docker build -f Dockerfile.backend -t ixia-backend:latest .

# Production (combined)
docker build -t ixia-inventory-explorer:latest .
```

### Run Commands
```bash
# Separate containers
docker network create ixia-network
docker run -d --name backend --network ixia-network -p 3001:3001 ixia-backend:latest
docker run -d --name frontend --network ixia-network -p 5174:5174 -e VITE_BACKEND_URL=http://backend:3001 ixia-frontend:latest

# Docker Compose (development)
docker-compose -f docker-compose.dev.yml up -d

# Docker Compose (production)
docker-compose up -d
```

### Management Commands
```bash
# View logs
docker logs -f ixia-frontend
docker logs -f ixia-backend

# Stop containers
docker stop ixia-frontend ixia-backend

# Remove containers
docker rm ixia-frontend ixia-backend

# Remove network
docker network rm ixia-network

# Clean up everything
docker-compose -f docker-compose.dev.yml down
docker-compose down
```

---

## Summary

### Key Points for Container Communication

1. **Same Network Required:** Containers must be on the same Docker network to communicate
2. **Use Container Names:** Reference containers by name (e.g., `http://ixia-backend:3001`)
3. **Port Mapping:** Host ports can differ from container ports
4. **Environment Variables:** Set `VITE_BACKEND_URL` correctly based on your setup
5. **Health Checks:** Backend should be healthy before starting frontend

### Recommended Setup

- **Development:** Use `docker-compose.dev.yml` (automatic networking)
- **Production:** Use single container (`docker-compose.yml`)
- **Custom Deployments:** Create network manually and use container names

---

For more details, see:
- `DOCKER_FRONTEND_GUIDE.md` - Frontend-specific guide
- `docs/DOCKER_DEPLOYMENT.md` - Original deployment documentation

