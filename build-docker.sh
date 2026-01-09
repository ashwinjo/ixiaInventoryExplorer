#!/bin/bash

set -e

echo "Building Ixia Inventory Explorer Docker Image..."

# Check if buildx exists
if ! docker buildx version &> /dev/null; then
    echo "Docker Buildx not found. Creating builder..."
    docker buildx create --name multiplatform --use
fi

# Build for multiple platforms
echo "Building for linux/amd64 and linux/arm64..."
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t ixia-inventory-explorer:latest \
  --load \
  .

echo "Build complete!"
echo "To run: docker-compose up -d"

