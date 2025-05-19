# Dev Container for Python FastAPI + Node.js/React

This development container provides a consistent environment for developing both the Python (FastAPI) backend and Node.js/React frontend of this application.

## Features

- Python 3.11 with pip, pylint, and common Python development tools
- Node.js 18.x with npm
- TypeScript support
- Pre-configured extensions for Python and JavaScript/TypeScript development
- Automatic port forwarding for both frontend (3000) and backend (8000)

## Usage

### Prerequisites

- VS Code with the Dev Containers extension installed
- Docker Desktop (or equivalent Docker engine)

### Getting Started

1. Clone the repository
2. Open the project folder in VS Code
3. When prompted, click "Reopen in Container"
   - Alternatively, run the "Dev Containers: Reopen in Container" command from the Command Palette (F1)
4. Wait for the container to build and initialize

Once the container is ready, VS Code will be connected to it and you'll have a fully configured development environment.

### Starting the Applications

#### Backend (FastAPI)

From the terminal in VS Code:

```bash
cd backend
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at http://localhost:8000

#### Frontend (React)

From another terminal in VS Code:

```bash
cd frontend
npm start
```

The React application will be available at http://localhost:3000

## Customization

You can customize this dev container by:

- Modifying `.devcontainer/Dockerfile` to add additional system dependencies
- Editing `.devcontainer/devcontainer.json` to change VS Code settings or add extensions
- Adjusting the `postCreateCommand` in `devcontainer.json` to install additional dependencies
