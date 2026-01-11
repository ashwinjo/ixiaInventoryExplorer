# ADK Agent URL Configuration

The AI agent (ADK) URL is now configurable at runtime via environment variables.

## Configuration

### Backend (FastAPI)

The backend proxies `/adk/*` requests to the ADK agent server.

**Environment Variable:** `ADK_URL`

**Default:** `http://localhost:8000`

**Examples:**

```bash
# Local development (ADK on host machine)
ADK_URL=http://localhost:8000

# Docker on Mac/Windows (ADK on host machine)
ADK_URL=http://host.docker.internal:8000

# Docker on Linux (ADK on host machine - replace with your host IP)
ADK_URL=http://172.17.0.1:8000

# ADK in another Docker container (same network)
ADK_URL=http://adk-agent:8000

# Remote ADK server
ADK_URL=http://adk-server.example.com:8000
```

### Frontend (React/Vite)

The frontend displays the ADK URL in error messages (optional).

**Environment Variable:** `VITE_ADK_URL`

**Default:** `http://localhost:8000`

**Note:** This is only for display purposes. The frontend always uses `/adk` which is proxied by Vite to the backend.

## Docker Setup

### Using Docker Compose

```bash
# Default (ADK on host machine, Mac/Windows)
docker-compose -f docker-compose.dev.yml up -d

# Custom ADK URL
ADK_URL=http://adk-server:8000 docker-compose -f docker-compose.dev.yml up -d

# Linux (use host IP)
ADK_URL=http://172.17.0.1:8000 docker-compose -f docker-compose.dev.yml up -d
```

### Standalone Containers

```bash
# Create network
docker network create ixia-network

# Run backend with ADK URL
docker run -d \
  --name ixia-backend \
  --network ixia-network \
  -p 3001:3001 \
  -e PORT=3001 \
  -e ADK_URL=http://host.docker.internal:8000 \
  -v $(pwd)/data:/app/data \
  ixia-backend:latest

# Run frontend
docker run -d \
  --name ixia-frontend \
  --network ixia-network \
  -p 5174:5174 \
  -e PORT=5174 \
  -e VITE_BACKEND_URL=http://ixia-backend:3001 \
  ixia-frontend:latest
```

## Finding Host IP (Linux)

If ADK is running on the host machine and backend is in Docker on Linux:

```bash
# Method 1: Use docker0 interface IP
ip addr show docker0 | grep "inet " | awk '{print $2}' | cut -d/ -f1

# Method 2: Use host.docker.internal (if available)
# Some Docker versions support this on Linux too

# Method 3: Use host network mode (not recommended)
docker run --network host ...
```

## Troubleshooting

### Backend can't reach ADK

1. **Check ADK is running:**
   ```bash
   curl http://localhost:8000/list-apps
   ```

2. **Verify ADK_URL is correct:**
   ```bash
   docker exec ixia-backend env | grep ADK_URL
   ```

3. **Test connectivity from container:**
   ```bash
   # Mac/Windows
   docker exec ixia-backend curl http://host.docker.internal:8000/list-apps
   
   # Linux (replace with your host IP)
   docker exec ixia-backend curl http://172.17.0.1:8000/list-apps
   ```

4. **Check backend logs:**
   ```bash
   docker logs ixia-backend | grep -i adk
   ```

### Frontend shows "ADK server not available"

This is expected if:
- ADK server is not running
- ADK_URL is incorrect
- Network connectivity issues

The frontend will gracefully disable ADK features and show an offline indicator.

## Architecture

```
Frontend (React)
    ↓ /adk/*
Vite Proxy
    ↓ /adk/*
Backend (FastAPI)
    ↓ ADK_URL (env var)
ADK Agent Server (port 8000)
```

The frontend always uses `/adk` which is:
1. Proxied by Vite to the backend
2. Proxied by FastAPI to the ADK server (using `ADK_URL`)

This allows the ADK server to be anywhere (host machine, Docker container, remote server) without frontend changes.

