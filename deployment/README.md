# Deployment

This directory contains the production deployment files for the GoodVibes application.

## Contents

- `Dockerfile` - Multi-stage Docker build for production deployment
- `nginx.conf` - Nginx configuration for serving the frontend and proxying API requests
- `entrypoint.sh` - Container entrypoint script that starts both the backend and frontend

## Production Deployment

### Prerequisites

Before deploying, ensure you have:

1. Set up your API keys in the `config/api_keys.json` file in the project root
2. Validated the API keys by running `python config/load_api_keys.py`

This centralized configuration will be automatically used by the deployment scripts.

### Building the Docker Image

```bash
docker build -t goodvibes:latest -f deployment/Dockerfile .
```

### Running the Container

```bash
docker run -p 8080:8080 -e "ENV_VAR1=value1" -e "ENV_VAR2=value2" goodvibes:latest
```

### Environment Variables

For production deployment, you'll need to configure:

#### Required Configuration

- API keys: Already handled through the centralized `config/api_keys.json` configuration

#### Other Configuration (Optional)

You can override these with environment variables if needed:

- Database connection
- Application settings
- Other configuration parameters

Example:

```bash
docker run -p 8080:8080 \
  -e "DATABASE_URL=postgresql://user:password@host:port/dbname" \
  -e "SECRET_KEY=your_secret_key" \
  goodvibes:latest
```

### Using the Deployment Script

The easiest way to deploy is using the provided script:

```bash
bash deployment/deploy.sh
```

This script will:

1. Validate that API keys are properly configured
2. Build and run Docker containers for both backend and frontend
3. Configure the containers with appropriate environment variables

### Production-specific Configuration

If you need different API keys for production, you can:

1. Update the `config/api_keys.json` file before deployment
2. OR provide override environment variables during container launch

## Deployment Architecture

The production deployment uses:

1. Nginx as the web server and reverse proxy
2. Python FastAPI backend running on Uvicorn
3. React frontend served as static files

The Nginx server listens on port 8080 and routes:

- API requests to the backend running on localhost:8000
- All other requests to the static frontend files
