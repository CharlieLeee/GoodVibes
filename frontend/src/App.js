import { useState, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import "./App.css";

// API configuration
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Helper function to format dates
const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

// Navigation component
const Navigation = ({ activeTab, setActiveTab, userId }) => {
  return (
    <nav className="bg-indigo-600 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-xl font-bold">AI Task Assistant</h1>
        {userId && (
          <div className="flex space-x-4">
            <button
              className={`px-3 py-1 rounded-md ${
                activeTab === "tasks" ? "bg-indigo-800" : "hover:bg-indigo-700"
              }`}
              onClick={() => setActiveTab("tasks")}
            >
              Tasks
            </button>
            <button
              className={`px-3 py-1 rounded-md ${
                activeTab === "calendar" ? "bg-indigo-800" : "hover:bg-indigo-700"
              }`}
              onClick={() => setActiveTab("calendar")}
            >
              Calendar
            </button>
            <button
              className={`px-3 py-1 rounded-md ${
                activeTab === "timeline" ? "bg-indigo-800" : "hover:bg-indigo-700"
              }`}
              onClick={() => setActiveTab("timeline")}
            >
              Timeline
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

// Login/User Registration component
const Login = ({ setUserId }) => {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!username.trim()) {
      setError("Username is required");
      return;
    }
    
    setLoading(true);
    try {
      // First check if the user already exists by username
      try {
        const checkResponse = await axios.get(`${API}/users/name/${username}`);
        if (checkResponse.data) {
          // If user exists, use their ID
          localStorage.setItem("userId", checkResponse.data.id);
          localStorage.setItem("username", checkResponse.data.username);
          setUserId(checkResponse.data.id);
          return;
        }
      } catch (err) {
        // User not found, create a new one (this is expected)
        console.log("User not found, creating a new account");
      }
      
      // Create a new user
      const response = await axios.post(`${API}/users`, { username });
      localStorage.setItem("userId", response.data.id);
      localStorage.setItem("username", response.data.username);
      setUserId(response.data.id);
    } catch (error) {
      console.error("Login error:", error);
      setError("Failed to create user. Please try again. If the problem persists, try using a default account by clicking the button below.");
    } finally {
      setLoading(false);
    }
  };

  const useDefaultAccount = () => {
    // Use the default account
    localStorage.setItem("userId", "default-user-id");
    localStorage.setItem("username", "default-user");
    setUserId("default-user-id");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-center text-indigo-600 mb-6">
          Welcome to AI Task Assistant
        </h2>
        <p className="text-gray-600 mb-6 text-center">
          Your intelligent companion for productivity and emotional support.
        </p>
        
        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label htmlFor="username" className="block text-gray-700 mb-2">
              Enter your name to continue
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Your name"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-md hover:bg-indigo-700 transition duration-300 disabled:bg-indigo-400"
          >
            {loading ? "Creating account..." : "Get Started"}
          </button>
        </form>
        
        <div className="mt-4">
          <button
            onClick={useDefaultAccount}
            className="w-full bg-gray-200 text-gray-700 py-3 rounded-md hover:bg-gray-300 transition duration-300"
          >
            Use Default Account
          </button>
        </div>
        
        <div className="mt-6 text-sm text-center text-gray-500">
          No registration required. Just enter your name to get started!
        </div>
      </div>
    </div>
  );
};

// Task Input component
const TaskInput = ({ userId, setTasks }) => {
  const [taskText, setTaskText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!taskText.trim()) {
      setError("Please enter a task");
      return;
    }
    
    setProcessing(true);
    setError("");
    
    try {
      const response = await axios.post(`${API}/process-task`, {
        text: taskText,
        user_id: userId
      });
      
      // Add new task to the list
      setTasks(prevTasks => [response.data, ...prevTasks]);
      
      // Clear input
      setTaskText("");
    } catch (err) {
      console.error("Error processing task:", err);
      setError("Failed to process task. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        What would you like to accomplish?
      </h2>
      
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <textarea
          value={taskText}
          onChange={(e) => setTaskText(e.target.value)}
          placeholder="Describe your task in natural language (e.g., 'Create a presentation for the marketing team by next Friday')"
          className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
          rows={3}
        />
        <button
          type="submit"
          disabled={processing}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition duration-300 disabled:bg-indigo-400"
        >
          {processing ? "Analyzing Task..." : "Create Task"}
        </button>
      </form>
      
      <p className="text-sm text-gray-500 mt-3">
        Tip: Be specific about deadlines and details. Our AI will break it down into manageable steps.
      </p>
    </div>
  );
};

// Task Card component for displaying individual tasks
const TaskCard = ({ task, updateTask, deleteTask, refreshTasks }) => {
  // Using a ref to store the task ID to track when the component receives a different task
  const taskIdRef = useRef(task.id);
  const [expanded, setExpanded] = useState(false);
  const [emotionalSupport, setEmotionalSupport] = useState(task.emotional_support || "");
  const [loadingSupport, setLoadingSupport] = useState(false);
  const [editingDate, setEditingDate] = useState(false);
  const [newDueDate, setNewDueDate] = useState(
    task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : ""
  );
  
  // When the task prop changes, update the due date state but preserve expanded state
  useEffect(() => {
    if (task.deadline) {
      setNewDueDate(new Date(task.deadline).toISOString().split('T')[0]);
    }
    if (task.emotional_support) {
      setEmotionalSupport(task.emotional_support);
    }
    // Only reset expanded state if it's a completely different task
    if (taskIdRef.current !== task.id) {
      setExpanded(false);
      taskIdRef.current = task.id;
    }
  }, [task]);

  const toggleComplete = async () => {
    try {
      await updateTask(task.id, { completed: !task.completed });
    } catch (err) {
      console.error("Error toggling task completion:", err);
    }
  };

  const toggleSubtaskComplete = async (subtaskId, currentStatus) => {
    try {
      const response = await axios.put(`${API}/tasks/${task.id}/subtasks/${subtaskId}`, {
        completed: !currentStatus
      });
      
      // Use the task data directly from the response to update the UI
      // This will maintain the expanded state since we're not refreshing
      updateTask(task.id, { ...response.data });
    } catch (err) {
      console.error("Error toggling subtask completion:", err);
    }
  };

  const getNewEmotionalSupport = async () => {
    setLoadingSupport(true);
    try {
      const response = await axios.post(`${API}/emotional-support`, task.id);
      setEmotionalSupport(response.data.message);
    } catch (err) {
      console.error("Error getting emotional support:", err);
    } finally {
      setLoadingSupport(false);
    }
  };
  
  const updateDueDate = async () => {
    if (!newDueDate) return;
    
    try {
      // Convert date string to ISO format with time
      const dateObj = new Date(newDueDate);
      dateObj.setHours(23, 59, 59);
      
      await updateTask(task.id, { 
        deadline: dateObj.toISOString() 
      });
      setEditingDate(false);
      // Removed refreshTasks() to prevent unnecessary reloads and state loss
    } catch (err) {
      console.error("Error updating due date:", err);
    }
  };

  // Calculate progress percentage
  const completedSubtasks = task.subtasks.filter(st => st.completed).length;
  const totalSubtasks = task.subtasks.length;
  const progressPercent = totalSubtasks > 0 
    ? Math.round((completedSubtasks / totalSubtasks) * 100) 
    : 0;

  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden mb-4 transition-all duration-300 ${task.completed ? 'border-l-4 border-green-500' : ''}`}>
      <div className="p-5">
        <div className="flex justify-between items-start">
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              checked={task.completed}
              onChange={toggleComplete}
              className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mt-1"
            />
            <div>
              <h3 className={`text-lg font-medium ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                {task.title}
              </h3>
              {editingDate ? (
                <div className="mt-1 flex items-center space-x-2">
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                  />
                  <button 
                    onClick={updateDueDate}
                    className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700"
                  >
                    Save
                  </button>
                  <button 
                    onClick={() => setEditingDate(false)}
                    className="text-xs bg-gray-200 text-gray-800 px-2 py-1 rounded hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center">
                  <p className={`text-sm ${new Date(task.deadline) < new Date() && !task.completed ? 'text-red-600' : 'text-gray-500'}`}>
                    {task.deadline ? `Due: ${formatDate(task.deadline)}` : "No due date"}
                  </p>
                  <button 
                    onClick={() => setEditingDate(true)}
                    className="ml-2 text-xs text-indigo-600 hover:text-indigo-800"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-indigo-600 hover:text-indigo-800"
            >
              {expanded ? 'Collapse' : 'Details'}
            </button>
            <button
              onClick={() => deleteTask(task.id)}
              className="text-red-600 hover:text-red-800"
            >
              Delete
            </button>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-3">
          <div 
            className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {completedSubtasks} of {totalSubtasks} subtasks completed
        </div>
      </div>
      
      {expanded && (
        <div className="px-5 pb-5">
          {task.description && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-1">Description:</h4>
              <p className="text-gray-600">{task.description}</p>
            </div>
          )}
          
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Subtasks:</h4>
            <ul className="space-y-2">
              {task.subtasks.map((subtask) => (
                <li key={subtask.id} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={subtask.completed}
                    onChange={() => toggleSubtaskComplete(subtask.id, subtask.completed)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className={`text-sm ${subtask.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                    {subtask.description}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="bg-indigo-50 p-3 rounded-md">
            <div className="flex justify-between items-center mb-1">
              <h4 className="text-sm font-medium text-indigo-800">Emotional Support:</h4>
              <button
                onClick={getNewEmotionalSupport}
                disabled={loadingSupport}
                className="text-xs text-indigo-600 hover:text-indigo-800"
              >
                {loadingSupport ? "Loading..." : "Get fresh encouragement"}
              </button>
            </div>
            <p className="text-sm text-indigo-700">{emotionalSupport}</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Tasks List component
const TasksList = ({ userId }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all"); // all, active, completed

  useEffect(() => {
    fetchTasks();
  }, [userId]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/tasks/user/${userId}`);
      setTasks(response.data);
      setError("");
    } catch (err) {
      console.error("Error fetching tasks:", err);
      setError("Failed to load tasks. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  };

  const updateTask = async (taskId, updateData) => {
    try {
      // If updateData has an 'id' property, it's a complete task object from a subtask update
      if (updateData.id) {
        // Just update the tasks array with the full object
        setTasks(tasks.map(task => task.id === taskId ? updateData : task));
      } else {
        // It's a partial update, so make the API call
        const response = await axios.put(`${API}/tasks/${taskId}`, updateData);
        setTasks(tasks.map(task => task.id === taskId ? response.data : task));
      }
    } catch (err) {
      console.error("Error updating task:", err);
    }
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    
    try {
      await axios.delete(`${API}/tasks/${taskId}`);
      setTasks(tasks.filter(task => task.id !== taskId));
    } catch (err) {
      console.error("Error deleting task:", err);
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === "all") return true;
    if (filter === "active") return !task.completed;
    if (filter === "completed") return task.completed;
    return true;
  });

  return (
    <div>
      <TaskInput userId={userId} setTasks={setTasks} />
      
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4">
          {error}
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Your Tasks</h2>
          <div className="flex space-x-2">
            <button
              className={`px-3 py-1 text-sm rounded-md ${
                filter === "all" ? "bg-indigo-100 text-indigo-800" : "text-gray-600 hover:bg-gray-100"
              }`}
              onClick={() => setFilter("all")}
            >
              All
            </button>
            <button
              className={`px-3 py-1 text-sm rounded-md ${
                filter === "active" ? "bg-indigo-100 text-indigo-800" : "text-gray-600 hover:bg-gray-100"
              }`}
              onClick={() => setFilter("active")}
            >
              Active
            </button>
            <button
              className={`px-3 py-1 text-sm rounded-md ${
                filter === "completed" ? "bg-indigo-100 text-indigo-800" : "text-gray-600 hover:bg-gray-100"
              }`}
              onClick={() => setFilter("completed")}
            >
              Completed
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className="text-center py-10">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
            <p className="mt-2 text-gray-600">Loading tasks...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            {filter === "all"
              ? "You don't have any tasks yet. Start by creating a new task above!"
              : filter === "active"
              ? "You don't have any active tasks."
              : "You don't have any completed tasks."}
          </div>
        ) : (
          <div>
            {filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                updateTask={updateTask}
                deleteTask={deleteTask}
                refreshTasks={fetchTasks}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Calendar View component
const CalendarView = ({ userId }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Helper to get days in month
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };
  
  // Get day of week (0 = Sunday, 6 = Saturday)
  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };
  
  useEffect(() => {
    fetchTasks();
  }, [userId, currentDate]);
  
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/tasks/user/${userId}`);
      setTasks(response.data);
    } catch (err) {
      console.error("Error fetching tasks:", err);
    } finally {
      setLoading(false);
    }
  };
  
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  
  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };
  
  // Calendar generation
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfMonth = getFirstDayOfMonth(year, month);
  
  // Create calendar days array
  const days = [];
  // Add empty cells for days before the 1st of the month
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  // Add days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }
  
  // Group tasks by date
  const tasksByDate = {};
  tasks.forEach(task => {
    if (task.deadline) {
      const taskDate = new Date(task.deadline);
      const taskDateStr = taskDate.toDateString();
      if (!tasksByDate[taskDateStr]) {
        tasksByDate[taskDateStr] = [];
      }
      tasksByDate[taskDateStr].push(task);
    }
  });

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Calendar View</h2>
        <div className="flex items-center space-x-4">
          <button
            onClick={goToPreviousMonth}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            &lt;
          </button>
          <h3 className="text-lg font-medium">
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h3>
          <button
            onClick={goToNextMonth}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            &gt;
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="text-center py-10">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
          <p className="mt-2 text-gray-600">Loading calendar...</p>
        </div>
      ) : (
        <div>
          {/* Calendar header */}
          <div className="grid grid-cols-7 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="h-24 bg-gray-50 rounded"></div>;
              }
              
              const date = new Date(year, month, day);
              const isToday = date.toDateString() === new Date().toDateString();
              const dateStr = date.toDateString();
              const dayTasks = tasksByDate[dateStr] || [];
              
              return (
                <div 
                  key={`day-${day}`}
                  className={`h-24 border rounded p-1 relative overflow-hidden ${
                    isToday ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-gray-200'
                  }`}
                >
                  <div className={`text-right font-medium ${isToday ? 'text-indigo-600' : 'text-gray-700'}`}>
                    {day}
                  </div>
                  <div className="mt-1 overflow-y-auto max-h-16">
                    {dayTasks.map(task => (
                      <div 
                        key={task.id}
                        className={`text-xs p-1 mb-1 truncate rounded ${
                          task.completed ? 'bg-green-100 text-green-800' : 'bg-indigo-100 text-indigo-800'
                        }`}
                        title={task.title}
                      >
                        {task.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// Timeline View component
const TimelineView = ({ userId }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchTasks();
  }, [userId]);
  
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/tasks/user/${userId}`);
      // Sort tasks by deadline
      const sortedTasks = response.data
        .filter(task => task.deadline) // Only include tasks with deadlines
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
      setTasks(sortedTasks);
    } catch (err) {
      console.error("Error fetching tasks:", err);
    } finally {
      setLoading(false);
    }
  };
  
  // Group tasks by week
  const tasksByWeek = {};
  const today = new Date();
  
  // Get week number
  const getWeekNumber = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };
  
  // Group tasks by week
  tasks.forEach(task => {
    if (task.deadline) {
      const taskDate = new Date(task.deadline);
      const weekNum = getWeekNumber(taskDate);
      const weekYear = taskDate.getFullYear();
      const weekKey = `${weekYear}-${weekNum}`;
      
      if (!tasksByWeek[weekKey]) {
        // Calculate start and end of week
        const weekStart = new Date(taskDate);
        weekStart.setDate(taskDate.getDate() - taskDate.getDay());
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        tasksByWeek[weekKey] = {
          weekNum,
          weekYear,
          weekStart,
          weekEnd,
          tasks: []
        };
      }
      
      tasksByWeek[weekKey].tasks.push(task);
    }
  });
  
  // Convert to array and sort by date
  const sortedWeeks = Object.values(tasksByWeek).sort((a, b) => 
    a.weekStart - b.weekStart
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Timeline View</h2>
      
      {loading ? (
        <div className="text-center py-10">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
          <p className="mt-2 text-gray-600">Loading timeline...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          You don't have any tasks with deadlines. Create tasks with deadlines to see them on the timeline.
        </div>
      ) : (
        <div className="space-y-6">
          {sortedWeeks.map(week => (
            <div key={`${week.weekYear}-${week.weekNum}`} className="border-l-2 border-indigo-200 pl-4">
              <div className="flex items-center mb-2">
                <div className="h-4 w-4 rounded-full bg-indigo-500 -ml-6"></div>
                <h3 className="text-md font-medium text-gray-800 ml-3">
                  {`${formatDate(week.weekStart)} - ${formatDate(week.weekEnd)}`}
                </h3>
              </div>
              
              <div className="space-y-3 ml-2">
                {week.tasks.map(task => {
                  const taskDate = new Date(task.deadline);
                  const isPast = taskDate < today;
                  const isToday = taskDate.toDateString() === today.toDateString();
                  
                  return (
                    <div 
                      key={task.id}
                      className={`p-3 rounded-md ${
                        task.completed 
                          ? 'bg-green-50 border border-green-200' 
                          : isPast 
                            ? 'bg-red-50 border border-red-200'
                            : isToday
                              ? 'bg-yellow-50 border border-yellow-200'
                              : 'bg-indigo-50 border border-indigo-200'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className={`font-medium ${task.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                            {task.title}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            Due: {formatDate(task.deadline)}
                          </p>
                        </div>
                        <div className={`text-xs font-medium px-2 py-1 rounded-full ${
                          task.completed 
                            ? 'bg-green-200 text-green-800' 
                            : isPast
                              ? 'bg-red-200 text-red-800'
                              : isToday
                                ? 'bg-yellow-200 text-yellow-800'
                                : 'bg-indigo-200 text-indigo-800'
                        }`}>
                          {task.completed 
                            ? 'Completed' 
                            : isPast
                              ? 'Overdue'
                              : isToday
                                ? 'Today'
                                : `${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority`}
                        </div>
                      </div>
                      
                      {task.subtasks && task.subtasks.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-gray-600 mb-1">
                            {task.subtasks.filter(st => st.completed).length} of {task.subtasks.length} subtasks completed
                          </p>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div 
                              className={`h-1.5 rounded-full ${task.completed ? 'bg-green-500' : 'bg-indigo-500'}`}
                              style={{ width: `${(task.subtasks.filter(st => st.completed).length / task.subtasks.length) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Main Dashboard component
const Dashboard = ({ userId }) => {
  const [activeTab, setActiveTab] = useState("tasks");
  
  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} userId={userId} />
      
      <div className="container mx-auto px-4 py-6">
        {activeTab === "tasks" && <TasksList userId={userId} />}
        {activeTab === "calendar" && <CalendarView userId={userId} />}
        {activeTab === "timeline" && <TimelineView userId={userId} />}
      </div>
    </div>
  );
};

// Main App component
function App() {
  const [userId, setUserId] = useState(null);
  
  useEffect(() => {
    // Check if user is already logged in
    const storedUserId = localStorage.getItem("userId");
    
    // For testing: reset to a known valid user ID if you're having issues
    // Uncomment the next line to force a specific user ID
    // localStorage.setItem("userId", "default-user-id");
    
    if (storedUserId) {
      setUserId(storedUserId);
    }
  }, []);

  return (
    <div className="App">
      <BrowserRouter>
        {userId ? (
          <Dashboard userId={userId} />
        ) : (
          <Login setUserId={setUserId} />
        )}
      </BrowserRouter>
    </div>
  );
}

export default App;
