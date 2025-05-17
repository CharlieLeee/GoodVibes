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

# Root directory and environment loading
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Together.ai API key
TOGETHER_API_KEY = os.environ.get('TOGETHER_API_KEY')
TOGETHER_API_URL = "https://api.together.xyz/v1/completions"

# Create the main app without a prefix
app = FastAPI(title="AI Task Assistant API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security setup for simple auth
security = HTTPBearer()

# Define Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Subtask(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    task_id: str
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
    description: str
    deadline: Optional[datetime] = None
    order: int = 0

class SubtaskUpdate(BaseModel):
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
    3. A suggested final deadline if applicable (as ISO date in YYYY-MM-DD format)
    4. A priority level (low, medium, high)
    5. A brief encouraging message to help the user stay motivated
    
    Important instructions about dates:
    - Today's date is {current_date_str}
    - If a specific date is mentioned (like "June 15th"), use that as the final deadline
    - If a day of week is mentioned (like "by Monday"), calculate the exact date based on today's date
    - If a relative time is mentioned (like "in 3 days"), calculate the date based on today
    - For subtask deadlines, distribute them evenly between today and the final deadline
    - Always return dates in ISO format (YYYY-MM-DD)
    - If no deadline is mentioned, set deadline to null
    
    Format your response as a JSON object with these keys: 
    "title", "subtasks" (array of objects with "description" and "deadline"), "deadline", "priority", "emotional_support"
    
    Example format:
    {{
        "title": "Write quarterly report",
        "subtasks": [
            {{ "description": "Gather sales data", "deadline": "2025-04-01" }},
            {{ "description": "Analyze market trends", "deadline": "2025-04-05" }},
            {{ "description": "Create charts and graphs", "deadline": "2025-04-10" }},
            {{ "description": "Write executive summary", "deadline": "2025-04-12" }},
            {{ "description": "Proofread and finalize", "deadline": "2025-04-14" }}
        ],
        "deadline": "2025-04-15",
        "priority": "high",
        "emotional_support": "You've got this! Breaking down this report makes it much more manageable."
    }}
    
    Respond with ONLY the JSON, no explanations or other text.
    """
    
    headers = {
        "Authorization": f"Bearer {TOGETHER_API_KEY}",
        "Content-Type": "application/json"
    }
    
    data = {
        "model": "mistralai/Mixtral-8x7B-Instruct-v0.1",
        "prompt": prompt,
        "max_tokens": 1024,
        "temperature": 0.7,
        "top_p": 0.9,
        "top_k": 40
    }
    
    try:
        response = requests.post(TOGETHER_API_URL, headers=headers, json=data)
        response.raise_for_status()
        result = response.json()
        
        # Extract the generated text from the response
        generated_text = result['choices'][0]['text'].strip()
        
        # Parse the JSON from the generated text
        try:
            task_data = json.loads(generated_text)
            return task_data
        except json.JSONDecodeError:
            # If the model didn't return valid JSON, try to extract JSON portion
            try:
                # Look for JSON-like content between curly braces
                json_start = generated_text.find('{')
                json_end = generated_text.rfind('}') + 1
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
                    "emotional_support": "Let's start by clarifying what needs to be done."
                }
        
    except Exception as e:
        logging.error(f"Error calling Together.ai API: {str(e)}")
        # Fallback response
        return {
            "title": text,
            "subtasks": ["Review task details"],
            "deadline": None,
            "priority": "medium",
            "emotional_support": "Let's start by clarifying what needs to be done."
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
    
    headers = {
        "Authorization": f"Bearer {TOGETHER_API_KEY}",
        "Content-Type": "application/json"
    }
    
    data = {
        "model": "mistralai/Mixtral-8x7B-Instruct-v0.1",
        "prompt": prompt,
        "max_tokens": 100,
        "temperature": 0.7,
        "top_p": 0.9,
        "top_k": 40
    }
    
    try:
        response = requests.post(TOGETHER_API_URL, headers=headers, json=data)
        response.raise_for_status()
        result = response.json()
        
        # Extract the generated text
        support_message = result['choices'][0]['text'].strip()
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
        priority=task_create.priority
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
        description=subtask_create.description,
        deadline=subtask_create.deadline,
        order=subtask_create.order or len(task.get("subtasks", []))
    )
    
    # Add subtask to task
    subtask_dict = subtask.dict()
    await db.tasks.update_one(
        {"id": task_id},
        {
            "$push": {"subtasks": subtask_dict},
            "$set": {"updated_at": datetime.utcnow()}
        }
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
            {
                "$set": {
                    "subtasks": task["subtasks"],
                    "completed": all_completed,
                    "updated_at": datetime.utcnow()
                }
            }
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
        {"id": task_id},
        {
            "$pull": {"subtasks": {"id": subtask_id}},
            "$set": {"updated_at": datetime.utcnow()}
        }
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
            
        subtask = Subtask(
            task_id=task.id,
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
    await db.tasks.update_one(
        {"id": task_id},
        {"$set": {"emotional_support": support_message}}
    )
    
    return {"message": support_message, "task_id": task_id}

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
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
