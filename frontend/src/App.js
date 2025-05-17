import { useState, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import "./App.css";
import Statistics from './components/Statistics';

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
            <button
              className={`px-3 py-1 rounded-md ${
                activeTab === "statistics" ? "bg-indigo-800" : "hover:bg-indigo-700"
              }`}
              onClick={() => setActiveTab("statistics")}
            >
              Statistics
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

// Task Input component
const TaskInput = ({ userId, setTasks }) => {
  const [taskText, setTaskText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const hoverTimeoutRef = useRef(null);
  const panelRef = useRef(null);
  const recognition = useRef(null);

  useEffect(() => {
    // Initialize speech recognition
    if (window.webkitSpeechRecognition) {
      recognition.current = new window.webkitSpeechRecognition();
      recognition.current.continuous = true;
      recognition.current.interimResults = true;

      recognition.current.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
            setTaskText(prevText => prevText + finalTranscript);
            setInterimTranscript('');
          } else {
            interimTranscript += event.results[i][0].transcript;
            setInterimTranscript(interimTranscript);
          }
        }
      };

      recognition.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setError("Failed to recognize speech. Please try again.");
        setInterimTranscript('');
      };

      recognition.current.onend = () => {
        setIsListening(false);
      };
    }

    // Add mouse move event listener
    const handleMouseMove = (e) => {
      const windowWidth = window.innerWidth;
      const triggerDistance = 100; // Distance from the right edge to trigger hover
      
      if (windowWidth - e.clientX <= triggerDistance) {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        setIsHovering(true);
        setIsExpanded(true);
      } else if (!panelRef.current?.contains(e.target)) {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = setTimeout(() => {
          setIsHovering(false);
          setIsExpanded(false);
        }, 300); // Delay before hiding
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  const toggleListening = () => {
    if (!recognition.current) {
      setError("Speech recognition is not supported in your browser.");
      return;
    }

    try {
      if (isListening) {
        recognition.current.stop();
        setInterimTranscript('');
        setIsListening(false);
      } else {
        setError("");
        setInterimTranscript('');
        recognition.current.start();
        setIsListening(true);
      }
    } catch (error) {
      console.error('Speech recognition error:', error);
      setIsListening(false);
      setError("Failed to toggle voice recording. Please try again.");
      setInterimTranscript('');
    }
  };

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
      
      setTasks(prevTasks => [response.data, ...prevTasks]);
      setTaskText("");
      setInterimTranscript('');
      setIsExpanded(false);
      setIsHovering(false);
    } catch (err) {
      console.error("Error processing task:", err);
      setError("Failed to process task. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      {/* Persistent visual indicator */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 flex items-center">
        <div 
          className={`bg-gradient-to-l from-indigo-600/20 to-transparent w-1.5 h-24 rounded-l transition-all duration-300 ${
            isExpanded ? 'opacity-0' : 'opacity-100'
          }`}
        />
        <div 
          className={`absolute right-2 transform -translate-y-1/2 bg-white/90 backdrop-blur-sm shadow-lg rounded-full p-2 transition-all duration-300 ${
            isExpanded ? 'opacity-0' : 'opacity-100 hover:scale-110'
          }`}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5 text-indigo-600" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 4v16m8-8H4" 
            />
          </svg>
        </div>
      </div>

      {/* Main panel */}
      <div 
        ref={panelRef}
        className={`fixed right-0 top-0 h-full w-96 bg-white shadow-2xl transform transition-all duration-300 ease-in-out ${
          isExpanded ? 'translate-x-0' : 'translate-x-full'
        }`}
        onMouseEnter={() => {
          if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
          setIsHovering(true);
          setIsExpanded(true);
        }}
      >
        <div className={`h-full overflow-y-auto transition-all duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
          <div className="p-8">
            <div className="flex items-center space-x-4 mb-8">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-3 rounded-xl shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Create Task</h2>
            </div>
            
            {error && (
              <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg animate-fade-in">
                <div className="flex items-start">
                  <svg className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-red-700">{error}</span>
                </div>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <label htmlFor="taskInput" className="block text-sm font-medium text-gray-700">
                  What would you like to accomplish?
                </label>
                <div className="relative">
                  <textarea
                    id="taskInput"
                    value={taskText}
                    onChange={(e) => setTaskText(e.target.value)}
                    placeholder="Describe your task in natural language..."
                    className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow duration-200 shadow-sm hover:shadow-md resize-none"
                    rows={4}
                  />
                  {interimTranscript && (
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-b from-white/80 to-white/95 backdrop-blur-sm text-gray-600 italic border-t rounded-b-xl">
                      {interimTranscript}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={processing}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  {processing ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                      </svg>
                      <span>Create Task</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`p-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center transform hover:scale-[1.02] active:scale-[0.98] ${
                    isListening
                      ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600'
                      : 'bg-white text-indigo-600 border-2 border-indigo-200 hover:border-indigo-300'
                  }`}
                  title={isListening ? 'Stop recording' : 'Start voice input'}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                  </svg>
                </button>
              </div>
            </form>
            
            {isListening && (
              <div className="mt-6 bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100 animate-pulse">
                <div className="flex items-center text-green-700">
                  <div className="relative">
                    <div className="absolute -inset-1 bg-green-500 rounded-full animate-ping opacity-20"></div>
                    <div className="relative h-2 w-2 bg-green-500 rounded-full"></div>
                  </div>
                  <span className="ml-3 text-sm font-medium">Listening... Speak now</span>
                </div>
              </div>
            )}

            <div className="mt-8 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
              <h3 className="text-sm font-semibold text-indigo-800 mb-4 flex items-center">
                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Tips for Better Task Creation
              </h3>
              <ul className="space-y-3 text-sm text-indigo-700">
                <li className="flex items-center">
                  <svg className="h-4 w-4 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  Include specific deadlines (e.g., "by next Friday")
                </li>
                <li className="flex items-center">
                  <svg className="h-4 w-4 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  Specify priority level if important
                </li>
                <li className="flex items-center">
                  <svg className="h-4 w-4 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                  </svg>
                  Add relevant context and details
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
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
            <div className="flex-1">
              <h3 className={`text-lg font-medium ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                {task.title}
              </h3>
              
              {/* Priority and Due Date Display */}
              <div className="flex items-center space-x-3 mt-1 mb-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                  ${task.priority === 'high' ? 'bg-red-100 text-red-800' : 
                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-green-100 text-green-800'}`}>
                  {task.priority ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1) : 'No'} Priority
                </span>
                {editingDate ? (
                  <div className="flex items-center space-x-2">
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
                    <span className={`text-sm ${new Date(task.deadline) < new Date() && !task.completed ? 'text-red-600' : 'text-gray-500'}`}>
                      {task.deadline ? `Due: ${formatDate(task.deadline)}` : "No due date"}
                    </span>
                    <button 
                      onClick={() => setEditingDate(true)}
                      className="ml-2 text-xs text-indigo-600 hover:text-indigo-800"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
              {task.description && (
                <p className="text-sm text-gray-600 mb-2">{task.description}</p>
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
            <ul className="space-y-3">
              {task.subtasks.map((subtask) => (
                <li key={subtask.id} className="flex flex-col space-y-1 bg-gray-50 rounded-lg p-3">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={subtask.completed}
                      onChange={() => toggleSubtaskComplete(subtask.id, subtask.completed)}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mt-1"
                    />
                    <div className="flex-1">
                      <span className={`text-sm ${subtask.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                        {subtask.description}
                      </span>
                      
                      {/* Subtask Priority and Due Date Display */}
                      <div className="flex items-center space-x-2 mt-1">
                        {subtask.priority && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                            ${subtask.priority === 'high' ? 'bg-red-50 text-red-700' : 
                              subtask.priority === 'medium' ? 'bg-yellow-50 text-yellow-700' : 
                              'bg-green-50 text-green-700'}`}>
                            {subtask.priority.charAt(0).toUpperCase() + subtask.priority.slice(1)}
                          </span>
                        )}
                        {subtask.deadline && (
                          <span className={`text-xs ${new Date(subtask.deadline) < new Date() && !subtask.completed ? 'text-red-600' : 'text-gray-500'}`}>
                            Due: {formatDate(subtask.deadline)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
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
      if (updateData.id) {
        setTasks(tasks.map(task => task.id === taskId ? updateData : task));
      } else {
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
  const [view, setView] = useState('month'); // 'month', 'week', or 'day'
  
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

  // Navigation functions
  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(currentDate.getMonth() - 1);
    } else if (view === 'week') {
      newDate.setDate(currentDate.getDate() - 7);
    } else {
      newDate.setDate(currentDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };
  
  const goToNext = () => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(currentDate.getMonth() + 1);
    } else if (view === 'week') {
      newDate.setDate(currentDate.getDate() + 7);
    } else {
      newDate.setDate(currentDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };
  
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

  // Get week dates
  const getWeekDates = (date) => {
    const week = [];
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay());
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      week.push(day);
    }
    return week;
  };

  // Get hours for day view
  const getHourSlots = () => {
    const slots = [];
    for (let i = 0; i < 24; i++) {
      slots.push(i);
    }
    return slots;
  };

  // Format time for day view
  const formatTime = (hour) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  // Render functions for different views
  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfMonth = getFirstDayOfMonth(year, month);
    
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return (
      <div>
        <div className="grid grid-cols-7 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>
        
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
                className={`h-24 border rounded p-1 relative overflow-hidden hover:bg-gray-50 transition-colors duration-200 ${
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
    );
  };

  const renderWeekView = () => {
    const weekDates = getWeekDates(currentDate);
    
    return (
      <div className="overflow-x-auto">
        <div className="grid grid-cols-7 gap-2">
          {weekDates.map((date, index) => {
            const isToday = date.toDateString() === new Date().toDateString();
            const dateStr = date.toDateString();
            const dayTasks = tasksByDate[dateStr] || [];
            
            return (
              <div 
                key={index}
                className={`min-h-[600px] border rounded-lg p-2 ${
                  isToday ? 'bg-indigo-50 border-indigo-300' : 'bg-white'
                }`}
              >
                <div className={`text-center p-2 font-medium ${
                  isToday ? 'text-indigo-600' : 'text-gray-700'
                }`}>
                  <div>{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]}</div>
                  <div className="text-lg">{date.getDate()}</div>
                </div>
                <div className="space-y-2">
                  {dayTasks.map(task => (
                    <div
                      key={task.id}
                      className={`p-2 rounded-md text-sm ${
                        task.completed 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-indigo-100 text-indigo-800'
                      }`}
                    >
                      <div className="font-medium truncate">{task.title}</div>
                      <div className="text-xs mt-1">
                        {new Date(task.deadline).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const hours = getHourSlots();
    const dateStr = currentDate.toDateString();
    const dayTasks = tasksByDate[dateStr] || [];
    
    return (
      <div className="bg-white rounded-lg shadow">
        <div className={`text-center p-4 font-medium ${
          currentDate.toDateString() === new Date().toDateString() 
            ? 'text-indigo-600' 
            : 'text-gray-700'
        }`}>
          <div className="text-xl">
            {currentDate.toLocaleDateString(undefined, { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>
        <div className="divide-y">
          {hours.map(hour => {
            const hourTasks = dayTasks.filter(task => {
              const taskHour = new Date(task.deadline).getHours();
              return taskHour === hour;
            });
            
            return (
              <div key={hour} className="flex min-h-[60px] group hover:bg-gray-50">
                <div className="w-20 py-2 px-4 text-right text-sm text-gray-500">
                  {formatTime(hour)}
                </div>
                <div className="flex-1 py-2 px-4 border-l">
                  {hourTasks.map(task => (
                    <div
                      key={task.id}
                      className={`p-2 rounded-md text-sm mb-2 ${
                        task.completed 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-indigo-100 text-indigo-800'
                      }`}
                    >
                      <div className="font-medium">{task.title}</div>
                      <div className="text-xs mt-1">
                        {new Date(task.deadline).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 space-y-4 sm:space-y-0">
        <h2 className="text-xl font-semibold text-gray-800">Calendar View</h2>
        
        {/* View Selection */}
        <div className="flex items-center space-x-4">
          <div className="bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setView('month')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
                view === 'month' ? 'bg-white text-indigo-600 shadow' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setView('week')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
                view === 'week' ? 'bg-white text-indigo-600 shadow' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setView('day')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
                view === 'day' ? 'bg-white text-indigo-600 shadow' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Day
            </button>
          </div>
        </div>
        
        {/* Navigation Controls */}
        <div className="flex items-center space-x-4">
          <button
            onClick={goToPrevious}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors duration-200"
          >
            &lt;
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors duration-200"
          >
            Today
          </button>
          <button
            onClick={goToNext}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors duration-200"
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
          {view === 'month' && renderMonthView()}
          {view === 'week' && renderWeekView()}
          {view === 'day' && renderDayView()}
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
        {activeTab === "statistics" && <Statistics userId={userId} />}
      </div>
    </div>
  );
};

// Main App component
function App() {
  const [userId, setUserId] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [userError, setUserError] = useState("");
  const [activeTab, setActiveTab] = useState("tasks");
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    const setupDefaultUser = async () => {
      setLoadingUser(true);
      setUserError("");
      const defaultUsername = "default-user";

      try {
        let userIdToSet;
        let usernameToSet;

        try {
          const checkResponse = await axios.get(`${API}/users/name/${defaultUsername}`);
          if (checkResponse.data && checkResponse.data.id) {
            userIdToSet = checkResponse.data.id;
            usernameToSet = checkResponse.data.username;
          } else {
            throw new Error("Default user data not found in response, proceed to create.");
          }
        } catch (err) {
          if (err.response && err.response.status === 404) {
            console.log("Default user not found by name, creating...");
            const createResponse = await axios.post(`${API}/users`, { username: defaultUsername });
            userIdToSet = createResponse.data.id;
            usernameToSet = createResponse.data.username;
          } else {
            throw err;
          }
        }
        
        localStorage.setItem("userId", userIdToSet);
        localStorage.setItem("username", usernameToSet);
        setUserId(userIdToSet);

      } catch (error) {
        console.error("Error setting up default account:", error);
        setUserError("Failed to set up default account. Please ensure the backend is running and refresh the page.");
      } finally {
        setLoadingUser(false);
      }
    };

    const storedUserId = localStorage.getItem("userId");
    if (storedUserId) {
      setUserId(storedUserId);
      setLoadingUser(false);
    } else {
      setupDefaultUser();
    }
  }, []);

  useEffect(() => {
    if (userId) {
      const fetchTasks = async () => {
        try {
          const response = await axios.get(`${API}/tasks/user/${userId}`);
          setTasks(response.data);
        } catch (err) {
          console.error("Error fetching tasks:", err);
        }
      };
      fetchTasks();
    }
  }, [userId]);

  if (loadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-lg text-gray-700">Loading your session...</p>
        </div>
      </div>
    );
  }

  if (userError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Application Error</h2>
          <p className="text-gray-700 mb-2">{userError}</p>
          <p className="text-sm text-gray-500 mb-6">Please ensure the backend server is running and accessible.</p>
          <button
            onClick={() => {
              localStorage.removeItem("userId");
              localStorage.removeItem("username");
              window.location.reload();
            }}
            className="mt-6 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition duration-300"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <h2 className="text-2xl font-bold text-orange-600 mb-4">Initialization Incomplete</h2>
          <p className="text-gray-700 mb-6">Could not initialize user session. Please try refreshing the page.</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition duration-300"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} userId={userId} />
      <main className="container mx-auto p-4">
        {activeTab === "tasks" && <TasksList userId={userId} />}
        {activeTab === "calendar" && <CalendarView userId={userId} />}
        {activeTab === "timeline" && <TimelineView userId={userId} />}
        {activeTab === "statistics" && <Statistics userId={userId} />}
      </main>
      <TaskInput userId={userId} setTasks={setTasks} />
    </div>
  );
}

export default App;
