#!/bin/bash

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to kill process on port 3000
kill_port_3000() {
    echo "Checking for processes on port 3000..."
    pid=$(netstat -tulpn 2>/dev/null | grep ":3000" | awk '{print $7}' | cut -d'/' -f1)
    if [ ! -z "$pid" ]; then
        echo "Killing process $pid on port 3000"
        kill $pid 2>/dev/null || kill -9 $pid 2>/dev/null
        sleep 2
    fi
}

kill_port_8001() {
    echo "Checking for processes on port 8001..."
    pid=$(netstat -tulpn 2>/dev/null | grep ":8001" | awk '{print $7}' | cut -d'/' -f1)
    if [ ! -z "$pid" ]; then
        echo "Killing process $pid on port 8001"
        kill $pid 2>/dev/null || kill -9 $pid 2>/dev/null
        sleep 2
    fi
}

# Function to display logs
show_logs() {
    local service=$1
    echo "=== Last 10 lines of $service logs ($(date '+%Y-%m-%d %H:%M:%S')) ==="
    echo "--- stdout ---"
    tail -n 10 "/var/log/supervisor/$service.out.log" | while read line; do
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] $line"
    done
    echo "--- stderr ---"
    tail -n 10 "/var/log/supervisor/$service.err.log" | while read line; do
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] $line"
    done
    echo "=======================================\n"
}
echo "Starting dependency installation and service update..."

# Stop only backend and frontend services
echo "Stopping development services..."
if command_exists supervisorctl; then
    supervisorctl stop backend
    supervisorctl stop frontend
    # Wait a moment for processes to stop
    sleep 2
else
    echo "Error: Supervisor is not installed"
    exit 1
fi

# Kill any process running on port 3000
kill_port_3000
kill_port_8001

# Check and install backend dependencies
echo "Installing backend dependencies..."
cd /app/backend
if command_exists poetry; then
    poetry lock
    poetry install --no-root
else
    echo "Error: Poetry is not installed"
    exit 1
fi

# Check and install frontend dependencies
echo "Installing frontend dependencies..."
cd /app/frontend
if command_exists yarn; then
    yarn install
else
    echo "Error: Yarn is not installed"
    exit 1
fi

# Start only backend and frontend services
echo "Starting development services..."
if command_exists supervisorctl; then
    supervisorctl start backend
    supervisorctl start frontend
else
    echo "Error: Supervisor is not installed"
    exit 1
fi

# Wait for services to start up
echo "Waiting for services to start up..."
sleep 5

# Show logs for both services
show_logs "backend"
show_logs "frontend"

echo "Update and restart completed!"
