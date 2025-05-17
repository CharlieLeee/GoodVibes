"""
Load configuration from the centralized config directory.
This script bridges the gap between the centralized configuration and backend environment.
"""

import os
import sys
import json
from pathlib import Path


def load_api_keys():
    """
    Load API keys from the centralized config/api_keys.json file
    and make them available as environment variables.
    """
    # Find the root directory (parent of the backend directory)
    backend_dir = Path(__file__).parent
    root_dir = backend_dir.parent
    config_dir = root_dir / "config"

    # Path to the API keys file
    api_keys_file = config_dir / "api_keys.json"

    # Check if the file exists
    if not api_keys_file.exists():
        print(f"Warning: API keys file not found at {api_keys_file}")
        return False

    try:
        # Load the API keys
        with open(api_keys_file, 'r') as f:
            api_keys = json.load(f)

        # Set environment variables for string values
        for key, value in api_keys.items():
            if isinstance(value, str):
                # Don't override existing environment variables
                if key not in os.environ:
                    os.environ[key] = value

        return True
    except Exception as e:
        print(f"Error loading API keys: {str(e)}")
        return False


# If run directly, load the API keys and report status
if __name__ == "__main__":
    success = load_api_keys()
    if success:
        print("API keys loaded successfully")
    else:
        print("Failed to load API keys")
        sys.exit(1)
