#!/bin/bash

# Check if an argument was provided
if [ $# -eq 0 ]; then
  echo "Error: Please provide your Together API key as an argument."
  echo "Usage: ./set_api_key.sh YOUR_API_KEY"
  exit 1
fi

API_KEY=$1

# Ensure config directory exists
if [ ! -d "config" ]; then
  mkdir -p config
fi

# Update api_keys.json
if [ -f "config/api_keys.json" ]; then
  # Use temporary file for sed operation since in-place editing is not portable
  tmp_file=$(mktemp)
  
  # Use jq if available for proper JSON manipulation
  if command -v jq > /dev/null; then
    jq --arg key "$API_KEY" '.TOGETHER_API_KEY = $key' config/api_keys.json > "$tmp_file"
    mv "$tmp_file" config/api_keys.json
  else
    # Fallback to sed if jq is not available (less reliable for JSON)
    sed "s/\"TOGETHER_API_KEY\": \"[^\"]*\"/\"TOGETHER_API_KEY\": \"$API_KEY\"/" config/api_keys.json > "$tmp_file"
    mv "$tmp_file" config/api_keys.json
  fi
  
  echo "✅ Updated TOGETHER_API_KEY in config/api_keys.json"
else
  # Create new api_keys.json file
  cat > config/api_keys.json << EOL
{
  "TOGETHER_API_KEY": "$API_KEY",
  "OTHER_API_KEYS": {
    "comment": "Add any other API keys here as needed"
  }
}
EOL
  echo "✅ Created config/api_keys.json with your TOGETHER_API_KEY"
fi

# Update backend/.env file
if [ -f "backend/.env" ]; then
  # Check if the TOGETHER_API_KEY line exists
  if grep -q "TOGETHER_API_KEY=" backend/.env; then
    # Replace existing line
    sed -i "s/TOGETHER_API_KEY=.*/TOGETHER_API_KEY=$API_KEY/" backend/.env
  else
    # Add new line
    echo "# API Keys" >> backend/.env
    echo "TOGETHER_API_KEY=$API_KEY" >> backend/.env
  fi
  echo "✅ Updated TOGETHER_API_KEY in backend/.env"
else
  echo "Warning: backend/.env not found. Run the setup script first."
fi

# Validate the configuration
if [ -f "config/load_api_keys.py" ]; then
  echo "Validating configuration..."
  python config/load_api_keys.py
fi

echo "✅ API key has been set successfully!"
echo "You can now start the application." 