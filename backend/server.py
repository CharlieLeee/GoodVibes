from fastapi import FastAPI, APIRouter, HTTPException, Body, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import requests
import json
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
import uuid
from datetime import datetime, timedelta
import time

# Root directory and environment loading
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# MongoDB connection
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# Together.ai API key
TOGETHER_API_KEY = os.environ.get("TOGETHER_API_KEY")
TOGETHER_API_URL = "https://api.together.xyz/v1/completions"

# Create the main app without a prefix
app = FastAPI(title="AI Task Assistant API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security setup for simple auth
security = HTTPBearer()

# Add after other global variables
FEEDBACK_CACHE = {}  # Store feedback with timestamps
CACHE_DURATION = 3600  # Cache duration in seconds (1 hour)

# Define Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Subtask(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    task_id: str
    title: str
    description: str
    completed: bool = False
    deadline: Optional[datetime] = None
    order: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Task(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    priority: str = "medium"  # low, medium, high
    completed: bool = False
    subtasks: List[Subtask] = []
    emotional_support: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    priority: str = "medium"


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    priority: Optional[str] = None
    completed: Optional[bool] = None


class SubtaskCreate(BaseModel):
    title: str
    description: str
    deadline: Optional[datetime] = None
    order: int = 0


class SubtaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    completed: Optional[bool] = None
    deadline: Optional[datetime] = None
    order: Optional[int] = None


class NaturalLanguageTaskInput(BaseModel):
    text: str
    user_id: str


class EmotionalSupportType(BaseModel):
    message: str
    task_id: str


# Statistics Models
class TaskStatistics(BaseModel):
    total_tasks: int
    completed_tasks: int
    completion_rate: float
    tasks_by_priority: Dict[str, int]
    tasks_by_status: Dict[str, int]
    recent_completions: List[Task]
    average_completion_time: Optional[float]  # in hours
    total_subtasks: int
    completed_subtasks: int
    subtask_completion_rate: float
    subtasks_by_priority: Dict[str, int]
    subtasks_by_status: Dict[str, int]
    average_subtasks_per_task: float


class AIFeedback(BaseModel):
    summary: str
    insights: List[str]
    suggestions: List[str]


# Together.ai integration functions
async def analyze_task_with_llm(text: str) -> Dict[str, Any]:
    """Use Together.ai to analyze a natural language task input and break it down"""

    # Get current date information for context
    current_date = datetime.utcnow()
    current_date_str = current_date.strftime("%Y-%m-%d")

    prompt = f"""
    You are an AI assistant that helps break down tasks into manageable subtasks and provides emotional support.
    
    CURRENT DATE: {current_date_str}
    
    USER INPUT: {text}
    
    Please analyze this task and provide:
    1. A clear task title
    2. A list of 3-5 subtasks to complete it, each with its own intermediate deadline
       - Each subtask MUST include a 'title', a 'description', and a 'deadline' field
    3. A suggested final deadline if applicable (as ISO date in YYYY-MM-DD format)
    4. A priority level (low, medium, high)
    5. A brief encouraging message to help the user stay motivated
    
    Important instructions about dates:
    - Today's date is {current_date_str}
    - If a specific date is mentioned (like "June 15th"), use that as the final deadline
    - If a day of week is mentioned (like "by Monday"), calculate the exact date based on today's date
    - If a relative time is mentioned (like "in 3 days"), calculate the date based on today
    - For subtask deadlines, distribute them evenly between {current_date_str} and the final deadline
    - Always return dates in ISO format (YYYY-MM-DD)
    - If no deadline is mentioned, set deadline to null
    
    Format your response as a JSON object with these keys: 
    "title", "subtasks" (array of objects with "title", "description", and "deadline"), "deadline", "priority", "emotional_support"
    
    Example format:
    {{
        "title": "Write quarterly report",
        "subtasks": [
            {{ "title": "Collect sales data", "description": "Gather all sales data from Q1", "deadline": "2025-04-01" }},
            {{ "title": "Analyze market trends", "description": "Review competitor performance", "deadline": "2025-04-05" }},
            {{ "title": "Create charts and graphs", "description": "Visualize key metrics", "deadline": "2025-04-10" }},
            {{ "title": "Write executive summary", "description": "Summarize findings", "deadline": "2025-04-12" }},
            {{ "title": "Proofread and finalize", "description": "Check for errors and finalize report", "deadline": "2025-04-14" }}
        ],
        "deadline": "2025-04-15",
        "priority": "high",
        "emotional_support": "You've got this! Breaking down this report makes it much more manageable."
    }}
    
    Respond with ONLY the JSON, no explanations or other text.
    """

    headers = {"Authorization": f"Bearer {TOGETHER_API_KEY}", "Content-Type": "application/json"}

    data = {
        "model": "deepseek-ai/DeepSeek-R1",
        "prompt": prompt,
        "max_tokens": 1024,
        "temperature": 0.7,
        "top_p": 0.9,
        "top_k": 40,
    }

    try:
        response = requests.post(TOGETHER_API_URL, headers=headers, json=data)
        response.raise_for_status()
        result = response.json()

        # Extract the generated text from the response
        generated_text = result["choices"][0]["text"].strip()

        # Parse the JSON from the generated text
        try:
            task_data = json.loads(generated_text)
            return task_data
        except json.JSONDecodeError:
            # If the model didn't return valid JSON, try to extract JSON portion
            try:
                # Look for JSON-like content between curly braces
                json_start = generated_text.find("{")
                json_end = generated_text.rfind("}") + 1
                if json_start >= 0 and json_end > json_start:
                    json_str = generated_text[json_start:json_end]
                    task_data = json.loads(json_str)
                    return task_data
            except:
                # If all parsing attempts fail, return a simple error response
                return {
                    "title": text,
                    "subtasks": ["Review task details"],
                    "deadline": None,
                    "priority": "medium",
                    "emotional_support": "Let's start by clarifying what needs to be done.",
                }

    except Exception as e:
        logging.error(f"Error calling Together.ai API: {str(e)}")
        # Fallback response
        return {
            "title": text,
            "subtasks": ["Review task details"],
            "deadline": None,
            "priority": "medium",
            "emotional_support": "Let's start by clarifying what needs to be done.",
        }


async def generate_emotional_support(task_title: str, deadline: Optional[datetime] = None) -> str:
    """Generate emotional support message based on task context"""

    # Create a context-aware prompt
    deadline_context = ""
    if deadline:
        days_until = (deadline - datetime.utcnow()).days
        if days_until < 0:
            deadline_context = "This task is past its deadline."
        elif days_until == 0:
            deadline_context = "This task is due today."
        elif days_until == 1:
            deadline_context = "This task is due tomorrow."
        else:
            deadline_context = f"This task is due in {days_until} days."

    prompt = f"""
    You are an AI assistant that provides encouraging, motivational messages to help users with their tasks.
    
    Task: {task_title}
    {deadline_context}
    
    Generate a brief, supportive message (1-2 sentences) that:
    - Acknowledges the task difficulty
    - Provides encouragement
    - Offers a positive perspective
    
    Your message should be warm, supportive and empathetic.
    Respond with ONLY the supportive message, no explanations or other text.
    """

    headers = {"Authorization": f"Bearer {TOGETHER_API_KEY}", "Content-Type": "application/json"}

    data = {
        "model": "anthropic/claude-2",
        "prompt": prompt,
        "max_tokens": 100,
        "temperature": 0.7,
        "top_p": 0.9,
        "top_k": 40,
    }

    try:
        response = requests.post(TOGETHER_API_URL, headers=headers, json=data)
        response.raise_for_status()
        result = response.json()

        # Extract the generated text
        support_message = result["choices"][0]["text"].strip()
        return support_message

    except Exception as e:
        logging.error(f"Error generating emotional support: {str(e)}")
        return "You're making great progress! Keep going, you've got this."


# User API routes
class UserCreate(BaseModel):
    username: str


@api_router.post("/users", response_model=User)
async def create_user(user_data: UserCreate):
    user = User(username=user_data.username)
    user_dict = user.dict()
    await db.users.insert_one(user_dict)
    return user


@api_router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user)


@api_router.get("/users/name/{username}", response_model=User)
async def get_user_by_name(username: str):
    """Get a user by username"""
    user = await db.users.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user)


# Task API routes
@api_router.post("/tasks", response_model=Task)
async def create_task(task_create: TaskCreate, user_id: str = Body(...)):
    # Verify user exists
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Create task
    task = Task(
        user_id=user_id,
        title=task_create.title,
        description=task_create.description,
        deadline=task_create.deadline,
        priority=task_create.priority,
    )

    # Generate emotional support
    task.emotional_support = await generate_emotional_support(task.title, task.deadline)

    # Insert task
    task_dict = task.dict()
    await db.tasks.insert_one(task_dict)
    return task


@api_router.get("/tasks/{task_id}", response_model=Task)
async def get_task(task_id: str):
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return Task(**task)


@api_router.get("/tasks/user/{user_id}", response_model=List[Task])
async def get_user_tasks(user_id: str):
    tasks = await db.tasks.find({"user_id": user_id}).to_list(1000)
    return [Task(**task) for task in tasks]


@api_router.put("/tasks/{task_id}", response_model=Task)
async def update_task(task_id: str, task_update: TaskUpdate):
    # Get existing task
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Update fields
    update_data = task_update.dict(exclude_unset=True)
    if update_data:
        update_data["updated_at"] = datetime.utcnow()

        # If task is marked as completed, update all subtasks
        if "completed" in update_data and update_data["completed"]:
            # Update all subtasks to completed
            for i, subtask in enumerate(task.get("subtasks", [])):
                task["subtasks"][i]["completed"] = True

        # Update task in DB
        await db.tasks.update_one({"id": task_id}, {"$set": update_data})

    # Get updated task
    updated_task = await db.tasks.find_one({"id": task_id})
    return Task(**updated_task)


@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str):
    # Check if task exists
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Delete task
    await db.tasks.delete_one({"id": task_id})
    return {"detail": "Task deleted successfully"}


# Subtask API routes
@api_router.post("/tasks/{task_id}/subtasks", response_model=Task)
async def create_subtask(task_id: str, subtask_create: SubtaskCreate):
    # Get task
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Create subtask
    subtask = Subtask(
        task_id=task_id,
        title=subtask_create.title,
        description=subtask_create.description,
        deadline=subtask_create.deadline,
        order=subtask_create.order or len(task.get("subtasks", [])),
    )

    # Add subtask to task
    subtask_dict = subtask.dict()
    await db.tasks.update_one(
        {"id": task_id}, {"$push": {"subtasks": subtask_dict}, "$set": {"updated_at": datetime.utcnow()}}
    )

    # Get updated task
    updated_task = await db.tasks.find_one({"id": task_id})
    return Task(**updated_task)


@api_router.put("/tasks/{task_id}/subtasks/{subtask_id}", response_model=Task)
async def update_subtask(task_id: str, subtask_id: str, subtask_update: SubtaskUpdate):
    # Get task
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Find subtask index
    subtask_index = None
    for i, subtask in enumerate(task.get("subtasks", [])):
        if subtask.get("id") == subtask_id:
            subtask_index = i
            break

    if subtask_index is None:
        raise HTTPException(status_code=404, detail="Subtask not found")

    # Update subtask fields
    update_data = subtask_update.dict(exclude_unset=True)
    if update_data:
        for key, value in update_data.items():
            task["subtasks"][subtask_index][key] = value

        # If all subtasks are completed, mark task as completed
        all_completed = all(subtask.get("completed", False) for subtask in task["subtasks"])

        # Update task in DB
        await db.tasks.update_one(
            {"id": task_id},
            {"$set": {"subtasks": task["subtasks"], "completed": all_completed, "updated_at": datetime.utcnow()}},
        )

    # Get updated task
    updated_task = await db.tasks.find_one({"id": task_id})
    return Task(**updated_task)


@api_router.delete("/tasks/{task_id}/subtasks/{subtask_id}", response_model=Task)
async def delete_subtask(task_id: str, subtask_id: str):
    # Get task
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Remove subtask
    await db.tasks.update_one(
        {"id": task_id}, {"$pull": {"subtasks": {"id": subtask_id}}, "$set": {"updated_at": datetime.utcnow()}}
    )

    # Get updated task
    updated_task = await db.tasks.find_one({"id": task_id})
    return Task(**updated_task)


# Natural language task processing
@api_router.post("/process-task", response_model=Task)
async def process_natural_language_task(input_data: NaturalLanguageTaskInput):
    # Verify user exists
    user = await db.users.find_one({"id": input_data.user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if Together.ai API key is available
    if not TOGETHER_API_KEY:
        # Create a simple task without AI processing
        task = Task(
            user_id=input_data.user_id,
            title=input_data.text,
            description=input_data.text,
            priority="medium"
        )
        task_dict = task.dict()
        await db.tasks.insert_one(task_dict)
        return task
    
    # Process task with Together.ai
    task_analysis = await analyze_task_with_llm(input_data.text)
    
    # Create deadline if provided
    deadline = None
    if task_analysis.get("deadline") and task_analysis["deadline"] != "not specified" and task_analysis["deadline"] != "null":
        try:
            # Try to parse the date - handle both full ISO and date-only formats
            date_str = task_analysis["deadline"]
            if 'T' in date_str:
                deadline = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
            else:
                # For YYYY-MM-DD format, add time (end of day)
                deadline = datetime.fromisoformat(f"{date_str}T23:59:59")
        except:
            # If deadline parsing fails, log the error
            logging.error(f"Failed to parse deadline: {task_analysis['deadline']}")
            # Don't set a default deadline - we'll let the user set it manually if needed
    
    # Create task
    task = Task(
        user_id=input_data.user_id,
        title=task_analysis.get("title", input_data.text),
        description=input_data.text,
        deadline=deadline,
        priority=task_analysis.get("priority", "medium"),
        emotional_support=task_analysis.get("emotional_support", "")
    )
    
    # Create subtasks
    subtasks_data = task_analysis.get("subtasks", [])
    for i, subtask_item in enumerate(subtasks_data):
        # Handle both new format (object with description & deadline) and old format (string only)
        if isinstance(subtask_item, dict):
            subtask_desc = subtask_item.get("description", "")
            
            # Process subtask deadline if provided
            subtask_deadline = None
            if subtask_item.get("deadline"):
                try:
                    subtask_date_str = subtask_item["deadline"]
                    if 'T' in subtask_date_str:
                        subtask_deadline = datetime.fromisoformat(subtask_date_str.replace("Z", "+00:00"))
                    else:
                        # For YYYY-MM-DD format, add time (end of day)
                        subtask_deadline = datetime.fromisoformat(f"{subtask_date_str}T23:59:59")
                except:
                    # If parsing fails, don't set a deadline
                    logging.error(f"Failed to parse subtask deadline: {subtask_item['deadline']}")
        else:
            # Handle legacy format (plain string)
            subtask_desc = str(subtask_item)
            subtask_deadline = None
            
        subtask_title = subtask_item.get('title') or subtask_desc
        subtask = Subtask(
            task_id=task.id,
            title=subtask_title,
            description=subtask_desc,
            deadline=subtask_deadline,
            order=i
        )
        task.subtasks.append(subtask)
    
    # Insert task
    task_dict = task.dict()
    await db.tasks.insert_one(task_dict)
    return task


# Emotional support API
@api_router.post("/emotional-support", response_model=EmotionalSupportType)
async def get_emotional_support(task_id: str):
    # Get task
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Generate new emotional support message
    support_message = await generate_emotional_support(task["title"], task.get("deadline"))

    # Update task with new message
    await db.tasks.update_one({"id": task_id}, {"$set": {"emotional_support": support_message}})

    return {"message": support_message, "task_id": task_id}


# Statistics API routes
@api_router.get("/statistics/user/{user_id}", response_model=TaskStatistics)
async def get_user_statistics(user_id: str):
    # Get all tasks for the user
    tasks = await db.tasks.find({"user_id": user_id}).to_list(1000)
    tasks = [Task(**task) for task in tasks]
    
    # Calculate basic statistics
    total_tasks = len(tasks)
    completed_tasks = sum(1 for task in tasks if task.completed)
    completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
    
    # Tasks by priority
    tasks_by_priority = {
        "high": sum(1 for task in tasks if task.priority == "high"),
        "medium": sum(1 for task in tasks if task.priority == "medium"),
        "low": sum(1 for task in tasks if task.priority == "low")
    }
    
    # Tasks by status
    tasks_by_status = {
        "completed": completed_tasks,
        "in_progress": total_tasks - completed_tasks
    }
    
    # Recent completions (last 7 days)
    one_week_ago = datetime.utcnow() - timedelta(days=7)
    recent_completions = [
        task for task in tasks 
        if task.completed and task.updated_at >= one_week_ago
    ]
    
    # Calculate average completion time
    completion_times = []
    for task in tasks:
        if task.completed and task.created_at and task.updated_at:
            completion_time = (task.updated_at - task.created_at).total_seconds() / 3600  # in hours
            completion_times.append(completion_time)
    
    average_completion_time = sum(completion_times) / len(completion_times) if completion_times else None

    # Calculate subtask statistics
    all_subtasks = []
    for task in tasks:
        all_subtasks.extend(task.subtasks)
    
    total_subtasks = len(all_subtasks)
    completed_subtasks = sum(1 for subtask in all_subtasks if subtask.completed)
    subtask_completion_rate = (completed_subtasks / total_subtasks * 100) if total_subtasks > 0 else 0
    
    # Subtasks by priority (using parent task's priority)
    subtasks_by_priority = {
        "high": sum(len([st for st in task.subtasks if task.priority == "high"]) for task in tasks),
        "medium": sum(len([st for st in task.subtasks if task.priority == "medium"]) for task in tasks),
        "low": sum(len([st for st in task.subtasks if task.priority == "low"]) for task in tasks)
    }
    
    # Subtasks by status
    subtasks_by_status = {
        "completed": completed_subtasks,
        "in_progress": total_subtasks - completed_subtasks
    }
    
    # Average subtasks per task
    average_subtasks_per_task = total_subtasks / total_tasks if total_tasks > 0 else 0
    
    return TaskStatistics(
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        completion_rate=completion_rate,
        tasks_by_priority=tasks_by_priority,
        tasks_by_status=tasks_by_status,
        recent_completions=recent_completions,
        average_completion_time=average_completion_time,
        total_subtasks=total_subtasks,
        completed_subtasks=completed_subtasks,
        subtask_completion_rate=subtask_completion_rate,
        subtasks_by_priority=subtasks_by_priority,
        subtasks_by_status=subtasks_by_status,
        average_subtasks_per_task=average_subtasks_per_task
    )


async def analyze_statistics_with_llm(stats: TaskStatistics, tasks: List[Task]) -> Dict[str, Any]:
    """Use Together.ai to analyze task statistics and provide feedback"""
    
    # Check if we have cached feedback that's still valid
    cache_key = f"{stats.total_tasks}_{stats.completed_tasks}_{stats.total_subtasks}_{stats.completed_subtasks}"
    if cache_key in FEEDBACK_CACHE:
        cached_feedback, timestamp = FEEDBACK_CACHE[cache_key]
        if time.time() - timestamp < CACHE_DURATION:
            return cached_feedback

    # If no Together.ai API key, return service unavailable feedback
    if not TOGETHER_API_KEY:
        logging.error("Together.ai API key is not configured")
        service_unavailable_feedback = {
            "summary": "AI Analysis Service Unavailable",
            "insights": [
                "The AI analysis service is currently not configured",
                "Please check your API key configuration",
                "Contact your administrator for assistance"
            ],
            "suggestions": [
                "Configure the Together.ai API key to enable AI analysis",
                "Check the backend logs for more information",
                "Try refreshing the page once the service is configured"
            ]
        }
        FEEDBACK_CACHE[cache_key] = (service_unavailable_feedback, time.time())
        return service_unavailable_feedback

    # Prepare task data for analysis
    task_data = {
        "total_tasks": stats.total_tasks,
        "completed_tasks": stats.completed_tasks,
        "completion_rate": stats.completion_rate,
        "tasks_by_priority": stats.tasks_by_priority,
        "tasks_by_status": stats.tasks_by_status,
        "total_subtasks": stats.total_subtasks,
        "completed_subtasks": stats.completed_subtasks,
        "subtask_completion_rate": stats.subtask_completion_rate,
        "recent_completions": [
            {
                "title": task.title,
                "completed_at": task.updated_at.isoformat() if task.completed else None,
                "priority": task.priority
            }
            for task in stats.recent_completions
        ]
    }

    headers = {"Authorization": f"Bearer {TOGETHER_API_KEY}", "Content-Type": "application/json"}

    data = {
        "model": "mistralai/Mixtral-8x7B-Instruct-v0.1",
        "messages": [
            {
                "role": "system",
                "content": "You are an AI productivity coach analyzing a user's task completion statistics."
            },
            {
                "role": "user",
                "content": f"""
                Here are the user's statistics:
                {json.dumps(task_data, indent=2)}
                
                Please analyze these statistics and provide feedback in the following format:
                {{
                    "summary": "A brief 1-2 sentence summary of their overall progress",
                    "insights": [
                        "First insight about their productivity patterns",
                        "Second insight about their task completion habits",
                        "Third insight about their work patterns"
                    ],
                    "suggestions": [
                        "First actionable suggestion for improvement",
                        "Second actionable suggestion for improvement",
                        "Third actionable suggestion for improvement"
                    ]
                }}
                
                Important guidelines:
                - Keep the summary concise and encouraging
                - Make insights specific to their actual statistics
                - Make suggestions practical and actionable
                - Focus on positive patterns and constructive improvements
                - Use the exact format shown above
                - Respond with ONLY the JSON, no explanations or other text
                """
            }
        ],
        "temperature": 0.7,
        "top_p": 0.9,
        "top_k": 40,
    }

    try:
        logging.info("Sending request to Together.ai API")
        response = requests.post(TOGETHER_API_URL, headers=headers, json=data, timeout=10)
        response.raise_for_status()
        result = response.json()

        # Extract the generated text from the response
        generated_text = result["choices"][0]["message"]["content"].strip()
        logging.info("Received response from Together.ai API")

        # Parse the JSON from the generated text
        try:
            feedback_data = json.loads(generated_text)
            # Cache the successful response
            FEEDBACK_CACHE[cache_key] = (feedback_data, time.time())
            return feedback_data
        except json.JSONDecodeError:
            # If the model didn't return valid JSON, try to extract JSON portion
            try:
                # Look for JSON-like content between curly braces
                json_start = generated_text.find("{")
                json_end = generated_text.rfind("}") + 1
                if json_start >= 0 and json_end > json_start:
                    json_str = generated_text[json_start:json_end]
                    feedback_data = json.loads(json_str)
                    # Cache the successful response
                    FEEDBACK_CACHE[cache_key] = (feedback_data, time.time())
                    return feedback_data
            except:
                logging.error(f"Failed to parse AI response as JSON: {generated_text}")
                service_error_feedback = {
                    "summary": "AI Analysis Service Error",
                    "insights": [
                        "The AI service returned an invalid response",
                        "Please try again later",
                        "Contact support if the issue persists"
                    ],
                    "suggestions": [
                        "Try refreshing the page",
                        "Check your internet connection",
                        "Contact support if the issue persists"
                    ]
                }
                FEEDBACK_CACHE[cache_key] = (service_error_feedback, time.time())
                return service_error_feedback

    except requests.exceptions.Timeout:
        logging.error("Together.ai API request timed out")
        service_error_feedback = {
            "summary": "AI Analysis Service Timeout",
            "insights": [
                "The AI service took too long to respond",
                "The request timed out after 10 seconds",
                "Please try again later"
            ],
            "suggestions": [
                "Check your internet connection",
                "Try again in a few minutes",
                "Contact support if the issue persists"
            ]
        }
        FEEDBACK_CACHE[cache_key] = (service_error_feedback, time.time())
        return service_error_feedback

    except requests.exceptions.RequestException as e:
        logging.error(f"Together.ai API request failed: {str(e)}")
        service_error_feedback = {
            "summary": "AI Analysis Service Error",
            "insights": [
                "The AI service encountered an error",
                f"Error details: {str(e)}",
                "Please try again later"
            ],
            "suggestions": [
                "Check your internet connection",
                "Verify the AI service is running",
                "Contact support if the issue persists"
            ]
        }
        FEEDBACK_CACHE[cache_key] = (service_error_feedback, time.time())
        return service_error_feedback


@api_router.get("/statistics/user/{user_id}/feedback", response_model=AIFeedback)
async def get_user_statistics_feedback(user_id: str):
    """Get AI-generated feedback based on user's task statistics"""
    try:
        # Verify user exists
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Get user's statistics
        stats = await get_user_statistics(user_id)
        
        # Get user's tasks for additional context
        tasks = await get_user_tasks(user_id)
        
        # Generate AI feedback
        feedback = await analyze_statistics_with_llm(stats, tasks)
        
        return feedback
    except Exception as e:
        logging.error(f"Error generating feedback: {str(e)}", exc_info=True)
        # Return error feedback
        return {
            "summary": "Error Generating AI Analysis",
            "insights": [
                "An unexpected error occurred",
                f"Error details: {str(e)}",
                "Please try again later"
            ],
            "suggestions": [
                "Check the backend logs for more information",
                "Try refreshing the page",
                "Contact support if the issue persists"
            ]
        }


# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "AI Task Assistant API"}


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
