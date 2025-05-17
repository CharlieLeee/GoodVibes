#!/bin/bash
set -e

# Script to deploy the application using the centralized configuration

echo "Deploying GoodVibes application..."

# Ensure we're in the project root
PROJECT_ROOT=$(dirname "$(dirname "$(readlink -f "$0")")")
cd "$PROJECT_ROOT"

# Check for the API keys configuration
if [ ! -f "config/api_keys.json" ]; then
  echo "Error: config/api_keys.json not found"
  echo "Please create and configure the API keys file before deployment"
  echo "See the Configuration section in the README.md for instructions"
  exit 1
fi

# Validate the API keys
echo "Validating API keys configuration..."
python3 config/load_api_keys.py
if [ $? -ne 0 ]; then
  echo "Error: API keys validation failed"
  exit 1
fi

# Load API keys for environment variables
API_KEYS=$(python3 -c "import json; print(' '.join([f\"{k}={v}\" for k, v in json.load(open('config/api_keys.json')).items() if isinstance(v, str)]))")

# Deploy backend
echo "Deploying backend..."
cd backend
docker build -t goodvibes-backend .
docker run -d \
  --name goodvibes-backend \
  -p 8000:8000 \
  -e MONGO_URL=mongodb://mongodb:27017/goodvibes \
  -e DB_NAME=goodvibes \
  $API_KEYS \
  --link mongodb \
  goodvibes-backend

# Deploy frontend
echo "Deploying frontend..."
cd ../frontend
docker build -t goodvibes-frontend .
docker run -d \
  --name goodvibes-frontend \
  -p 3000:3000 \
  -e REACT_APP_BACKEND_URL=http://localhost:8000 \
  goodvibes-frontend

echo "Deployment completed successfully!"
echo "Frontend available at: http://localhost:3000"
echo "Backend API available at: http://localhost:8000" 