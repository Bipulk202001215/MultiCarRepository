#!/bin/bash

# Script to build and run the frontend Docker container

set -e  # Exit on error

CONTAINER_NAME="frontend-local"
IMAGE_NAME="multi-car-repair-frontend:local"
NETWORK_NAME="app-network"
HOST_PORT="3001"
CONTAINER_PORT="80"
API_BASE_URL="${VITE_API_BASE_URL:-http://139.84.210.248:8080/api}"

echo "🚀 Building and running frontend container..."
echo ""

# Stop and remove existing container if it exists
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "🛑 Stopping existing container: ${CONTAINER_NAME}"
    docker stop ${CONTAINER_NAME} >/dev/null 2>&1 || true
    echo "🗑️  Removing existing container: ${CONTAINER_NAME}"
    docker rm ${CONTAINER_NAME} >/dev/null 2>&1 || true
    echo ""
fi

# Build the Docker image
echo "🔨 Building Docker image: ${IMAGE_NAME}"
docker build --target production -t ${IMAGE_NAME} . || {
    echo "❌ Build failed!"
    exit 1
}
echo "✅ Build completed"
echo ""

# Check if network exists, create if not
if ! docker network ls --format '{{.Name}}' | grep -q "^${NETWORK_NAME}$"; then
    echo "🌐 Creating Docker network: ${NETWORK_NAME}"
    docker network create ${NETWORK_NAME} >/dev/null 2>&1 || true
    echo ""
fi

# Run the container
echo "🚀 Starting container: ${CONTAINER_NAME}"
echo "   Port: ${HOST_PORT}:${CONTAINER_PORT}"
echo "   Network: ${NETWORK_NAME}"
echo "   API Base URL: ${API_BASE_URL}"
echo ""

docker run -d \
  --name ${CONTAINER_NAME} \
  --network ${NETWORK_NAME} \
  -p ${HOST_PORT}:${CONTAINER_PORT} \
  -e VITE_API_BASE_URL=${API_BASE_URL} \
  ${IMAGE_NAME}

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Container started successfully!"
    echo ""
    echo "📋 Container info:"
    docker ps --filter "name=${CONTAINER_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    echo "🌐 Frontend available at: http://localhost:${HOST_PORT}"
    echo "📝 View logs: docker logs -f ${CONTAINER_NAME}"
    echo "🛑 Stop container: docker stop ${CONTAINER_NAME}"
    echo ""
    echo "💡 Tip: Clear browser cache (Cmd+Shift+R) to load the latest version"
else
    echo "❌ Failed to start container!"
    exit 1
fi



