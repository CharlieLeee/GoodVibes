import { useState, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import "./App.css";
import Statistics from './components/Statistics';

// API configuration
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Simple Markdown renderer function
const renderMarkdown = (text) => {
  if (!text) return "";
  
  // Convert headers
  text = text.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  text = text.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  text = text.replace(/^# (.*$)/gm, '<h1>$1</h1>');
  
  // Convert bold
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Convert italic
  text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Convert inline code
  text = text.replace(/`(.*?)`/g, '<code>$1</code>');
  
  // Convert code blocks
  text = text.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  
  // Convert unordered lists
  text = text.replace(/^\s*[\-\*]\s+(.*$)/gm, '<li>$1</li>');
  text = text.replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>');
  
  // Convert ordered lists
  text = text.replace(/^\s*\d+\.\s+(.*$)/gm, '<li>$1</li>');
  text = text.replace(/(<li>.*<\/li>)/g, '<ol>$1</ol>');
  
  // Convert links
  text = text.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // Convert line breaks
  text = text.replace(/\n/g, '<br />');
  
  return text;
};

// Helper function to format dates
const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  }).format(date);
};

// Helper function to format date for input fields
const formatDateForInput = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// Navigation component
const Navigation = ({ activeTab, setActiveTab, userId }) => {
  return (
    <nav className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg">
      <div className="container mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold flex items-center space-x-2">
            <span className="text-3xl">🌊</span>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-100">GoodVibes</span>
          </h1>
          {userId && (
            <div className="flex space-x-2">
              {['tasks', 'calendar', 'timeline', 'statistics'].map((tab) => (
                <button
                  key={tab}
                  className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                    activeTab === tab 
                      ? 'bg-white/10 text-white shadow-inner' 
                      : 'hover:bg-white/5 text-white/90'
                  }`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

// Task Input component
const TaskInput = ({ userId, setTasks, fetchTasks }) => {
  const [messages, setMessages] = useState([]);
  const [taskText, setTaskText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const panelRef = useRef(null);
  const recognition = useRef(null);
  const messagesEndRef = useRef(null);
  
  // Chat with LLM directly from task input
  const [isChatMode, setIsChatMode] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const chatContainerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Fetch chat history when component mounts
  useEffect(() => {
    const fetchChatHistory = async () => {
      if (userId) {
        try {
          const response = await axios.get(`${API}/chat/history/${userId}`);
          if (response.data && response.data.length > 0) {
            // Convert API format to our frontend format
            const formattedMessages = response.data.map((message, index) => ({
              id: Date.now() + index,
              type: message.role === 'user' ? 'user' : 'ai',
              text: message.content,
              timestamp: new Date(message.timestamp)
            }));
            setChatMessages(formattedMessages);
          }
        } catch (error) {
          console.error("Error fetching chat history:", error);
        }
      }
    };
    
    fetchChatHistory();
  }, [userId]);

  useEffect(() => {
    // Scroll to bottom of chat container when messages change
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const toggleChatMode = () => {
    setIsChatMode(!isChatMode);
    setTaskText(""); // Clear text when switching modes
  };
  
  const handleChatSubmit = async (e) => {
    e.preventDefault();
    
    console.log("Submit pressed. Current taskText:", taskText, "Trimmed length:", taskText.trim().length);
    
    if (!taskText.trim()) {
      return;
    }
    
    // Add user message to chat
    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: taskText,
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setTaskText('');
    setIsLoadingChat(true);
    
    try {
      // Send to backend
      const response = await axios.post(`${API}/chat`, {
        message: userMessage.text,
        user_id: userId
      });
      
      // Add AI response to chat
      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        text: response.data.response,
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, aiMessage]);
      
      // Check if a task was created and refresh tasks if needed
      if (response.data.response.includes("Task") || 
          response.data.response.includes("task") || 
          response.data.response.includes("created") || 
          response.data.response.includes("✅")) {
        // Refresh tasks in the parent component
        await fetchTasks();
      }
    } catch (err) {
      console.error("Error in chat:", err);
      
      // Add error message
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        text: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoadingChat(false);
    }
  };

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
  }, []);

  const toggleListening = () => {
    if (!recognition.current) {
      setError("Speech recognition is not supported in your browser.");
      return;
    }

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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!taskText.trim()) {
      setError("Please enter a task");
      return;
    }

    // Stop recording if active
    if (isListening) {
      recognition.current?.stop();
      setIsListening(false);
      setInterimTranscript('');
    }
    
    // Add user message
    const userMessage = {
      id: Date.now(),
      text: taskText,
      type: 'user'
    };
    setMessages(prev => [...prev, userMessage]);
    
    // Clear input immediately after sending
    setTaskText("");
    setInterimTranscript('');
    
    setProcessing(true);
    setError("");
    
    try {
      const response = await axios.post(`${API}/process-task`, {
        text: taskText,
        user_id: userId
      });
      
      // Add assistant message
      const assistantMessage = {
        id: Date.now() + 1,
        text: `✨ Task created: ${response.data.title}`,
        type: 'assistant',
        task: response.data
      };
      setMessages(prev => [...prev, assistantMessage]);
      
      // Update tasks state immediately with the new task
      setTasks(prevTasks => [response.data, ...prevTasks]);
      
      // Call parent fetchTasks function to ensure parent components are updated
      await fetchTasks();
      
      console.log("Task created successfully:", response.data);
    } catch (err) {
      console.error("Error processing task:", err);
      setError("Failed to process task. Please try again.");
      
      // Add error message
      const errorMessage = {
        id: Date.now() + 1,
        text: "Sorry, I couldn't create that task. Please try again.",
        type: 'error'
      };
      setMessages(prev => [...prev, errorMessage]);
      // Check if the error is due to the AI model not working
      if (err.response && err.response.status === 503) {
        setError("The AI model is currently unavailable. The 'Create Task' function is not available at this time.");
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div 
      className="fixed top-0 right-0 h-screen w-96 flex items-stretch z-40 glass-panel"
      style={{ 
        position: 'fixed',
        top: '73px',
        right: '12px',
        bottom: '12px',
        height: 'calc(100vh - 85px)',
        width: '380px',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '24px'
      }}
    >
      {/* Header */}
      <div className="flex-shrink-0 p-5 rounded-t-2xl glass-header">
        <div className="flex items-center space-x-4 mb-3">
          <div className="p-3 rounded-xl shadow-lg modern-icon">
            {isChatMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              {isChatMode ? "Chat Assistant" : "Create Task"}
            </h2>
            <p className="text-white/70 text-sm font-light">
              {isChatMode ? "Ask questions or get help" : "Create a new task"}
            </p>
          </div>
        </div>
        <div className="flex justify-end">
          <button 
            onClick={toggleChatMode}
            className="flex items-center bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full text-sm text-white transition-all duration-300"
          >
            <span className="mr-2">{isChatMode ? "Switch to Task Mode" : "Switch to Chat Mode"}</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content Area - Different depending on mode */}
      {isChatMode ? (
        <>
          {/* Chat Mode Content */}
          <div 
            className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar chat-container" 
            ref={chatContainerRef}
          >
            {chatMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center px-6 py-8 rounded-2xl empty-state">
                  <div className="mb-5 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-full mx-auto w-20 h-20 flex items-center justify-center shadow-inner">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">Start a conversation</h3>
                  <p className="text-gray-600 mb-4">Chat with your AI assistant to get help with tasks or ask questions</p>
                  <div className="mt-5 space-y-3">
                    <div className="suggestion-item rounded-xl px-4 py-3 flex items-center text-gray-700">
                      <span className="mr-2">☀️</span> How's the weather today?
                    </div>
                    <div className="suggestion-item rounded-xl px-4 py-3 flex items-center text-gray-700">
                      <span className="mr-2">✅</span> Create a shopping list
                    </div>
                    <div className="suggestion-item rounded-xl px-4 py-3 flex items-center text-gray-700">
                      <span className="mr-2">📝</span> Draft an email
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              chatMessages.map(message => (
                <div 
                  key={message.id} 
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
                >
                  {message.type !== 'user' && (
                    <div className="w-8 h-8 rounded-full ai-avatar flex-shrink-0 mr-2 flex items-center justify-center shadow-md">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                      </svg>
                    </div>
                  )}
                  <div 
                    className={`max-w-[75%] shadow-lg ${
                      message.type === 'user' 
                        ? 'chat-message-user bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl rounded-tr-none px-5 py-3.5' 
                        : 'chat-message-ai bg-white rounded-2xl rounded-tl-none px-5 py-3.5 border border-gray-100'
                    }`}
                    style={{
                      boxShadow: message.type === 'user' 
                        ? '0 4px 20px -5px rgba(79, 70, 229, 0.4)' 
                        : '0 4px 20px -5px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    <p 
                      className="text-sm whitespace-pre-wrap markdown-content leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: message.type === 'user' ? message.text : renderMarkdown(message.text) }}
                    ></p>
                    <div className={`text-right mt-1.5 ${message.type === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                      <span className="text-xs font-light">
                        {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                  </div>
                  {message.type === 'user' && (
                    <div className="w-8 h-8 rounded-full user-avatar flex-shrink-0 ml-2 flex items-center justify-center shadow-md">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                      </svg>
                    </div>
                  )}
                </div>
              ))
            )}
            {isLoadingChat && (
              <div className="flex justify-start animate-fade-in-up">
                <div className="w-8 h-8 rounded-full ai-avatar flex-shrink-0 mr-2 flex items-center justify-center shadow-md">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                  </svg>
                </div>
                <div className="bg-white shadow-lg rounded-2xl rounded-tl-none px-5 py-3.5 border border-gray-100">
                  <div className="flex items-center space-x-2">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    <span className="text-sm text-gray-500">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Chat Input */}
          <div className="p-5 border-t border-gray-100">
            <form onSubmit={handleChatSubmit} className="space-y-4">
              <div className="relative group">
                <textarea
                  value={taskText}
                  onChange={(e) => {
                    console.log("Text changed:", e.target.value);
                    setTaskText(e.target.value);
                  }}
                  placeholder="Type your message here..."
                  className="modern-input w-full resize-none focus:outline-none focus:ring-0"
                  rows={3}
                />
                {interimTranscript && (
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-b from-white/40 to-white/60 backdrop-blur-sm text-gray-600 italic border-t border-white/20 rounded-b-2xl">
                    {interimTranscript}
                  </div>
                )}
              </div>
              
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isLoadingChat || !taskText.trim()}
                  className="flex-1 gradient-blue-button text-white px-6 py-3.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isLoadingChat ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      <span>Send</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`p-3.5 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center ${
                    isListening
                      ? 'bg-gradient-to-r from-red-400 to-pink-500 text-white recording-active'
                      : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700'
                  }`}
                  title={isListening ? 'Stop recording' : 'Start voice input'}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
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
          </div>
        </>
      ) : (
        <>
          {/* Task Creation Mode Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar chat-container">
            {/* Messages Area */}
            <div className="space-y-4">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
                >
                  {message.type !== 'user' && (
                    <div className="avatar ai-avatar mr-2">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                      </svg>
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] shadow-lg ${
                      message.type === 'user' 
                        ? 'chat-message-user bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl rounded-tr-none px-5 py-3.5' 
                        : message.type === 'error'
                        ? 'bg-gradient-to-br from-red-100 to-pink-100 text-red-700 rounded-2xl rounded-tl-none px-5 py-3.5 border border-red-200'
                        : 'chat-message-ai bg-white rounded-2xl rounded-tl-none px-5 py-3.5 border border-gray-100'
                    }`}
                    style={{
                      boxShadow: message.type === 'user' 
                        ? '0 4px 20px -5px rgba(79, 70, 229, 0.4)' 
                        : message.type === 'error'
                        ? '0 4px 20px -5px rgba(251, 113, 133, 0.2)'
                        : '0 4px 20px -5px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.text}</p>
                    {message.task && (
                      <div className="mt-3 pt-3 border-t border-white/20 text-xs space-y-1">
                        {message.task.subtasks.length > 0 && (
                          <p className="font-medium">✓ Created with {message.task.subtasks.length} subtasks</p>
                        )}
                        {message.task.deadline && (
                          <p className="font-medium">📅 Due: {formatDate(message.task.deadline)}</p>
                        )}
                      </div>
                    )}
                  </div>
                  {message.type === 'user' && (
                    <div className="avatar user-avatar ml-2">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                      </svg>
                    </div>
                  )}
                </div>
              ))}
              {processing && (
                <div className="flex justify-start animate-fade-in-up">
                  <div className="avatar ai-avatar mr-2">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                    </svg>
                  </div>
                  <div className="bg-white shadow-lg rounded-2xl rounded-tl-none px-5 py-3.5 border border-gray-100">
                    <div className="flex items-center space-x-2">
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                      <span className="text-sm text-gray-500">Creating your task...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 text-gray-800">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                    </svg>
                    <h3 className="text-lg font-medium">Create a New Task</h3>
                  </div>
                  
                  <div className="relative group">
                    <textarea
                      id="taskInput"
                      value={taskText}
                      onChange={(e) => setTaskText(e.target.value)}
                      placeholder="Describe your task in natural language..."
                      className="modern-input w-full resize-none focus:outline-none focus:ring-0"
                      rows={4}
                    />
                    {interimTranscript && (
                      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-b from-white/40 to-white/60 backdrop-blur-sm text-gray-600 italic border-t border-white/20 rounded-b-2xl">
                        {interimTranscript}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={processing}
                    className="flex-1 gradient-blue-button text-white px-6 py-3.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
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
                    className={`p-3.5 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center ${
                      isListening
                        ? 'bg-gradient-to-r from-red-400 to-pink-500 text-white recording-active'
                        : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700'
                    }`}
                    title={isListening ? 'Stop recording' : 'Start voice input'}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
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
                <div className="mt-4 bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100 animate-pulse">
                  <div className="flex items-center text-green-700">
                    <div className="relative mr-3">
                      <div className="absolute -inset-1 bg-green-400 rounded-full animate-ping opacity-30"></div>
                      <div className="relative h-3 w-3 bg-green-500 rounded-full"></div>
                    </div>
                    <span className="font-medium">Listening... Speak now</span>
                  </div>
                </div>
              )}

              <div className="mt-6">
                <h3 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
                  <svg className="h-4 w-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                  </svg>
                  Try these examples
                </h3>
                <div className="grid grid-cols-1 gap-3 mt-2">
                  <div 
                    className="suggestion-card bg-white rounded-xl p-3 shadow-sm border border-gray-100 cursor-pointer"
                    onClick={() => setTaskText("Schedule a team meeting for next Monday at 10am with the marketing team to discuss Q4 strategy")}
                  >
                    <div className="flex items-start">
                      <span className="text-blue-500 mr-2">📅</span>
                      <div>
                        <p className="text-gray-800 font-medium text-sm">Schedule team meeting</p>
                        <p className="text-xs text-gray-500 mt-1">Monday at 10am with marketing team</p>
                      </div>
                    </div>
                  </div>
                  
                  <div 
                    className="suggestion-card bg-white rounded-xl p-3 shadow-sm border border-gray-100 cursor-pointer"
                    onClick={() => setTaskText("Complete the quarterly report by Friday. High priority. Need to analyze sales data and prepare presentation slides.")}
                  >
                    <div className="flex items-start">
                      <span className="text-red-500 mr-2">⚡</span>
                      <div>
                        <p className="text-gray-800 font-medium text-sm">Complete quarterly report</p>
                        <p className="text-xs text-gray-500 mt-1">High priority, due Friday</p>
                      </div>
                    </div>
                  </div>
                  
                  <div 
                    className="suggestion-card bg-white rounded-xl p-3 shadow-sm border border-gray-100 cursor-pointer"
                    onClick={() => setTaskText("Buy groceries: milk, eggs, bread, fruits, and vegetables. Try to get this done by tomorrow evening.")}
                  >
                    <div className="flex items-start">
                      <span className="text-green-500 mr-2">🛒</span>
                      <div>
                        <p className="text-gray-800 font-medium text-sm">Buy groceries</p>
                        <p className="text-xs text-gray-500 mt-1">Milk, eggs, bread, fruits, vegetables</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.1);
          border-radius: 100px;
          transition: all 0.3s ease;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.2);
        }

        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
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
    task.deadline ? formatDateForInput(task.deadline) : ""
  );
  
  // When the task prop changes, update the due date state but preserve expanded state
  useEffect(() => {
    if (task.deadline) {
      setNewDueDate(formatDateForInput(task.deadline));
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
      const dateObj = new Date(newDueDate);
      await updateTask(task.id, { 
        deadline: dateObj.toISOString()
      });
      setEditingDate(false);
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
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/40 text-gray-800 border border-gray-200" style={{backdropFilter: 'blur(2px)'}}>
                  {task.priority === 'high' && <span>⚡⚡</span>}
                  {task.priority === 'medium' && <span>⚡</span>}
                  {task.priority === 'low' && <span> 🌱 </span>}
                </span>
                {editingDate ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="datetime-local"
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
                        {subtask.priority === 'high' && <span>⚡⚡</span>}
                        {subtask.priority === 'medium' && <span>⚡</span>}
                        {subtask.priority === 'low' && <span> 🌱 </span>}
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
            <h4 className="text-sm font-medium text-indigo-800 mb-1">Emotional Support:</h4>
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
  const [filter, setFilter] = useState("active"); // all, active, completed
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  // Refresh when userId changes or lastRefresh changes
  useEffect(() => {
    if (userId) {
      console.log("Fetching tasks for user:", userId);
      fetchTasks();
    }
  }, [userId, lastRefresh]);

  const fetchTasks = async () => {
    console.log("TasksList: fetchTasks called");
    setLoading(true);
    try {
      const response = await axios.get(`${API}/tasks/user/${userId}`);
      console.log("TasksList: Fetched tasks:", response.data.length);
      setTasks(response.data);
      setError("");
    } catch (err) {
      console.error("Error fetching tasks:", err);
      setError("Failed to load tasks. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  };

  // Call this to force a refresh from another component
  const refreshTasks = () => {
    console.log("TasksList: refreshTasks triggered");
    setLastRefresh(Date.now());
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

  const priorityOrder = { high: 0, medium: 1, low: 2 };

  const filteredTasks = tasks.filter(task => {
    if (filter === "all") return true;
    if (filter === "active") return !task.completed;
    if (filter === "completed") return task.completed;
    return true;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    // Completed tasks always at the end (only for 'all' filter)
    if (filter === 'all') {
      if (a.completed && !b.completed) return 1;
      if (!a.completed && b.completed) return -1;
    }
    // Order by priority (high < medium < low)
    const aPriority = priorityOrder[a.priority] ?? 3;
    const bPriority = priorityOrder[b.priority] ?? 3;
    if (aPriority !== bPriority) return aPriority - bPriority;
    // For same priority, order by due date (earlier first)
    const aDue = a.deadline ? new Date(a.deadline).getTime() : Infinity;
    const bDue = b.deadline ? new Date(b.deadline).getTime() : Infinity;
    return aDue - bDue;
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
        ) : sortedTasks.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            {filter === "all"
              ? "You don't have any tasks yet. Start by creating a new task above!"
              : filter === "active"
              ? "You don't have any active tasks."
              : "You don't have any completed tasks."}
          </div>
        ) : (
          <div>
            {sortedTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                updateTask={updateTask}
                deleteTask={deleteTask}
                refreshTasks={refreshTasks}
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
  const [showMode, setShowMode] = useState('tasks'); // 'tasks' or 'subtasks'
  
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
  
  // Group items by date
  const itemsByDate = {};
  if (showMode === 'tasks') {
    tasks.forEach(task => {
      if (task.deadline) {
        const taskDate = new Date(task.deadline);
        const taskDateStr = taskDate.toDateString();
        if (!itemsByDate[taskDateStr]) itemsByDate[taskDateStr] = [];
        itemsByDate[taskDateStr].push({ ...task, _type: 'task' });
      }
    });
  } else {
    tasks.forEach(task => {
      if (task.subtasks && Array.isArray(task.subtasks)) {
        task.subtasks.forEach(subtask => {
          if (subtask.deadline) {
            const subtaskDate = new Date(subtask.deadline);
            const subtaskDateStr = subtaskDate.toDateString();
            if (!itemsByDate[subtaskDateStr]) itemsByDate[subtaskDateStr] = [];
            itemsByDate[subtaskDateStr].push({ ...subtask, parentTask: task.title, _type: 'subtask' });
          }
        });
      }
    });
  }

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
            const dayItems = itemsByDate[dateStr] || [];
            
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
                  {dayItems.map(item => (
                    <div 
                      key={item.id}
                      className={`text-xs p-1 mb-1 truncate rounded ${
                        item._type === 'task' ? (item.completed ? 'bg-green-100 text-green-800' : 'bg-indigo-100 text-indigo-800') : (item.completed ? 'bg-green-100 text-green-800' : 'bg-indigo-100 text-indigo-800')
                      }`}
                      title={item._type === 'subtask' ? (item.title || item.description) : item.title}
                    >
                      {item._type === 'subtask' ? (item.title || item.description) : item.title}
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
            const dayItems = itemsByDate[dateStr] || [];
            
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
                  {dayItems.map(item => (
                    <div
                      key={item.id}
                      className={`p-2 rounded-md text-sm ${
                        item._type === 'task' ? (item.completed ? 'bg-green-100 text-green-800' : 'bg-indigo-100 text-indigo-800') : (item.completed ? 'bg-green-100 text-green-800' : 'bg-indigo-100 text-indigo-800')
                      }`}
                    >
                      <div className="font-medium truncate">{item._type === 'subtask' ? item.description : item.title}</div>
                      <div className="text-xs mt-1">
                        {formatDate(item.deadline)}
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
    const dayItems = itemsByDate[dateStr] || [];
    
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
            const hourItems = dayItems.filter(item => {
              const taskHour = new Date(item.deadline).getHours();
              return taskHour === hour;
            });
            
            return (
              <div key={hour} className="flex min-h-[60px] group hover:bg-gray-50">
                <div className="w-20 py-2 px-4 text-right text-sm text-gray-500">
                  {formatTime(hour)}
                </div>
                <div className="flex-1 py-2 px-4 border-l">
                  {hourItems.map(item => (
                    <div
                      key={item.id}
                      className={`p-2 rounded-md text-sm mb-2 ${
                        item._type === 'task' ? (item.completed ? 'bg-green-100 text-green-800' : 'bg-indigo-100 text-indigo-800') : (item.completed ? 'bg-green-100 text-green-800' : 'bg-indigo-100 text-indigo-800')
                      }`}
                    >
                      <div className="font-medium">{item._type === 'subtask' ? item.description : item.title}</div>
                      <div className="text-xs mt-1">
                        {formatDate(item.deadline)}
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
          {/* Toggle for Tasks/Subtasks */}
          <div className="ml-4 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setShowMode('tasks')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
                showMode === 'tasks' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Tasks
            </button>
            <button
              onClick={() => setShowMode('subtasks')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
                showMode === 'subtasks' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Subtasks
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
                            {task._type === 'subtask' ? task.description : task.title}
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
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("active"); // all, active, completed

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

  useEffect(() => {
    fetchTasks();
  }, [userId]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} userId={userId} />
      <main className="container mx-auto p-6 pr-[400px]">
        {activeTab === "tasks" && <TasksList userId={userId} />}
        {activeTab === "calendar" && <CalendarView userId={userId} />}
        {activeTab === "timeline" && <TimelineView userId={userId} />}
        {activeTab === "statistics" && <Statistics userId={userId} />}
      </main>
      <TaskInput userId={userId} setTasks={setTasks} fetchTasks={fetchTasks} />
    </div>
  );
};

// Main App component
function App() {
  // State variables
  const [userId, setUserId] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentView, setCurrentView] = useState("tasks"); // tasks, create, stats
  const [taskStats, setTaskStats] = useState(null);
  const [aiFeedback, setAIFeedback] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [tasksLastRefresh, setTasksLastRefresh] = useState(Date.now());
  
  // Initialize user
  useEffect(() => {
    const setupDefaultUser = async () => {
      const defaultUsername = "default-user";
      
      try {
        // First try to get the existing user
        let response = await axios.get(`${API}/users/name/${defaultUsername}`);
        setUserId(response.data.id);
      } catch (err) {
        if (err.response && err.response.status === 404) {
          // If user doesn't exist, create one
          try {
            const createResponse = await axios.post(`${API}/users`, { username: defaultUsername });
            setUserId(createResponse.data.id);
          } catch (createErr) {
            console.error("Error creating user:", createErr);
            setError("Failed to initialize user. Please try again.");
          }
        } else {
          console.error("Error getting user:", err);
          setError("Failed to initialize user. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    };
    
    setupDefaultUser();
  }, []);
  
  // Fetch tasks from the backend
  const fetchTasks = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const response = await axios.get(`${API}/tasks/user/${userId}`);
      console.log("App: Fetched tasks:", response.data.length);
      setTasks(response.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching tasks:", err);
      setError("Failed to load tasks. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  // Function to refresh tasks state across components
  const refreshAllTasks = () => {
    console.log("App: refreshAllTasks triggered");
    setTasksLastRefresh(Date.now());
    fetchTasks();
  };
  
  // When user changes or tasksLastRefresh changes, fetch their tasks
  useEffect(() => {
    if (userId) {
      console.log("App: Fetching tasks after user/refresh change");
      fetchTasks();
    }
  }, [userId, tasksLastRefresh]);
  
  if (loading && !userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-lg text-gray-700">Loading your session...</p>
        </div>
      </div>
    );
  }
  
  if (error && !userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Application Error</h2>
          <p className="text-gray-700 mb-2">{error}</p>
          <p className="text-sm text-gray-500 mb-6">Please ensure the backend server is running and accessible.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition duration-300"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation activeTab={currentView} setActiveTab={setCurrentView} userId={userId} />
      <main className="container mx-auto p-6 pr-[400px]">
        {currentView === "tasks" && <TasksList userId={userId} key={`tasks-${tasksLastRefresh}`} />}
        {currentView === "calendar" && <CalendarView userId={userId} />}
        {currentView === "timeline" && <TimelineView userId={userId} />}
        {currentView === "statistics" && <Statistics userId={userId} />}
      </main>
      <TaskInput 
        userId={userId} 
        setTasks={setTasks} 
        fetchTasks={refreshAllTasks} 
      />
    </div>
  );
}

export default App;
