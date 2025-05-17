# Here are your Instructions

# AI Task Assistant - Local Development Setup

This guide provides instructions for setting up and running the AI Task Assistant application locally for development purposes.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

* **Node.js**: [Download Node.js](https://nodejs.org/) (LTS version recommended)
* **Yarn**: After installing Node.js, you can install Yarn by running `npm install --global yarn`
* **Python**: [Download Python](https://www.python.org/downloads/) (Version 3.9 or higher recommended)
* **Poetry**: [Install Poetry](https://python-poetry.org/docs/#installation) (Python dependency management)
* **MongoDB**: [Install MongoDB Community Edition](https://www.mongodb.com/try/download/community) (Ensure the MongoDB server is running)

## Backend Setup

1. **Navigate to the backend directory:**

   ```bash
   cd backend
   ```

2. **Create a `.env` file:**
   This file will store your environment variables. Create a file named `.env` in the `backend` directory and add the following content, replacing placeholder values with your actual credentials where necessary:

   ```env
   MONGO_URL="mongodb://localhost:27017"
   DB_NAME="task_assistant"
   TOGETHER_API_KEY="your_together_ai_api_key"
   # OPENAI_API_KEY="your_openai_api_key" # Optional, if you switch LLM providers
   ```

   * `MONGO_URL`: The connection string for your MongoDB instance.
   * `DB_NAME`: The name of the database to be used (e.g., `task_assistant`).
   * `TOGETHER_API_KEY`: Your API key from Together.ai for LLM access.

3. **Install Python dependencies using Poetry:**
   If you have an existing `poetry.lock` file, you can run:

   ```bash
   poetry install
   ```

   If you are setting up for the first time or need to resolve dependencies from `pyproject.toml`:

   ```bash
   poetry lock
   poetry install
   ```

4. **Run the backend server:**

   ```bash
   poetry run uvicorn server:app --host 0.0.0.0 --port 8001 --reload
   ```

   The backend server will typically be available at `http://localhost:8001`. The `--reload` flag enables auto-reloading when code changes are detected.

## Frontend Setup

1. **Navigate to the frontend directory:**

   ```bash
   cd frontend
   ```

2. **Create a `.env.local` file:**
   This file will store your frontend environment variables. Create a file named `.env.local` in the `frontend` directory and add the following content:

   ```env
   REACT_APP_BACKEND_URL=http://localhost:8001
   ```

   This tells the React application where the backend API is running.

3. **Install JavaScript dependencies using Yarn:**

   ```bash
   yarn install
   ```

4. **Start the frontend development server:**

   ```bash
   yarn start
   ```

   The frontend development server will typically open automatically in your browser at `http://localhost:3000`.

## Running the Application

1. **Ensure MongoDB is running.**
2. **Start the backend server** (as described in Backend Setup step 4).
3. **Start the frontend server** (as described in Frontend Setup step 4).

Once both servers are running, you can access the AI Task Assistant application by navigating to `http://localhost:3000` in your web browser.

## Troubleshooting

* **Port Conflicts**: If port `8001` or `3000` are in use, you can change them:
  * For the backend, modify the `uvicorn` command: `poetry run uvicorn server:app --port <new_backend_port> --reload` and update `REACT_APP_BACKEND_URL` in `frontend/.env.local` accordingly.
  * For the frontend, you might be prompted to use a different port if `3000` is busy, or you can configure it in `frontend/package.json` scripts if needed.
* **MongoDB Connection Issues**: Verify that your MongoDB server is running and accessible at the `MONGO_URL` specified in `backend/.env`.
* **API Key Issues**: Ensure your `TOGETHER_API_KEY` (or other LLM provider keys) in `backend/.env` is correct and has the necessary permissions.
