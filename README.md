# ✨ GoodVibes - AI-Powered Task Management ✨

GoodVibes is an intelligent task management application that combines the power of AI with beautiful, intuitive design to transform how you stay organized and productive. Say goodbye to overwhelming to-do lists and hello to a smarter way to manage your life! 🚀

## 🌟 Amazing Features

- 🧠 **AI-Powered Task Analysis** - Simply describe your task in plain English, and our smart AI instantly breaks it down into manageable subtasks with perfectly timed deadlines and priorities
- 💬 **Interactive Chat Assistant** - Get personalized help, create tasks, or receive productivity advice through our friendly AI chat interface with beautiful Markdown support
- 🎯 **Smart Prioritization** - Never wonder what to work on next! Our AI automatically suggests priority levels based on task content, deadlines, and your personal patterns
- 💪 **Motivational Support** - Stay energized with encouraging messages tailored specifically to your tasks and deadlines
- 📊 **Multiple Dynamic Views** - Visualize your work your way with Tasks, Calendar, Timeline, and Statistics views that adapt to your workflow
- 🎤 **Voice Commands** - Hands full? No problem! Speak your tasks and messages for effortless productivity on the go
- 🧩 **Intelligent Task Breakdown** - Complex projects become simple with automated subtask creation that ensures nothing falls through the cracks

GoodVibes doesn't just track your tasks—it becomes your productivity partner! Through intelligent breakdown, personalized encouragement, and adaptive insights, GoodVibes helps you complete tasks faster while reducing stress and increasing satisfaction. ✅ It's not just task management—it's your personal productivity revolution! 🌈

## Project Structure

- `frontend/` - React application with TypeScript
- `backend/` - Python FastAPI application
- `.devcontainer/` - Development container configuration
- `config/` - Configuration files including API keys

## Configuration

Before starting the development environment or deploying the application, you need to set up your API keys. This configuration is required for both development and production environments.

### API Keys

GoodVibes requires a Together AI API key to function properly. This key is used for all AI features including task analysis, chat assistance, and motivation generation.

#### Setting Up Your API Key

1. Sign up for an account at [Together AI](https://www.together.ai/)
2. Generate an API key from your dashboard
3. Create the `config/api_keys.json` file in your project root:

```json
{
  "TOGETHER_API_KEY": "your_actual_api_key_here",
  "OTHER_API_KEYS": {
    "comment": "Add any other API keys here as needed"
  }
}
```

> **Important:** Make sure to create this file and add your API key **before** starting the dev container or deploying the application.

#### Validating Your Configuration

You can manually validate your API key by running:

```bash
python config/load_api_keys.py
```

## Development Setup

### Option 1: Using Dev Containers (Recommended)

This project uses VS Code Dev Containers to provide a consistent development environment. The container includes:

- Python 3.11 with FastAPI dependencies
- Node.js 18.x with React development tools
- TypeScript support
- MongoDB database
- Pre-configured VS Code extensions and settings
- Automatic environment setup

#### Requirements

- Visual Studio Code
- Docker Desktop (or equivalent Docker engine)
- VS Code Remote - Containers extension

#### Getting Started

1. Clone this repository
2. Open the project folder in VS Code
3. When prompted, click "Reopen in Container"
4. Wait for the container to build and initialize (this may take a few minutes the first time)

The container will automatically:

- Set up MongoDB
- Install all backend and frontend dependencies
- Create necessary environment files
- Configure the network to allow communication between services
- Validate your API key configuration

Alternatively, you can run the "Dev Containers: Reopen in Container" command from the VS Code Command Palette (F1).

For more detailed information about the development container setup, see the [Dev Container README](.devcontainer/README.md).

### Option 2: Manual Setup

#### Prerequisites

Before you begin, ensure you have the following installed:

- Python 3.8 or higher
- Node.js 14 or higher
- npm (Node Package Manager)
- pip (Python Package Manager)

#### Backend Setup

1. Navigate to the backend directory:

```bash
cd backend
```

2. Create a virtual environment:

```bash
python -m venv venv
```

3. Activate the virtual environment:

- On Windows:

```bash
.\venv\Scripts\activate
```

- On macOS/Linux:

```bash
source venv/bin/activate
```

4. Install required Python packages:

```bash
pip install -r requirements.txt
```

5. Start the backend server:

```bash
uvicorn server:app --reload
```

The backend server will start running at `http://localhost:8000`.

#### Frontend Setup

1. Open a new terminal and navigate to the frontend directory:

```bash
cd frontend
```

2. Install required npm packages:

```bash
npm install
```

3. Start the frontend development server:

```bash
npm start
```

The frontend development server will start running at `http://localhost:3000`.

## Running the Application

### Backend

```bash
cd backend
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at http://localhost:8000

### Frontend

```bash
cd frontend
npm start
```

The React application will be available at http://localhost:3000

## Environment Variables

The application uses environment variables for configuration, which are automatically populated from the centralized configuration in `config/api_keys.json`.

### Environment Files

The setup scripts automatically copy values from the centralized configuration to the appropriate environment files:

- `backend/.env` - For backend environment variables
- `frontend/.env` - For frontend environment variables

### MongoDB Configuration

The backend requires MongoDB. In the development container, MongoDB is automatically set up with these default values:

```
MONGO_URL=mongodb://mongodb:27017/goodvibes
DB_NAME=goodvibes
```

For manual setup, you'll need to configure MongoDB:

1. Install MongoDB locally
2. Use MongoDB Atlas (cloud service)
3. Use Docker to run MongoDB with: `docker run -d -p 27017:27017 --name mongodb mongo:latest`

Then update your `backend/.env` file with the appropriate connection details.

### Additional Environment Variables

Additional environment variables can be set in the appropriate `.env` files:

```
# backend/.env
DEBUG=False
LOG_LEVEL=INFO
```

```
# frontend/.env
REACT_APP_BACKEND_URL=http://localhost:8000
```

## API Documentation

The backend API documentation is available at:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Testing

### Backend Tests

```bash
cd backend
pytest
```

### Frontend Tests

```bash
cd frontend
npm test
```

## Deployment

Production deployment files are located in the `deployment` directory.

Before deployment, ensure you have set up the API keys as described in the [Configuration](#configuration) section.

See [Deployment README](deployment/README.md) for detailed instructions on how to build and deploy the application using Docker.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
