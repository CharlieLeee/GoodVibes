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

# 🛠️ GoodVibes - Local Development Setup

This guide provides instructions for setting up and running the GoodVibes application locally for development purposes.

## Prerequisites

Before you begin, ensure you have the following installed:
- Python 3.8 or higher
- Node.js 14 or higher
- npm (Node Package Manager)
- pip (Python Package Manager)

## Backend Setup

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

## Frontend Setup

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

## Environment Variables

The application uses environment variables for configuration. Create a `.env` file in both the backend and frontend directories with the following variables:

### Backend (.env)
```
DATABASE_URL=sqlite:///./tasks.db
```

### Frontend (.env)
```
REACT_APP_BACKEND_URL=http://localhost:8000
```

## Accessing the Application

Once both servers are running, you can access the GoodVibes application by navigating to `http://localhost:3000` in your web browser.

## API Documentation

The backend API documentation is available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Development Guidelines

1. Follow the existing code style and conventions
2. Write clear commit messages
3. Add appropriate comments for complex logic
4. Update documentation when making significant changes

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

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
