#!/bin/sh

# Start the backend server in the background
cd /backend
python3 -m uvicorn server:app --host 0.0.0.0 --port 8000 &

# Wait for the backend to be ready
echo "Waiting for backend to start..."
sleep 5

# Start nginx in the foreground to keep the container running
echo "Starting nginx..."
nginx -g "daemon off;" 