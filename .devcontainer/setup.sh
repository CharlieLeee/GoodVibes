#!/bin/bash
set -e

echo "Setting up development environment..."

# Install backend dependencies
echo "Installing backend dependencies..."
pip install -r backend/requirements.txt

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend && npm install
cd ..

# Create .env files
echo "Creating environment files..."

# Check for API keys configuration - only create if missing
if [ ! -f "config/api_keys.json" ]; then
  echo "API keys configuration not found. Using template..."
  if [ ! -d "config" ]; then
    mkdir -p config
  fi
  if [ -f "config/api_keys.template.json" ]; then
    cp config/api_keys.template.json config/api_keys.json
    echo "Created config/api_keys.json from template"
  else
    echo "Error: config/api_keys.template.json not found. Creating basic template..."
    cat > config/api_keys.template.json << EOL
{
  "TOGETHER_API_KEY": "your_together_api_key_here",
  "OTHER_API_KEYS": {
    "comment": "Add any other API keys here as needed"
  }
}
EOL
    cp config/api_keys.template.json config/api_keys.json
    echo "Created basic api_keys.json template"
  fi
fi

# Backend .env
if [ ! -f "backend/.env" ]; then
  echo "Creating backend/.env file..."
  cat > backend/.env << EOL
# Database configuration
MONGO_URL=mongodb://mongodb:27017/goodvibes
DB_NAME=goodvibes

# Application settings
DEBUG=False
LOG_LEVEL=INFO
EOL

  # Append API key from configuration if available
  if [ -f "config/api_keys.json" ]; then
    TOGETHER_API_KEY=$(python -c "import json; print(json.load(open('config/api_keys.json')).get('TOGETHER_API_KEY', 'your_together_api_key_here'))")
    echo "# API Keys" >> backend/.env
    echo "TOGETHER_API_KEY=$TOGETHER_API_KEY" >> backend/.env
  fi
fi

# Frontend .env
if [ ! -f "frontend/.env" ]; then
  echo "Creating frontend/.env file..."
  cat > frontend/.env << EOL
# Frontend environment variables
REACT_APP_BACKEND_URL=http://localhost:8000
EOL
fi

# Make the API key configuration script executable
chmod +x config/load_api_keys.py

# Validate the API keys configuration
if python config/load_api_keys.py; then
  echo "✅ API key configured correctly"
else
  echo "⚠️  API key not configured or invalid"
  echo "Please ensure you have set a valid API key in config/api_keys.json"
fi

echo "Setup completed successfully!"
