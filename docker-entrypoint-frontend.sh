#!/bin/sh
set -e

PORT=${PORT:-5174}

echo "============================================="
echo "Ixia Inventory Explorer - Frontend"
echo "============================================="
echo "Port: $PORT"
echo "Backend URL: ${VITE_BACKEND_URL:-http://backend:3001}"
echo "============================================="

exec npx vite --config vite.config.docker.js --port "$PORT" --host 0.0.0.0

