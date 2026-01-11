# Docker Frontend Setup Guide

This guide shows you how to run the React+Vite frontend using Docker.

## Option 1: Frontend + Backend Together (Recommended)

Use `docker-compose.dev.yml` to run both services together:

```bash
# Start both frontend and backend
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop both services
docker-compose -f docker-compose.dev.yml down
```

**Access Points:**
- Frontend: http://localhost:5174
- Backend API: http://localhost:3001
- API Docs: http://localhost:3001/docs

**Custom Ports:**
```bash
FRONTEND_PORT=3000 BACKEND_PORT=8080 docker-compose -f docker-compose.dev.yml up -d
```

---

## Option 2: Frontend Standalone (Backend Running Separately)

If your backend is already running (locally or in another container), run just the frontend:

### Backend on Localhost (Mac/Windows)

```bash
# Build frontend image
docker build -f Dockerfile.frontend -t ixia-frontend:latest .

# Run frontend (connects to backend on host machine)
docker run -d \
  --name ixia-frontend \
  -p 5174:5174 \
  -e PORT=5174 \
  -e VITE_BACKEND_URL=http://host.docker.internal:3001 \
  ixia-frontend:latest
```

### Backend in Another Docker Container

```bash
# Create a Docker network
docker network create ixia-network

# Run backend on the network
docker run -d \
  --name ixia-backend \
  --network ixia-network \
  -p 3001:3001 \
  -e PORT=3001 \
  -v $(pwd)/data:/app/data \
  ixia-inventory-explorer:latest

# Run frontend on the same network
docker run -d \
  --name ixia-frontend \
  --network ixia-network \
  -p 5174:5174 \
  -e PORT=5174 \
  -e VITE_BACKEND_URL=http://ixia-backend:3001 \
  ixia-frontend:latest
```

### Backend on Remote Server

```bash
docker run -d \
  --name ixia-frontend \
  -p 5174:5174 \
  -e PORT=5174 \
  -e VITE_BACKEND_URL=http://your-backend-server:3001 \
  ixia-frontend:latest
```

---

## Option 3: Production Mode (Single Container)

For production, use the combined Dockerfile that serves both frontend and backend:

```bash
# Build production image
docker build -t ixia-inventory-explorer:latest .

# Run production container
docker run -d \
  --name ixia-explorer \
  -p 8080:8080 \
  -e PORT=8080 \
  -v $(pwd)/data:/app/data \
  ixia-inventory-explorer:latest
```

**Access:** http://localhost:8080 (frontend + API in one container)

---

## Environment Variables

### Frontend Container

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5174` | Frontend dev server port |
| `VITE_BACKEND_URL` | `http://backend:3001` | Backend API URL (for proxy) |

### Backend Container

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Backend API port |
| `DATABASE_PATH` | `/app/data/inventory.db` | Database file path |
| `CORS_ORIGINS` | `*` | Allowed CORS origins |
| `MINIMAL_MODE` | `false` | Skip background pollers if `true` |

---

## Troubleshooting

### Frontend can't connect to backend

1. **Check backend is running:**
   ```bash
   curl http://localhost:3001/health
   ```

2. **Verify network connectivity:**
   - If using docker-compose: Services should be on the same network (`ixia-network`)
   - If standalone: Use `host.docker.internal` (Mac/Windows) or host IP (Linux)

3. **Check Vite proxy logs:**
   ```bash
   docker logs ixia-frontend
   ```

### Port already in use

Change the port:
```bash
# Frontend on different port
FRONTEND_PORT=3000 docker-compose -f docker-compose.dev.yml up -d

# Or standalone
docker run -d -p 3000:3000 -e PORT=3000 ixia-frontend:latest
```

### Hot reload not working

Hot reload works automatically in Docker! Changes to files in `src/` will trigger a reload. If it's not working:

1. Ensure volumes are mounted correctly
2. Check Vite is running in dev mode (not production build)
3. Check browser console for errors

---

## Quick Commands

```bash
# Build frontend image
docker build -f Dockerfile.frontend -t ixia-frontend:latest .

# View frontend logs
docker logs -f ixia-frontend

# Restart frontend
docker restart ixia-frontend

# Stop frontend
docker stop ixia-frontend

# Remove frontend container
docker rm ixia-frontend
```

