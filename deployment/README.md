# Deployment

This directory contains the production deployment files for the GoodVibes application.

## Contents

- `Dockerfile` - Multi-stage Docker build for production deployment
- `nginx.conf` - Nginx configuration for serving the frontend and proxying API requests
- `entrypoint.sh` - Container entrypoint script that starts both the backend and frontend

## Production Deployment

### Building the Docker Image

```bash
docker build -t goodvibes:latest -f deployment/Dockerfile .
```

### Running the Container

```bash
docker run -p 8080:8080 -e "ENV_VAR1=value1" -e "ENV_VAR2=value2" goodvibes:latest
```

### Environment Variables

For production deployment, you'll need to pass environment variables related to:
- Database connection
- API keys
- Other configuration parameters

Example:
```bash
docker run -p 8080:8080 \
  -e "DATABASE_URL=postgresql://user:password@host:port/dbname" \
  -e "SECRET_KEY=your_secret_key" \
  goodvibes:latest
```

## Deployment Architecture

The production deployment uses:
1. Nginx as the web server and reverse proxy
2. Python FastAPI backend running on Uvicorn
3. React frontend served as static files

The Nginx server listens on port 8080 and routes:
- API requests to the backend running on localhost:8000
- All other requests to the static frontend files 