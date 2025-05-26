import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement,
} from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement
);

const CelebrationBanner = ({ achievement, onClose }) => {
  const [isShowing, setIsShowing] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsShowing(false);
      setTimeout(onClose, 500); // Call onClose after fade-out animation
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-4 right-4 z-50 transition-all duration-500 ${isShowing ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform -translate-y-10'}`}>
      <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white p-4 rounded-lg shadow-lg flex items-center space-x-4 max-w-md">
        <div className="flex-shrink-0 text-3xl animate-bounce">
          🎉
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-lg mb-1">Achievement Unlocked!</h3>
          <p className="text-indigo-100">{achievement}</p>
        </div>
        <button 
          onClick={() => {
            setIsShowing(false);
            setTimeout(onClose, 500);
          }} 
          className="text-white/70 hover:text-white"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="w-full mt-2">
        <div className="h-1 bg-indigo-200 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-400 animate-shrink"></div>
        </div>
      </div>
    </div>
  );
};

const MotivationalQuote = () => {
  const [quote, setQuote] = useState("");
  
  const quotes = [
    "Progress is still progress, no matter how small.",
    "Focus on how far you've come, not how far you have to go.",
    "Every completed task is a win worth celebrating.",
    "Your worth isn't measured by your productivity.",
    "Taking breaks is part of the productivity process.",
    "Small steps today lead to big results tomorrow.",
    "Be proud of yourself for showing up today.",
    "Consistency matters more than perfection.",
    "Your effort today plants the seeds for future success.",
    "Remember to celebrate your progress, not just your outcomes.",
    "You're doing better than you think you are.",
    "It's okay to have off days - they're part of the journey too.",
    "Your value isn't determined by what you accomplish.",
    "Give yourself permission to be a work in progress.",
    "Today's small win is tomorrow's foundation."
  ];
  
  useEffect(() => {
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    setQuote(randomQuote);
    
    // Rotate quotes every 12 seconds
    const interval = setInterval(() => {
      let newQuote;
      do {
        newQuote = quotes[Math.floor(Math.random() * quotes.length)];
      } while (newQuote === quote);
      setQuote(newQuote);
    }, 12000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-6 border border-indigo-100/40 shadow-sm">
      <div className="flex items-start space-x-4">
        <div className="text-3xl">✨</div>
        <div>
          <p className="text-indigo-900 font-medium italic text-lg">{quote}</p>
          <p className="mt-2 text-indigo-600 text-sm">Take a moment to reflect on your journey</p>
        </div>
      </div>
    </div>
  );
};

const Statistics = ({ userId }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tasksWithSubtasks, setTasksWithSubtasks] = useState([]);
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [timeRange, setTimeRange] = useState('week'); // 'day', 'week', 'month', 'year'
  const [aiFeedback, setAiFeedback] = useState(null);
  const [aiFeedbackError, setAiFeedbackError] = useState(null);
  const [aiFeedbackLoading, setAiFeedbackLoading] = useState(false);
  const chartRef = useRef(null);
  const [chartData, setChartData] = useState(null);
  const lastUpdateRef = useRef(null);
  const [celebrations, setCelebrations] = useState([]);
  const [lastRefreshTime, setLastRefreshTime] = useState(null);
  const [personalReflection, setPersonalReflection] = useState("");
  const [savedReflections, setSavedReflections] = useState([]);
  const [isAddingReflection, setIsAddingReflection] = useState(false);

  // Function to check if we need to update feedback
  const shouldUpdateFeedback = (tasks) => {
    if (!lastUpdateRef.current) return true;
    
    const now = new Date();
    const timeSinceLastUpdate = now - lastUpdateRef.current;
    
    // Update if more than 1 hour has passed
    if (timeSinceLastUpdate > 3600000) return true;
    
    // Check if any task has been updated since last feedback
    const hasTaskUpdates = tasks.some(task => 
      new Date(task.updated_at) > lastUpdateRef.current
    );
    
    return hasTaskUpdates;
  };

  // Function to fetch AI feedback
  const fetchAIFeedback = async () => {
    try {
      setAiFeedbackLoading(true);
      setAiFeedbackError(null);
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/statistics/user/${userId}/feedback`);
      
      // Check if the response indicates AI service is unavailable
      if (response.data.summary.includes('AI Analysis Service')) {
        setAiFeedbackError(response.data.summary);
        setAiFeedback(null);
      } else {
        setAiFeedback(response.data);
        lastUpdateRef.current = new Date();
      }
    } catch (err) {
      console.error('Error fetching AI feedback:', err);
      setAiFeedbackError('Unable to generate AI feedback at this time');
      setAiFeedback(null);
    } finally {
      setAiFeedbackLoading(false);
    }
  };

  const refreshFeedback = () => {
    setLastRefreshTime(new Date());
    setAiFeedbackLoading(true);
    fetchAIFeedback();
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/statistics/user/${userId}`);
        setStats(response.data);
        
        // Fetch tasks with their subtasks
        const tasksResponse = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/tasks/user/${userId}`);
        setTasksWithSubtasks(tasksResponse.data);
        if (tasksResponse.data.length > 0) {
          setExpandedTaskId(tasksResponse.data[0].id);
        }

        // Fetch AI feedback only if needed
        if (shouldUpdateFeedback(tasksResponse.data)) {
          fetchAIFeedback();
        }
      } catch (err) {
        setError('Failed to load statistics');
        console.error('Error fetching statistics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [userId]);

  // Update chart data when tasks or timeRange changes
  useEffect(() => {
    if (tasksWithSubtasks.length > 0) {
      const newChartData = prepareCompletionTrendData();
      setChartData(newChartData);
    }
  }, [tasksWithSubtasks, timeRange]);

  // Cleanup chart on unmount
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, []);

  // Function to prepare completion trend data
  const prepareCompletionTrendData = () => {
    const now = new Date();
    let startDate;
    let labels;
    
    switch (timeRange) {
      case 'day':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        labels = Array.from({length: 24}, (_, i) => `${i}:00`);
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        labels = Array.from({length: 30}, (_, i) => `Day ${i + 1}`);
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        break;
      default:
        startDate = new Date(now.setDate(now.getDate() - 7));
        labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    }

    // Initialize data arrays with zeros
    const taskData = new Array(labels.length).fill(0);
    const subtaskData = new Array(labels.length).fill(0);

    // Filter and count completions
    tasksWithSubtasks.forEach(task => {
      if (task.completed && new Date(task.updated_at) >= startDate) {
        const index = getIndexForDate(new Date(task.updated_at), timeRange);
        if (index >= 0 && index < labels.length) {
          taskData[index]++;
        }
      }

      task.subtasks?.forEach(subtask => {
        if (subtask.completed && new Date(subtask.updated_at) >= startDate) {
          const index = getIndexForDate(new Date(subtask.updated_at), timeRange);
          if (index >= 0 && index < labels.length) {
            subtaskData[index]++;
          }
        }
      });
    });

    return {
      labels,
      datasets: [
        {
          label: 'Tasks Completed',
          data: taskData,
          borderColor: '#3b82f6',
          backgroundColor: '#3b82f6',
          tension: 0.4,
        },
        {
          label: 'Subtasks Completed',
          data: subtaskData,
          borderColor: '#10b981',
          backgroundColor: '#10b981',
          tension: 0.4,
        },
      ],
    };
  };

  // Helper function to get index for a date based on time range
  const getIndexForDate = (date, range) => {
    switch (range) {
      case 'day':
        return date.getHours();
      case 'week':
        return date.getDay();
      case 'month':
        return date.getDate() - 1;
      case 'year':
        return date.getMonth();
      default:
        return date.getDay();
    }
  };

  // Function to calculate subtask statistics for a specific task
  const calculateSubtaskStats = (task) => {
    const subtasks = task.subtasks || [];
    const totalSubtasks = subtasks.length;
    const completedSubtasks = subtasks.filter(st => st.completed).length;
    const completionRate = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;
    
    // Calculate completion timeline
    const completionTimeline = subtasks
      .filter(st => st.completed && st.created_at && st.updated_at)
      .map(st => ({
        date: new Date(st.updated_at),
        description: st.description
      }))
      .sort((a, b) => a.date - b.date);

    return {
      totalSubtasks,
      completedSubtasks,
      completionRate,
      completionTimeline
    };
  };

  // Function to calculate basic task stats
  const calculateBasicTaskStats = (task) => {
    const subtasks = task.subtasks || [];
    const totalSubtasks = subtasks.length;
    const completedSubtasks = subtasks.filter(st => st.completed).length;
    const completionRate = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;
    
    return {
      totalSubtasks,
      completedSubtasks,
      completionRate
    };
  };

  // Add this effect to show celebrations for achievements
  useEffect(() => {
    if (aiFeedback && aiFeedback.achievements && aiFeedback.achievements.length > 0) {
      // Only show celebration for newly completed tasks since last refresh
      const shouldCelebrate = lastRefreshTime === null || 
        stats.recent_completions.some(task => 
          new Date(task.updated_at) > lastRefreshTime
        );
      
      if (shouldCelebrate) {
        // Pick a random achievement to celebrate
        const randomIndex = Math.floor(Math.random() * aiFeedback.achievements.length);
        setCelebrations(prev => [...prev, aiFeedback.achievements[randomIndex]]);
      }
    }
  }, [aiFeedback]);

  const saveReflection = () => {
    if (!personalReflection.trim()) return;
    
    const newReflection = {
      id: Date.now(),
      text: personalReflection,
      date: new Date().toISOString()
    };
    
    setSavedReflections([newReflection, ...savedReflections]);
    setPersonalReflection("");
    setIsAddingReflection(false);
  };

  // Load saved reflections from localStorage on component mount
  useEffect(() => {
    const loadSavedReflections = () => {
      try {
        const saved = localStorage.getItem(`reflections-${userId}`);
        if (saved) {
          setSavedReflections(JSON.parse(saved));
        }
      } catch (e) {
        console.error("Error loading saved reflections", e);
      }
    };
    
    if (userId) {
      loadSavedReflections();
    }
  }, [userId]);

  // Save reflections to localStorage when they change
  useEffect(() => {
    if (savedReflections.length > 0 && userId) {
      localStorage.setItem(`reflections-${userId}`, JSON.stringify(savedReflections));
    }
  }, [savedReflections, userId]);

  if (loading) return <div className="p-4">Loading statistics...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;
  if (!stats) return <div className="p-4">No statistics available</div>;

  return (
    <div className="p-6">
      {/* AI Feedback Section */}
      {aiFeedback && !aiFeedbackError && (
        <div className="mb-8 overflow-hidden">
          {celebrations.map((celebration, index) => (
            <CelebrationBanner
              key={`celebration-${index}`}
              achievement={celebration}
              onClose={() => {
                setCelebrations(prev => prev.filter((_, i) => i !== index));
              }}
            />
          ))}
          <div className="bg-gradient-to-br from-blue-50/80 via-purple-50/80 to-pink-50/80 rounded-2xl shadow-sm border border-blue-100/30">
            <div className="p-8">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center transform rotate-2">
                    <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-semibold text-gray-800">
                    Your Productivity Journey
                  </h2>
                </div>
                
                <button
                  onClick={refreshFeedback}
                  disabled={aiFeedbackLoading}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                    aiFeedbackLoading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                  }`}
                >
                  {aiFeedbackLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Refreshing...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Refresh Insights</span>
                    </>
                  )}
                </button>
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                  {aiFeedback.summary}
                </p>
                
                {/* Motivation Quote Box */}
                {aiFeedback.motivation && (
                  <div className="mb-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-5 border border-indigo-100/40 shadow-inner">
                    <div className="flex items-start">
                      <div className="mr-4 text-3xl">💭</div>
                      <p className="text-indigo-800 italic font-medium">
                        "{aiFeedback.motivation}"
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* Key Insights */}
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 shadow-sm">
                    <h3 className="flex items-center text-lg font-medium text-gray-800 mb-4">
                      <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </span>
                      Key Insights
                    </h3>
                    <ul className="space-y-3">
                      {aiFeedback.insights.map((insight, index) => (
                        <li key={index} className="flex items-start group">
                          <span className="flex-shrink-0 w-6 h-6 bg-blue-50 rounded-full flex items-center justify-center mr-3 group-hover:bg-blue-100 transition-colors">
                            <span className="text-blue-600 text-sm font-medium">{index + 1}</span>
                          </span>
                          <p className="text-gray-600 leading-relaxed">{insight}</p>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Suggestions for Growth */}
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 shadow-sm">
                    <h3 className="flex items-center text-lg font-medium text-gray-800 mb-4">
                      <span className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </span>
                      Growth Opportunities
                    </h3>
                    <ul className="space-y-3">
                      {aiFeedback.suggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-start group">
                          <span className="flex-shrink-0 w-6 h-6 bg-purple-50 rounded-full flex items-center justify-center mr-3 group-hover:bg-purple-100 transition-colors">
                            <span className="text-purple-600 text-sm font-medium">{index + 1}</span>
                          </span>
                          <p className="text-gray-600 leading-relaxed">{suggestion}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Achievements */}
                  {aiFeedback.achievements && aiFeedback.achievements.length > 0 && (
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-emerald-100/40">
                      <h3 className="flex items-center text-lg font-medium text-gray-800 mb-4">
                        <span className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center mr-3">
                          <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </span>
                        Celebrate Your Wins
                      </h3>
                      <ul className="space-y-3">
                        {aiFeedback.achievements.map((achievement, index) => (
                          <li 
                            key={index} 
                            className="flex items-start achievement-item"
                            style={{ animationDelay: `${index * 200}ms` }} 
                          >
                            <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center mr-3 text-lg">
                              {['🏆', '⭐', '🌟'][index % 3]}
                            </span>
                            <p className="text-gray-700 leading-relaxed font-medium">{achievement}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Growth Areas */}
                  {aiFeedback.growth_areas && aiFeedback.growth_areas.length > 0 && (
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-amber-100/40">
                      <h3 className="flex items-center text-lg font-medium text-gray-800 mb-4">
                        <span className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center mr-3">
                          <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </span>
                        Growth Horizons
                      </h3>
                      <ul className="space-y-3">
                        {aiFeedback.growth_areas.map((area, index) => (
                          <li key={index} className="flex items-start">
                            <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center mr-3 text-lg">
                              {['🌱', '🚀', '💡'][index % 3]}
                            </span>
                            <p className="text-gray-700 leading-relaxed">{area}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {aiFeedbackError && (
        <div className="mb-8">
          <div className="mb-4 bg-yellow-50 rounded-lg p-4 border border-yellow-100">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">{aiFeedbackError}</p>
                <button
                  onClick={refreshFeedback}
                  className="mt-2 text-sm text-yellow-700 hover:text-yellow-800 underline"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
          <MotivationalQuote />
        </div>
      )}

      {/* Show a motivational quote while loading AI feedback */}
      {aiFeedbackLoading && !aiFeedback && (
        <div className="mb-8">
          <div className="mb-4 bg-blue-50 rounded-lg p-4 border border-blue-100 flex items-center">
            <div className="animate-spin h-5 w-5 text-blue-600 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </div>
            <p className="text-sm text-blue-700">Analyzing your productivity data...</p>
          </div>
          <MotivationalQuote />
        </div>
      )}

      {/* Overall Completion Trends Section */}
      <div className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 flex items-center">
            <span className="w-10 h-10 bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl flex items-center justify-center mr-3 transform rotate-2">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </span>
            Your Progress Timeline
          </h2>
          <div className="flex space-x-2">
            {['day', 'week', 'month', 'year'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                  timeRange === range
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 p-6">
          <div className="h-96">
            {chartData && tasksWithSubtasks.length > 0 && (
              <Line
                ref={chartRef}
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      grid: {
                        color: 'rgba(226, 232, 240, 0.5)',
                      },
                      ticks: {
                        font: {
                          family: 'Inter, system-ui, sans-serif',
                        },
                        color: '#64748b',
                      },
                      title: {
                        display: true,
                        text: 'Completed Tasks',
                        font: {
                          family: 'Inter, system-ui, sans-serif',
                          size: 14,
                          weight: '500',
                        },
                        color: '#475569',
                      }
                    },
                    x: {
                      grid: {
                        color: 'rgba(226, 232, 240, 0.5)',
                      },
                      ticks: {
                        font: {
                          family: 'Inter, system-ui, sans-serif',
                        },
                        color: '#64748b',
                      }
                    }
                  },
                  plugins: {
                    legend: {
                      labels: {
                        font: {
                          family: 'Inter, system-ui, sans-serif',
                          size: 13,
                        },
                        usePointStyle: true,
                        padding: 20,
                      }
                    }
                  }
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Task Tracking Section */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center">
          <span className="w-10 h-10 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex items-center justify-center mr-3 transform -rotate-2">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </span>
          Task Progress Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasksWithSubtasks.map(task => {
            const basicStats = calculateBasicTaskStats(task);
            const isExpanded = expandedTaskId === task.id;
            const subtaskStats = isExpanded ? calculateSubtaskStats(task) : null;

            return (
              <div 
                key={task.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100/80 transition-all duration-200 hover:shadow-md cursor-pointer overflow-hidden"
                onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
              >
                {/* Basic Info */}
                <div className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-medium text-gray-800">{task.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      task.priority === 'high' ? 'bg-red-100 text-red-700' :
                      task.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {task.priority}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className="flex-1">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
                          style={{ width: `${basicStats.completionRate}%` }}
                        />
                      </div>
                    </div>
                    <span className="ml-3 text-sm font-medium text-gray-600">
                      {basicStats.completedSubtasks}/{basicStats.totalSubtasks}
                    </span>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && subtaskStats && (
                  <div className="border-t border-gray-100">
                    <div className="p-5 space-y-4">
                      {/* Progress Stats */}
                      <div className="bg-gradient-to-br from-gray-50 to-gray-50/50 rounded-xl p-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Progress Overview</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Total Subtasks</span>
                            <span className="font-medium text-gray-800">{subtaskStats.totalSubtasks}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Completed</span>
                            <span className="font-medium text-emerald-600">{subtaskStats.completedSubtasks}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Completion Rate</span>
                            <span className="font-medium text-blue-600">{subtaskStats.completionRate.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Recent Completions */}
                      {subtaskStats.completionTimeline.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Progress</h4>
                          <div className="space-y-2">
                            {subtaskStats.completionTimeline.slice(0, 3).map((completion, index) => (
                              <div key={index} className="flex items-center space-x-3 p-2 bg-gray-50/50 rounded-lg">
                                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm text-gray-600 truncate">{completion.description}</div>
                                </div>
                                <div className="text-xs text-gray-500">
                                  {completion.date.toLocaleDateString()}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Personal Reflection Section */}
      <div className="mt-12">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center">
          <span className="w-10 h-10 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl flex items-center justify-center mr-3 transform rotate-2">
            <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </span>
          Your Personal Reflections
        </h2>
        
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <p className="text-gray-700">
              Record your thoughts, feelings, and insights about your productivity journey.
            </p>
            <button
              onClick={() => setIsAddingReflection(!isAddingReflection)}
              className="px-4 py-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors duration-200 flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isAddingReflection ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                )}
              </svg>
              <span>{isAddingReflection ? 'Cancel' : 'Add Reflection'}</span>
            </button>
          </div>
          
          {isAddingReflection && (
            <div className="mb-6 bg-gradient-to-r from-indigo-50/50 to-blue-50/50 rounded-xl p-5 border border-indigo-100/40">
              <textarea
                value={personalReflection}
                onChange={(e) => setPersonalReflection(e.target.value)}
                placeholder="How do you feel about your productivity today? What are you proud of? What would you like to improve?"
                className="w-full p-4 rounded-lg border border-indigo-100 bg-white/80 placeholder-gray-400 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-all duration-200 min-h-[120px]"
              />
              <div className="flex justify-end mt-4">
                <button
                  onClick={saveReflection}
                  disabled={!personalReflection.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Reflection
                </button>
              </div>
            </div>
          )}
          
          {savedReflections.length > 0 ? (
            <div className="space-y-4">
              {savedReflections.map((reflection) => (
                <div 
                  key={reflection.id} 
                  className="bg-gradient-to-r from-gray-50 to-gray-100/50 p-5 rounded-xl border border-gray-200/50 hover:shadow-md transition-all duration-200"
                >
                  <p className="text-gray-800 mb-3">{reflection.text}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(reflection.date).toLocaleDateString(undefined, {
                      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-gray-500 bg-gray-50/50 rounded-xl border border-gray-100/80">
              <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <p>You haven't added any reflections yet.</p>
              <button
                onClick={() => setIsAddingReflection(true)}
                className="mt-3 text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                Add your first reflection
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Statistics; 