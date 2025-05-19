from fastapi import FastAPI, APIRouter, HTTPException, Body, Depends, BackgroundTasks
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
from typing import List, Optional, Dict, Any, Union, Literal, Type
import uuid
from datetime import datetime, timedelta
import time
import asyncio
from fastapi.responses import JSONResponse
import re
from fastapi import Request

# LangChain imports
from langchain_together import ChatTogether
from langchain.memory import ConversationBufferMemory
from langchain_community.chat_message_histories.in_memory import ChatMessageHistory
from langchain.chains import ConversationChain
from langchain.schema import SystemMessage, HumanMessage, AIMessage
from langchain.tools import Tool, StructuredTool
from langchain.agents import AgentExecutor, AgentType, initialize_agent
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder, HumanMessagePromptTemplate
from langchain_community.chat_models import ChatOpenAI

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

# Add OpenAI API key
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")

# Create the main app without a prefix
app = FastAPI(title="AI Task Assistant API")

# Add CORS middleware before including the router
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
    title: Optional[str] = None
    description: str
    completed: bool = False
    deadline: Optional[datetime] = None
    order: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    def __init__(self, **data):
        # If title is not provided or is None, use description as title
        if "title" not in data or data["title"] is None:
            if "description" in data:
                data["title"] = data["description"]
        super().__init__(**data)


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
    """Input for natural language task processing"""
    text: str
    user_id: str
    task_data: Optional[Dict[str, Any]] = None


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
    motivation: str
    achievements: List[str]
    growth_areas: List[str]


# Add new Chat models
class ChatMessage(BaseModel):
    user_id: str
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ChatMessageInput(BaseModel):
    message: str
    user_id: str

class ChatResponse(BaseModel):
    response: str

# Chat memory storage
chat_messages = []

# Store pending tasks
pending_tasks = []
pending_analyzed_tasks = []

# Task creation models
class TaskCreationInput(BaseModel):
    title: str = Field(..., description="The title of the task")
    description: Optional[str] = Field(None, description="A detailed description of the task")
    priority: str = Field("medium", description="The priority of the task (low, medium, high)")
    deadline: Optional[str] = Field(None, description="The deadline for the task in ISO format (YYYY-MM-DD)")

# Background task to process pending task creations
async def process_pending_tasks():
    """Process any pending task creations in the background"""
    global pending_tasks, pending_analyzed_tasks
    
    # Process regular tasks
    tasks_to_process = pending_tasks.copy()
    pending_tasks = []
    
    for task_data in tasks_to_process:
        try:
            user_id = task_data.pop("user_id")
            await create_task_from_llm(task_data, user_id)
        except Exception as e:
            logging.error(f"Error processing pending task: {str(e)}")
    
    # Process analyzed tasks
    analyzed_tasks = pending_analyzed_tasks.copy()
    pending_analyzed_tasks = []
    
    for analyzed_task in analyzed_tasks:
        try:
            user_id = analyzed_task.pop("user_id")
            text = analyzed_task.pop("text")
            await process_natural_language_task_internal(text, user_id)
        except Exception as e:
            logging.error(f"Error processing analyzed task: {str(e)}")

# Process a natural language task internally
async def process_natural_language_task_internal(text: str, user_id: str) -> Dict[str, Any]:
    """Process a natural language task input and create a task with subtasks"""
    try:
        # Verify user exists
        user = await db.users.find_one({"id": user_id})
        if not user:
            return {"error": "User not found"}
        
        # Process task with Together.ai
        task_analysis = await analyze_task_with_llm(text)
        
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
        
        # Create task
        task = Task(
            user_id=user_id,
            title=task_analysis.get("title", text),
            description=text,
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
        
        # Return success response with task details
        return {
            "success": True,
            "task_id": task.id,
            "title": task.title,
            "subtasks_count": len(task.subtasks),
            "deadline": formatDate(task.deadline) if task.deadline else "No deadline",
            "priority": task.priority
        }
    except Exception as e:
        logging.error(f"Error in process_natural_language_task_internal: {str(e)}")
        return {"error": f"Failed to process task: {str(e)}"}

# Function to get all available tools for the agent
def get_agent_tools(user_id: str):
    """Get all tools available to the agent"""
    
    # Create task tool
    def create_task_sync(query: str) -> str:
        """Synchronous wrapper for task creation"""
        try:
            # Parse the query string (synchronous version)
            parts = query.split("|")
            title = parts[0].strip()
            description = parts[1].strip() if len(parts) > 1 else None
            priority = parts[2].strip() if len(parts) > 2 and parts[2].strip() else "medium"
            deadline = parts[3].strip() if len(parts) > 3 and parts[3].strip() else None
            
            # Validate priority
            if priority not in ["low", "medium", "high"]:
                priority = "medium"
                
            # Create task data
            task_data = {
                "title": title,
                "description": description,
                "priority": priority,
                "deadline": deadline,
                "user_id": user_id
            }
            
            # Create task immediately but don't block
            # We'll use a separate event loop to avoid interfering with FastAPI's
            import asyncio
            try:
                # Try to use an existing event loop
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    # Create a new loop if the current one is running
                    loop = asyncio.new_event_loop()
                    future = asyncio.run_coroutine_threadsafe(
                        create_task_from_llm(task_data, user_id),
                        loop
                    )
                    task_result = future.result(30)  # 30 second timeout
                else:
                    # Use the current loop if it's not running
                    task_result = loop.run_until_complete(
                        create_task_from_llm(task_data, user_id)
                    )
            except RuntimeError:
                # If we're in a thread that doesn't have an event loop
                task_result = asyncio.run(create_task_from_llm(task_data, user_id))
            
            if "error" in task_result:
                return f"Error: {task_result['error']}"
            
            return f"✅ Task '{task_result['title']}' has been created with {task_result['priority']} priority" + (f" and deadline {task_result['deadline']}" if task_result['deadline'] != "No deadline" else ".")
        except Exception as e:
            logging.error(f"Error in synchronous task creation: {str(e)}")
            return f"Error creating task: {str(e)}"
    
    # Create decompose task tool
    def decompose_task_sync(task_text: str) -> str:
        """Decompose a task into subtasks using AI"""
        try:
            # Process the task immediately but don't block
            # We'll use a separate event loop to avoid interfering with FastAPI's
            import asyncio
            try:
                # Try to use an existing event loop
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    # Create a new loop if the current one is running
                    loop = asyncio.new_event_loop()
                    future = asyncio.run_coroutine_threadsafe(
                        process_natural_language_task_internal(task_text, user_id),
                        loop
                    )
                    task_result = future.result(60)  # 60 second timeout
                else:
                    # Use the current loop if it's not running
                    task_result = loop.run_until_complete(
                        process_natural_language_task_internal(task_text, user_id)
                    )
            except RuntimeError:
                # If we're in a thread that doesn't have an event loop
                task_result = asyncio.run(process_natural_language_task_internal(task_text, user_id))
            
            if "error" in task_result:
                return f"Error: {task_result['error']}"
            
            return f"✅ Task '{task_result['title']}' has been created with {task_result.get('priority', 'medium')} priority and broken down into {task_result['subtasks_count']} subtasks" + (f", due by {task_result['deadline']}" if task_result['deadline'] != "No deadline" else ".")
        except Exception as e:
            logging.error(f"Error in task decomposition: {str(e)}")
            return f"Error decomposing task: {str(e)}"
    
    # Return both tools
    return [
        Tool(
            name="create_task",
            func=create_task_sync,
            description="""Create a task for the user. The format should be: 
            create_task: <title> | <description> | <priority> | <deadline>
            
            Examples:
            create_task: Buy groceries | Get milk, eggs and bread | high | 2025-05-20
            create_task: Call doctor | Schedule annual checkup | medium | 2025-05-25
            create_task: Finish report | | low | 
            
            Only <title> is required. Other fields are optional and can be left empty."""
        ),
        Tool(
            name="decompose_task",
            func=decompose_task_sync,
            description="""Analyze and break down a complex task into manageable subtasks. 
            This tool will analyze the task description and automatically:
            1. Identify a clear task title
            2. Break it down into 3-5 logical subtasks
            3. Suggest appropriate deadlines for the task and subtasks
            4. Recommend a priority level
            
            Use this when a user describes a complex project or goal that would benefit from being broken down into smaller steps.
            
            Example inputs:
            - "I need to plan my wedding for next summer"
            - "I have to write a research paper on climate change by the end of the month"
            - "Need to renovate my kitchen in the next two months"
            """
        )
    ]

# Together.ai integration functions
async def analyze_task_with_llm(text: str) -> Dict[str, Any]:
    """Use OpenAI to analyze a natural language task input and break it down"""

    # Get current date information for context
    current_date = datetime.utcnow()
    current_date_str = current_date.strftime("%Y-%m-%d")
    
    # Check if OpenAI API key is available
    if not OPENAI_API_KEY:
        logging.error("OpenAI API key not found for task analysis")
        # Return simple fallback response
        return {
            "title": text,
            "subtasks": ["Review task details"],
            "deadline": None,
            "priority": "medium",
            "emotional_support": "Let's start by clarifying what needs to be done."
        }

    # Initialize OpenAI model
    logging.info("Initializing OpenAI model for task analysis")
    llm = ChatOpenAI(
        model="gpt-4o",
        temperature=0.7, 
        max_tokens=1024,
        openai_api_key=OPENAI_API_KEY
    )
    
    # Prepare the system and user messages
    messages = [
        {"role": "system", "content": "You are an AI assistant and an expert in time management that helps break down tasks into manageable subtasks and provides emotional support."},
        {"role": "user", "content": f"""
        CURRENT DATE: {current_date_str}
        
        USER INPUT: {text}
        
        Please analyze this task and provide:
        1. A clear task title
        2. A list of 3-5 subtasks to complete it, each with its own intermediate deadline
           - Each subtask MUST include a 'title', a 'description', and a 'deadline' field
           - Each deadline MUST include a specific time (HH:MM) in 24-hour format
        3. A suggested final deadline if applicable (as ISO date in YYYY-MM-DDTHH:MM format)
        4. A priority level (low, medium, high)
        5. A brief encouraging message to help the user stay motivated
        
        Important instructions about dates and times:
        - Today's date is {current_date_str}
        - All deadlines MUST include specific times in 24-hour format (HH:MM)
        - If a specific date is mentioned (like "June 15th"), use that date with a reasonable time (e.g., "2024-06-15T17:00")
        - If a day of week is mentioned (like "by Monday"), calculate the exact date based on today's date and use a reasonable time
        - If a relative time is mentioned (like "in 3 days"), calculate the date based on today and use a reasonable time
        - For subtask deadlines, distribute them reasonably between {current_date_str} and the final deadline based on your expert knowledge
        - Always return dates in ISO format with time (YYYY-MM-DDTHH:MM)
        - If no deadline is mentioned, set deadline to null
        
        Format your response as a JSON object with these keys: 
        "title", "subtasks" (array of objects with "title", "description", and "deadline"), "deadline", "priority", "emotional_support"
        
        Example format:
        {{
            "title": "Write quarterly report",
            "subtasks": [
                {{ "title": "Collect sales data", "description": "Gather all sales data from Q1", "deadline": "2025-04-01T14:00" }},
                {{ "title": "Analyze market trends", "description": "Review competitor performance", "deadline": "2025-04-05T16:30" }},
                {{ "title": "Create charts and graphs", "description": "Visualize key metrics", "deadline": "2025-04-10T15:00" }},
                {{ "title": "Write executive summary", "description": "Summarize findings", "deadline": "2025-04-12T17:00" }},
                {{ "title": "Proofread and finalize", "description": "Check for errors and finalize report", "deadline": "2025-04-14T16:00" }}
            ],
            "deadline": "2025-04-15T17:00",
            "priority": "high",
            "emotional_support": "You've got this! Breaking down this report makes it much more manageable."
        }}
        
        Respond with ONLY the JSON, no explanations or other text.
        """}
    ]

    try:
        # Call OpenAI API
        logging.info("Calling OpenAI API for task analysis")
        response = await llm.ainvoke(messages)
        
        # Extract content from the AIMessage
        generated_text = response.content if hasattr(response, 'content') else str(response)
        logging.info("Received response from OpenAI API for task analysis")

        # Parse the JSON from the generated text
        try:
            task_data = json.loads(generated_text)
            logging.info(f"Successfully parsed task analysis JSON: {task_data.keys()}")
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
                    logging.info(f"Successfully extracted and parsed task analysis JSON: {task_data.keys()}")
                    return task_data
            except:
                logging.error(f"Failed to parse OpenAI response as JSON: {generated_text[:200]}...")
                # Return a simple fallback response
                return {
                    "title": text,
                    "subtasks": ["Review task details"],
                    "deadline": None,
                    "priority": "medium",
                    "emotional_support": "Let's start by clarifying what needs to be done.",
                }

    except Exception as e:
        logging.error(f"Error calling OpenAI API for task analysis: {str(e)}")
        # Fallback response
        return {
            "title": text,
            "subtasks": ["Review task details"],
            "deadline": None,
            "priority": "medium",
            "emotional_support": "Let's start by clarifying what needs to be done.",
        }


async def generate_emotional_support(task_title: str, deadline: Optional[datetime] = None) -> str:
    """Generate emotional support message based on task context using OpenAI"""

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

    # Check if OpenAI API key is available
    if not OPENAI_API_KEY:
        logging.error("OpenAI API key not found for generating emotional support")
        return "You're making great progress! Keep going, you've got this."

    # Initialize OpenAI model
    logging.info("Initializing OpenAI model for emotional support")
    llm = ChatOpenAI(
        model="gpt-4o",
        temperature=0.7,
        max_tokens=100,
        openai_api_key=OPENAI_API_KEY
    )
    
    # Prepare messages for OpenAI
    messages = [
        {"role": "system", "content": "You are an AI assistant that provides encouraging, motivational messages to help users with their tasks."},
        {"role": "user", "content": f"""
        Task: {task_title}
        {deadline_context}
        
        Generate a brief, supportive message (1-2 sentences) that:
        - Acknowledges the task difficulty
        - Provides encouragement
        - Offers a positive perspective
        
        Your message should be warm, supportive and empathetic.
        Respond with ONLY the supportive message, no explanations or other text.
        """}
    ]

    try:
        # Call OpenAI API
        logging.info("Calling OpenAI API for emotional support")
        response = await llm.ainvoke(messages)
        
        # Extract content from the AIMessage
        support_message = response.content if hasattr(response, 'content') else str(response)
        logging.info("Received emotional support message from OpenAI")
        return support_message.strip()

    except Exception as e:
        logging.error(f"Error generating emotional support with OpenAI: {str(e)}")
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
        
        # Add updated_at timestamp to the subtask
        task["subtasks"][subtask_index]["updated_at"] = datetime.utcnow()

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
    """Process a natural language task description and create a structured task"""
    try:
        # Verify user exists
        user = await db.users.find_one({"id": input_data.user_id})
        if not user:
            logging.error(f"User not found when processing task: {input_data.user_id}")
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if we have structured task_data in the input
        task_data = getattr(input_data, "task_data", None)
        
        # If we have structured task data, use it directly
        if task_data:
            logging.info(f"Creating task from structured data: {task_data}")
            
            task_title = task_data.get("title", "")
            task_description = task_data.get("description", "")
            task_priority = task_data.get("priority", "medium")
            task_deadline_str = task_data.get("deadline")
            task_subtasks = task_data.get("subtasks", [])
            
            # Create the task
            task = Task(
                user_id=input_data.user_id,
                title=task_title,
                description=task_description or "",
                priority=task_priority,
                deadline=task_deadline_str,
                completed=False
            )
            
            # Process subtasks if available
            for i, subtask_item in enumerate(task_subtasks):
                subtask_deadline = None
                if subtask_item.get("deadline"):
                    subtask_deadline = parse_deadline(subtask_item["deadline"])
                    
                subtask = Subtask(
                    task_id=task.id,
                    title=subtask_item.get("description", "")[:50],  # Use start as title
                    description=subtask_item.get("description", ""),
                    priority=subtask_item.get("priority", "medium"),
                    deadline=subtask_deadline,
                    order=i
                )
                task.subtasks.append(subtask)
            
            # Save the task
            task_dict = task.dict()
            await db.tasks.insert_one(task_dict)
            return task
        
        # If no structured data, fall back to AI processing
        if not OPENAI_API_KEY and not TOGETHER_API_KEY:
            logging.error("No LLM API keys available for task processing")
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
            
        # Process task with LLM
        task_analysis = await analyze_task_with_llm(input_data.text)
        logging.info(f"Task analysis result: {json.dumps(task_analysis, default=str)[:200]}...")
        
        # Create deadline if provided
        deadline = None
        if task_analysis.get("deadline") and task_analysis["deadline"] != "not specified" and task_analysis["deadline"] != "null":
            try:
                deadline = parse_deadline(task_analysis["deadline"])
            except Exception as e:
                logging.error(f"Failed to parse deadline: {task_analysis['deadline']} - Error: {str(e)}")
        
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
        logging.info(f"Creating {len(subtasks_data)} subtasks")
        
        for i, subtask_item in enumerate(subtasks_data):
            try:
                # Handle both new format (object with description & deadline) and old format (string only)
                if isinstance(subtask_item, dict):
                    subtask_desc = subtask_item.get("description", "")
                    logging.info(f"Subtask {i+1} is a dictionary: {subtask_item}")
                    
                    # Process subtask deadline if provided
                    subtask_deadline = None
                    if subtask_item.get("deadline"):
                        try:
                            subtask_deadline = parse_deadline(subtask_item["deadline"])
                        except Exception as e:
                            logging.error(f"Failed to parse subtask deadline: {subtask_item['deadline']} - Error: {str(e)}")
                else:
                    # Handle legacy format (plain string)
                    subtask_desc = str(subtask_item)
                    subtask_deadline = None
                    logging.info(f"Subtask {i+1} is a string: {subtask_desc}")
                    
                # Set title based on item type - using .get only when it's a dictionary
                subtask_title = subtask_item.get('title') if isinstance(subtask_item, dict) else subtask_desc
                
                subtask = Subtask(
                    task_id=task.id,
                    title=subtask_title[:50],  # Use start as title
                    description=subtask_desc,
                    deadline=subtask_deadline,
                    order=i
                )
                task.subtasks.append(subtask)
                logging.info(f"Added subtask {i+1}: {subtask_title}")
            except Exception as e:
                logging.error(f"Error creating subtask {i+1}: {str(e)}")
        
        # Insert task
        task_dict = task.dict()
        await db.tasks.insert_one(task_dict)
        logging.info(f"Task created successfully with ID: {task.id}")
        return task
        
    except Exception as e:
        logging.error(f"Error in process_natural_language_task: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to process task: {str(e)}"
        )

def parse_deadline(date_str):
    """Parse deadline string into datetime object"""
    if not date_str or date_str == "null" or date_str == "not specified":
        return None
        
    try:
        logging.info(f"Parsing deadline: {date_str}")
        if 'T' in date_str:
            # ISO format with time
            return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        else:
            # YYYY-MM-DD format, add time (end of day)
            return datetime.fromisoformat(f"{date_str}T23:59:59")
    except Exception as e:
        logging.error(f"Failed to parse deadline: {date_str} - Error: {str(e)}")
        return None

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
    # Count subtasks that are explicitly marked as completed
    completed_subtasks = sum(1 for subtask in all_subtasks if subtask.completed)
    subtask_completion_rate = (completed_subtasks / total_subtasks * 100) if total_subtasks > 0 else 0
    
    # Recent subtask completions (last 7 days)
    recent_subtask_completions = sum(
        1 for subtask in all_subtasks 
        if subtask.completed and hasattr(subtask, 'updated_at') and 
        subtask.updated_at and subtask.updated_at >= one_week_ago
    )
    
    # Subtasks by priority (using parent task's priority)
    subtasks_by_priority = {
        "high": sum(1 for subtask in all_subtasks for task in tasks if task.id == subtask.task_id and task.priority == "high"),
        "medium": sum(1 for subtask in all_subtasks for task in tasks if task.id == subtask.task_id and task.priority == "medium"),
        "low": sum(1 for subtask in all_subtasks for task in tasks if task.id == subtask.task_id and task.priority == "low")
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


# Create a task creation tool for the LLM

async def create_task_from_llm(task_data: dict, user_id: str):
    """
    Create a task in the database using data provided by the LLM.
    
    Args:
        task_data: A dictionary containing task information
        user_id: The ID of the user who owns the task
    
    Returns:
        A confirmation message with the created task details
    """
    try:
        # Validate user exists
        user = await db.users.find_one({"id": user_id})
        if not user:
            return {"error": "User not found"}
        
        # Process deadline if provided
        deadline = None
        if task_data.get("deadline"):
            try:
                deadline_str = task_data["deadline"]
                if 'T' in deadline_str:
                    deadline = datetime.fromisoformat(deadline_str.replace("Z", "+00:00"))
                else:
                    # For YYYY-MM-DD format, add time (end of day)
                    deadline = datetime.fromisoformat(f"{deadline_str}T23:59:59")
            except:
                logging.error(f"Failed to parse deadline: {task_data['deadline']}")
        
        # Create task
        task = Task(
            user_id=user_id,
            title=task_data["title"],
            description=task_data.get("description"),
            deadline=deadline,
            priority=task_data.get("priority", "medium"),
        )
        
        # Generate emotional support
        task.emotional_support = await generate_emotional_support(task.title, task.deadline)
        
        # Insert task
        task_dict = task.dict()
        await db.tasks.insert_one(task_dict)
        
        # Create response with task details
        response = {
            "success": True,
            "message": f"Task '{task.title}' created successfully",
            "task_id": task.id,
            "title": task.title,
            "priority": task.priority,
            "deadline": formatDate(task.deadline) if task.deadline else "No deadline"
        }
        
        return response
    except Exception as e:
        logging.error(f"Error creating task from LLM: {str(e)}")
        return {"error": f"Failed to create task: {str(e)}"}

def formatDate(date_obj):
    """Format a date object to a readable string"""
    if not date_obj:
        return ""
    return date_obj.strftime("%B %d, %Y")

# Create tool for chat endpoint
def get_create_task_tool(user_id: str):
    """Create a structured tool for task creation"""
    
    # Simple synchronous function that handles the string parsing
    def create_task_sync(query: str) -> str:
        """Synchronous wrapper for task creation"""
        try:
            # Parse the query string (synchronous version)
            parts = query.split("|")
            title = parts[0].strip()
            description = parts[1].strip() if len(parts) > 1 else None
            priority = parts[2].strip() if len(parts) > 2 and parts[2].strip() else "medium"
            deadline = parts[3].strip() if len(parts) > 3 and parts[3].strip() else None
            
            # Validate priority
            if priority not in ["low", "medium", "high"]:
                priority = "medium"
                
            # Create task data
            task_data = {
                "title": title,
                "description": description,
                "priority": priority,
                "deadline": deadline,
                "user_id": user_id
            }
            
            # Create task immediately but don't block
            # We'll use a separate event loop to avoid interfering with FastAPI's
            import asyncio
            try:
                # Try to use an existing event loop
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    # Create a new loop if the current one is running
                    loop = asyncio.new_event_loop()
                    future = asyncio.run_coroutine_threadsafe(
                        create_task_from_llm(task_data, user_id),
                        loop
                    )
                    task_result = future.result(30)  # 30 second timeout
                else:
                    # Use the current loop if it's not running
                    task_result = loop.run_until_complete(
                        create_task_from_llm(task_data, user_id)
                    )
            except RuntimeError:
                # If we're in a thread that doesn't have an event loop
                task_result = asyncio.run(create_task_from_llm(task_data, user_id))
            
            if "error" in task_result:
                return f"Error: {task_result['error']}"
            
            return f"✅ Task '{task_result['title']}' has been created with {task_result['priority']} priority" + (f" and deadline {task_result['deadline']}" if task_result['deadline'] != "No deadline" else ".")
        except Exception as e:
            logging.error(f"Error in synchronous task creation: {str(e)}")
            return f"Error creating task: {str(e)}"

    # Return a regular Tool with a synchronous function
    return Tool(
        name="create_task",
        func=create_task_sync,
        description="""Create a task for the user. The format should be: 
        create_task: <title> | <description> | <priority> | <deadline>
        
        Examples:
        create_task: Buy groceries | Get milk, eggs and bread | high | 2025-05-20
        create_task: Call doctor | Schedule annual checkup | medium | 2025-05-25
        create_task: Finish report | | low | 
        
        Only <title> is required. Other fields are optional and can be left empty."""
    )
    
async def _handle_create_task(query: str, user_id: str) -> str:
    """Handle a create task request with a query string"""
    try:
        # Parse the query string
        parts = query.split("|")
        title = parts[0].strip()
        description = parts[1].strip() if len(parts) > 1 else None
        priority = parts[2].strip() if len(parts) > 2 and parts[2].strip() else "medium"
        deadline = parts[3].strip() if len(parts) > 3 and parts[3].strip() else None
        
        # Validate priority
        if priority not in ["low", "medium", "high"]:
            priority = "medium"
        
        # Create task data
        task_data = {
            "title": title,
            "description": description,
            "priority": priority,
            "deadline": deadline
        }
        
        result = await create_task_from_llm(task_data, user_id)
        if "error" in result:
            return f"Error: {result['error']}"
        return f"✅ {result['message']}. Task '{result['title']}' has been created with {result['priority']} priority" + (f" and deadline {result['deadline']}" if result['deadline'] != "No deadline" else ".")
    except Exception as e:
        logging.error(f"Error handling task creation: {str(e)}")
        return f"Error creating task: {str(e)}"

# Chat API endpoint
@api_router.post("/chat", response_model=ChatResponse)
async def chat_with_llm(chat_message: ChatMessageInput, background_tasks: BackgroundTasks, provider: Optional[str] = None):
    """Chat with an AI assistant"""
    try:
        # Verify user exists
        user = await db.users.find_one({"id": chat_message.user_id})
        if not user:
            logging.error(f"User not found with ID: {chat_message.user_id}")
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if OpenAI API is available
        if not OPENAI_API_KEY:
            return {"response": "Sorry, I'm not able to process chat requests right now. The AI model is unavailable."}

        # Save the user message to chat history
        user_message = {"role": "user", "content": chat_message.message, "timestamp": datetime.utcnow()}
        
        # Get or create chat history from database
        db_chat_history = await db.chat_history.find_one({"user_id": chat_message.user_id})
        if not db_chat_history:
            db_chat_history = {
                "id": str(uuid.uuid4()),
                "user_id": chat_message.user_id,
                "messages": [],
                "updated_at": datetime.utcnow()
            }
        
        if "messages" not in db_chat_history:
            db_chat_history["messages"] = []
            
        db_chat_history["messages"].append(user_message)
        db_chat_history["updated_at"] = datetime.utcnow()
        
        # Check if this is a task creation request
        is_task_request = detect_task_creation_intent(chat_message.message)
        
        # Get chat history for context (last 10 messages)
        history_messages = db_chat_history["messages"][-10:] if len(db_chat_history["messages"]) > 0 else []
        
        messages = [
            {"role": "system", "content": """You are a helpful assistant for a productivity app called GoodVibes. 
            Your goal is to help users be more productive, organized, and motivated.
            
            If the user is asking you to create a task, identify the main task and its subtasks, priority, and deadline.
            
            For task creation:
            1. Parse the user's request to identify the main task, subtasks, priority, and deadline
            2. Respond conversationally, but include a structured task preview inside a code block with this exact format:
            ```task-preview
            {"title": "Main task title", "priority": "low|medium|high", "deadline": "ISO date string or null", "subtasks": [{"description": "Subtask 1", "deadline": "ISO date string or null"}, ...]}
            ```
            3. Ask clarifying questions if task information is ambiguous or incomplete
            
            If they ask for productivity advice or help with other matters, respond helpfully without including a task preview.
            
            Use a warm, supportive, and empathetic tone throughout."""}
        ]
        
        # Add history
        for msg in history_messages:
            messages.append({"role": msg["role"], "content": msg["content"]})
        
        # Add current message
        messages.append({"role": "user", "content": chat_message.message})
        
        # Initialize the appropriate LLM based on provider
        if not OPENAI_API_KEY:
            logging.error("OpenAI API key not found in environment variables")
            return {"response": "OpenAI chat functionality is unavailable. Please set up your OPENAI_API_KEY."}
        
        logging.info("Calling OpenAI Chat API")
        try:
            response = await get_openai_chat_response(messages)
            ai_response = response["choices"][0]["message"]["content"]
            logging.info("OpenAI response received successfully")
        except Exception as e:
            logging.error(f"OpenAI API error: {str(e)}")
            return {"response": "I encountered an error while processing your request. Please try again."}
        
        # Save the assistant's response to chat history
        ai_message = {"role": "assistant", "content": ai_response, "timestamp": datetime.utcnow()}
        db_chat_history["messages"].append(ai_message)
        db_chat_history["updated_at"] = datetime.utcnow()
        
        # Save chat history to database
        await db.chat_history.replace_one(
            {"user_id": chat_message.user_id}, 
            db_chat_history, 
            upsert=True
        )
        
        # Process pending tasks if needed
        background_tasks.add_task(process_pending_tasks)
        
        return {"response": ai_response}
    except Exception as e:
        logging.error(f"Error in chat endpoint: {str(e)}")
        return {"response": "I'm sorry, I encountered an error. Please try again later."}

def detect_task_creation_intent(message: str) -> bool:
    """Detect if the user message likely contains a task creation intent"""
    task_keywords = [
        "create a task", "add a task", "new task", "make a task",
        "schedule", "remind me", "to-do", "todo", "to do",
        "need to", "have to", "must", "should", "plan", "organize",
        "set up", "arrange", "prepare"
    ]
    
    message_lower = message.lower()
    
    # Check for common task creation phrases
    for keyword in task_keywords:
        if keyword in message_lower:
            return True
    
    # Check for imperative sentences or action items
    sentences = message.split('.')
    for sentence in sentences:
        words = sentence.strip().split()
        if words and words[0].endswith('ing'):
            return True
    
    return False


@app.post("/api/process-task")
async def process_task(req: Request):
    try:
        data = await req.json()
        text = data.get("text", "")
        user_id = data.get("user_id")
        task_data = data.get("task_data")  # New parameter for structured task data
        
        # If we have structured task data, use it directly
        if task_data:
            task_title = task_data.get("title", "")
            task_description = task_data.get("description", "")
            task_priority = task_data.get("priority", "medium")
            task_deadline_str = task_data.get("deadline")
            task_subtasks = task_data.get("subtasks", [])
            
            # Create the task
            task = Task(
                user_id=user_id,
                title=task_title,
                description=task_description or "",
                priority=task_priority,
                deadline=task_deadline_str,
                completed=False
            )
            
            # Process subtasks if available
            for subtask_item in task_subtasks:
                subtask = Subtask(
                    task_id=task.id,
                    description=subtask_item.get("description", ""),
                    priority=subtask_item.get("priority", "medium"),
                    deadline=subtask_item.get("deadline")
                )
                task.subtasks.append(subtask)
                
            # Generate emotional support message
            task.emotional_support = await generate_emotional_support(task_title)
            
            # Save the task to MongoDB
            task_dict = task.dict()
            await db.tasks.insert_one(task_dict)
            return task
        
        # Otherwise, fall back to the AI processing flow
        
        if not OPENAI_API_KEY:
            return JSONResponse(
                status_code=503,
                content={"error": "OpenAI API key not configured"}
            )

        # Extract task information using OpenAI
        messages = [
            {"role": "system", "content": """You are a helpful AI assistant for a productivity app. 
            Your job is to extract structured task information from user input.
            Response must be valid JSON with the following structure:
            {
                "title": "Main task title",
                "description": "Detailed description (optional)",
                "priority": "low|medium|high",
                "deadline": "ISO date string or null",
                "subtasks": [
                    {
                        "description": "Subtask description",
                        "priority": "low|medium|high",
                        "deadline": "ISO date string or null"
                    }
                ]
            }
            
            Extract dates smartly - if user says "tomorrow", convert to actual date.
            If no specific priority is mentioned, use "medium" as default.
            If no deadline is specified, set to null.
            Parse the input carefully and create a logical task structure."""},
            {"role": "user", "content": text}
        ]

        response = await get_openai_chat_response(messages)
        task_info_str = response["choices"][0]["message"]["content"]
        
        # Parse JSON response
        try:
            task_info = json.loads(task_info_str)
        except json.JSONDecodeError:
            # If response isn't valid JSON, try to extract JSON from the response
            match = re.search(r'```json(.*?)```', task_info_str, re.DOTALL)
            if match:
                try:
                    task_info = json.loads(match.group(1).strip())
                except:
                    return JSONResponse(
                        status_code=400,
                        content={"error": "Failed to parse AI response as JSON"}
                    )
            else:
                return JSONResponse(
                    status_code=400,
                    content={"error": "Failed to parse AI response as JSON"}
                )
        
        task_title = task_info.get("title", "")
        task_description = task_info.get("description", "")
        task_priority = task_info.get("priority", "medium")
        task_deadline_str = task_info.get("deadline")
        task_subtasks = task_info.get("subtasks", [])
        
        # Create the task
        task = Task(
            user_id=user_id,
            title=task_title,
            description=task_description,
            priority=task_priority,
            deadline=task_deadline_str,
            completed=False
        )
        
        # Process subtasks
        for subtask_item in task_subtasks:
            subtask = Subtask(
                task_id=task.id,
                description=subtask_item.get("description", ""),
                priority=subtask_item.get("priority", "medium"),
                deadline=subtask_item.get("deadline")
            )
            task.subtasks.append(subtask)
            
        # Generate emotional support message
        task.emotional_support = await generate_emotional_support(task_title)
        
        # Save the task to MongoDB
        task_dict = task.dict()
        await db.tasks.insert_one(task_dict)
        return task
    except Exception as e:
        logging.error(f"Error processing task: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "AI Task Assistant API"}


# Include the router in the main app
app.include_router(api_router)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

def get_chat_history(user_id, limit=10):
    """Get chat history for a user with specified limit"""
    user_messages = [msg for msg in chat_messages if msg.user_id == user_id]
    return user_messages[-limit:] if limit > 0 else user_messages

async def get_openai_chat_response(messages):
    """
    Get a response from OpenAI chat API
    
    Args:
        messages: List of message objects with role and content keys
    
    Returns:
        Response from OpenAI API
    """
    if not OPENAI_API_KEY:
        logging.error("OpenAI API key is not configured")
        raise ValueError("OpenAI API key is not configured")

    try:
        logging.info("Calling OpenAI Chat API")
        # Initialize OpenAI Chat model
        chat_model = ChatOpenAI(
            model="gpt-4o",  # Use appropriate model
            temperature=0.7,
            max_tokens=1024,
            openai_api_key=OPENAI_API_KEY
        )
        
        # Create message objects for the LangChain API
        message_objs = []
        for msg in messages:
            if msg["role"] == "system":
                message_objs.append(SystemMessage(content=msg["content"]))
            elif msg["role"] == "user":
                message_objs.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                message_objs.append(AIMessage(content=msg["content"]))
        
        # Call the AI model and get response content
        response = await chat_model.ainvoke(message_objs)
        response_content = response.content if hasattr(response, 'content') else str(response)
        
        # Create a response object that mimics the OpenAI API structure
        return {"choices": [{"message": {"content": response_content}}]}
    except Exception as e:
        logging.error(f"Error calling OpenAI Chat API: {str(e)}")
        raise

# Add a new endpoint for chat history
@api_router.get("/chat/history/{user_id}")
async def get_chat_history_for_user(user_id: str):
    """Get chat history for a specific user"""
    try:
        # Retrieve chat history from database
        db_chat_history = await db.chat_history.find_one({"user_id": user_id})
        if not db_chat_history:
            # Return empty history if none exists
            return {"user_id": user_id, "messages": []}
        
        # Return the chat history
        return {
            "user_id": user_id, 
            "messages": db_chat_history.get("messages", [])
        }
    except Exception as e:
        logging.error(f"Error retrieving chat history: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve chat history: {str(e)}"
        )
