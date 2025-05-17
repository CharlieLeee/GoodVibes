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

  if (loading) return <div className="p-4">Loading statistics...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;
  if (!stats) return <div className="p-4">No statistics available</div>;

  return (
    <div className="p-6">
      {/* AI Feedback Section */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-6">AI Analysis</h2>
        {aiFeedbackLoading ? (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-gray-600">Generating AI feedback...</span>
            </div>
          </div>
        ) : aiFeedback && !aiFeedbackError ? (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-sm">
            <div className="p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{aiFeedback.summary}</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Key Insights</h4>
                      <ul className="space-y-2">
                        {aiFeedback.insights.map((insight, index) => (
                          <li key={index} className="flex items-start">
                            <span className="flex-shrink-0 w-1.5 h-1.5 mt-2 bg-blue-500 rounded-full"></span>
                            <span className="ml-2 text-sm text-gray-600">{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Suggestions</h4>
                      <ul className="space-y-2">
                        {aiFeedback.suggestions.map((suggestion, index) => (
                          <li key={index} className="flex items-start">
                            <span className="flex-shrink-0 w-1.5 h-1.5 mt-2 bg-green-500 rounded-full"></span>
                            <span className="ml-2 text-sm text-gray-600">{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : aiFeedbackError ? (
          <div className="bg-yellow-50 rounded-lg shadow-sm">
            <div className="p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">{aiFeedbackError}</p>
                  <button
                    onClick={fetchAIFeedback}
                    className="mt-2 text-sm text-yellow-700 hover:text-yellow-800 underline"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Overall Completion Trends Section */}
      <div className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Completion Trends</h2>
          <div className="flex space-x-2">
            {['day', 'week', 'month', 'year'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 rounded ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
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
                      title: {
                        display: true,
                        text: 'Number of Completions'
                      }
                    }
                  },
                  plugins: {
                    title: {
                      display: true,
                      text: 'Task and Subtask Completion Trends'
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
        <h2 className="text-2xl font-bold mb-6">Task Tracking</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasksWithSubtasks.map(task => {
            const basicStats = calculateBasicTaskStats(task);
            const isExpanded = expandedTaskId === task.id;
            const subtaskStats = isExpanded ? calculateSubtaskStats(task) : null;

            return (
              <div 
                key={task.id}
                className="bg-white rounded-lg shadow cursor-pointer transition-all duration-200 hover:shadow-lg"
                onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
              >
                {/* Basic Info (Always Visible) */}
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-gray-800">{task.title}</h3>
                    <span className={`px-2 py-1 rounded text-sm ${
                      task.priority === 'high' ? 'bg-red-100 text-red-800' :
                      task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {task.priority}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <span>{basicStats.completedSubtasks}/{basicStats.totalSubtasks} subtasks</span>
                    <span className="font-medium text-blue-600">{basicStats.completionRate.toFixed(1)}%</span>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && subtaskStats && (
                  <div className="border-t border-gray-100 p-4">
                    <div className="space-y-4">
                      {/* Progress Stats */}
                      <div className="bg-gray-50 p-3 rounded">
                        <h4 className="text-sm font-medium text-gray-600 mb-2">Progress Details</h4>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Subtasks:</span>
                            <span className="font-medium">{subtaskStats.totalSubtasks}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Completed:</span>
                            <span className="font-medium text-green-600">{subtaskStats.completedSubtasks}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Completion Rate:</span>
                            <span className="font-medium text-blue-600">{subtaskStats.completionRate.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Completion Timeline */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-600 mb-2">Recent Completions</h4>
                        <div className="space-y-2">
                          {subtaskStats.completionTimeline.slice(0, 3).map((completion, index) => (
                            <div key={index} className="flex items-center space-x-4 p-2 bg-gray-50 rounded">
                              <div className="w-24 text-sm text-gray-500">
                                {completion.date.toLocaleDateString()}
                              </div>
                              <div className="flex-1">
                                <div className="text-gray-700">{completion.description}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Statistics; 