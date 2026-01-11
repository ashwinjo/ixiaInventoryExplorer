#!/bin/bash

# =============================================================================
# Docker Rebuild Script - Ixia Inventory Explorer
# =============================================================================
# This script:
#   1. Stops and removes existing containers
#   2. Rebuilds Docker images (picks up code changes)
#   3. Starts containers fresh
# =============================================================================
# Usage:
#   ./docker-rebuild.sh
#   ./docker-rebuild.sh --no-cache  # Force rebuild without cache
# =============================================================================

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "============================================="
echo "Ixia Inventory Explorer - Docker Rebuild"
echo "============================================="

# Check if --no-cache flag is provided
NO_CACHE_FLAG=""
if [[ "$1" == "--no-cache" ]]; then
    NO_CACHE_FLAG="--no-cache"
    echo -e "${YELLOW}Using --no-cache flag (full rebuild)${NC}"
fi

# Step 1: Stop and remove existing containers
echo ""
echo -e "${GREEN}[1/3] Cleaning up existing containers...${NC}"
docker-compose -f docker-compose.separate.yml down -v 2>/dev/null || true
docker-compose -f docker-compose.combined.yml down -v 2>/dev/null || true
echo "✓ Containers stopped and removed"

# Step 2: Rebuild images
echo ""
echo -e "${GREEN}[2/3] Rebuilding Docker images...${NC}"
if [[ -n "$NO_CACHE_FLAG" ]]; then
    docker-compose -f docker-compose.separate.yml build $NO_CACHE_FLAG
else
    docker-compose -f docker-compose.separate.yml build --build-arg BUILDKIT_INLINE_CACHE=1
fi
echo "✓ Images rebuilt"

# Step 3: Start containers
echo ""
echo -e "${GREEN}[3/3] Starting containers...${NC}"
docker-compose -f docker-compose.separate.yml up -d
echo "✓ Containers started"

# Wait a moment for containers to initialize
echo ""
echo "Waiting for services to be ready..."
sleep 5

# Check container status
echo ""
echo "============================================="
echo "Container Status:"
echo "============================================="
docker-compose -f docker-compose.separate.yml ps

echo ""
echo -e "${GREEN}✓ Rebuild complete!${NC}"
echo ""
echo "Access points:"
echo "  Frontend: http://localhost:5174"
echo "  Backend:  http://localhost:3001"
echo "  API Docs: http://localhost:3001/docs"
echo ""
echo "View logs:"
echo "  docker-compose -f docker-compose.separate.yml logs -f"
echo ""

