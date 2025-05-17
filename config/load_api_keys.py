#!/usr/bin/env python3
"""
Load API keys from the configuration file.
This script is used by both the development and deployment environments.
"""

import json
import os
import sys
from pathlib import Path


def load_api_keys():
    """Load API keys from the configuration file."""

    # Find the config directory (parent of this script)
    config_dir = Path(__file__).parent
    project_root = config_dir.parent

    # Check for api_keys.json, fall back to template if missing
    api_keys_file = config_dir / "api_keys.json"
    template_file = config_dir / "api_keys.template.json"

    if not api_keys_file.exists():
        if not template_file.exists():
            print(
                "Error: Neither api_keys.json nor api_keys.template.json found in config directory.")
            print(f"Expected locations:\n{api_keys_file}\n{template_file}")
            return False

        print(
            f"Warning: {api_keys_file} not found. Please create it based on {template_file}")
        print("You can copy the template file with: cp config/api_keys.template.json config/api_keys.json")
        print("Then edit config/api_keys.json to add your actual API keys")
        return False

    try:
        with open(api_keys_file, 'r') as f:
            api_keys = json.load(f)

        # Check for the Together API key
        if not api_keys.get("TOGETHER_API_KEY") or api_keys.get("TOGETHER_API_KEY") == "your_together_api_key_here":
            print("Warning: TOGETHER_API_KEY not set in config/api_keys.json")
            print("Please edit config/api_keys.json to add your actual Together API key")
            return False

        return api_keys
    except Exception as e:
        print(f"Error loading API keys: {str(e)}")
        return False


if __name__ == "__main__":
    """
    When run directly, this script will check for the API keys file and output the results.
    It can also be used to check if the API keys are correctly set up.
    """
    api_keys = load_api_keys()
    if api_keys:
        print("✅ API keys loaded successfully")
        if len(sys.argv) > 1 and sys.argv[1] == "--export":
            # Export the keys as environment variables for the shell
            for key, value in api_keys.items():
                if isinstance(value, str):  # Only export string values
                    print(f"export {key}={value}")
    else:
        # Exit with error code if validation fails
        sys.exit(1)
