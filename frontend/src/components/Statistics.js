import React, { useState, useEffect } from 'react';
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
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

const Statistics = ({ userId }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tasksWithSubtasks, setTasksWithSubtasks] = useState([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/statistics/user/${userId}`);
        setStats(response.data);
        
        // Fetch tasks with their subtasks
        const tasksResponse = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/tasks/user/${userId}`);
        setTasksWithSubtasks(tasksResponse.data);
      } catch (err) {
        setError('Failed to load statistics');
        console.error('Error fetching statistics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [userId]);

  if (loading) return <div className="p-4">Loading statistics...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;
  if (!stats) return <div className="p-4">No statistics available</div>;

  // Prepare data for priority distribution chart
  const priorityData = {
    labels: ['High', 'Medium', 'Low'],
    datasets: [
      {
        data: [
          stats.tasks_by_priority.high,
          stats.tasks_by_priority.medium,
          stats.tasks_by_priority.low,
        ],
        backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
      },
    ],
  };

  // Prepare data for completion status chart
  const statusData = {
    labels: ['Completed', 'In Progress'],
    datasets: [
      {
        data: [stats.tasks_by_status.completed, stats.tasks_by_status.in_progress],
        backgroundColor: ['#10b981', '#3b82f6'],
      },
    ],
  };

  // Prepare data for weekly completion chart
  const weeklyData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Completed Tasks',
        data: [0, 0, 0, 0, 0, 0, 0], // This would need to be calculated from recent_completions
        backgroundColor: '#3b82f6',
      },
    ],
  };

  // Prepare data for subtask priority distribution chart
  const subtaskPriorityData = {
    labels: ['High', 'Medium', 'Low'],
    datasets: [
      {
        data: [
          stats.subtasks_by_priority.high,
          stats.subtasks_by_priority.medium,
          stats.subtasks_by_priority.low,
        ],
        backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
      },
    ],
  };

  // Prepare data for subtask completion status chart
  const subtaskStatusData = {
    labels: ['Completed', 'In Progress'],
    datasets: [
      {
        data: [stats.subtasks_by_status.completed, stats.subtasks_by_status.in_progress],
        backgroundColor: ['#10b981', '#3b82f6'],
      },
    ],
  };

  // Function to calculate subtask statistics for a task
  const calculateSubtaskStats = (task) => {
    const subtasks = task.subtasks || [];
    const totalSubtasks = subtasks.length;
    const completedSubtasks = subtasks.filter(st => st.completed).length;
    const completionRate = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;
    
    // Calculate average completion time for subtasks
    const completionTimes = subtasks
      .filter(st => st.completed && st.created_at && st.updated_at)
      .map(st => {
        const created = new Date(st.created_at);
        const updated = new Date(st.updated_at);
        return (updated - created) / (1000 * 60 * 60); // Convert to hours
      });
    
    const avgCompletionTime = completionTimes.length > 0
      ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
      : null;

    // Count subtasks by deadline status
    const now = new Date();
    const upcomingDeadlines = subtasks.filter(st => 
      st.deadline && !st.completed && new Date(st.deadline) > now
    ).length;
    const overdueDeadlines = subtasks.filter(st => 
      st.deadline && !st.completed && new Date(st.deadline) <= now
    ).length;

    return {
      totalSubtasks,
      completedSubtasks,
      completionRate,
      avgCompletionTime,
      upcomingDeadlines,
      overdueDeadlines
    };
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Task Statistics</h2>
      
      {/* Task Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Total Tasks</h3>
          <p className="text-3xl font-bold text-indigo-600">{stats.total_tasks}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Completion Rate</h3>
          <p className="text-3xl font-bold text-green-600">{stats.completion_rate.toFixed(1)}%</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Avg. Completion Time</h3>
          <p className="text-3xl font-bold text-blue-600">
            {stats.average_completion_time ? `${stats.average_completion_time.toFixed(1)}h` : 'N/A'}
          </p>
        </div>
      </div>

      {/* Task Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Tasks by Priority</h3>
          <div className="h-64">
            <Pie data={priorityData} options={{ maintainAspectRatio: false }} />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Tasks by Status</h3>
          <div className="h-64">
            <Pie data={statusData} options={{ maintainAspectRatio: false }} />
          </div>
        </div>
      </div>

      {/* Subtask Statistics Section */}
      <h2 className="text-2xl font-bold mb-6 mt-12">Subtask Statistics</h2>
      
      {/* Subtask Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Total Subtasks</h3>
          <p className="text-3xl font-bold text-indigo-600">{stats.total_subtasks}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Subtask Completion Rate</h3>
          <p className="text-3xl font-bold text-green-600">{stats.subtask_completion_rate.toFixed(1)}%</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Avg. Subtasks per Task</h3>
          <p className="text-3xl font-bold text-blue-600">
            {stats.average_subtasks_per_task.toFixed(1)}
          </p>
        </div>
      </div>

      {/* Subtask Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Subtasks by Priority</h3>
          <div className="h-64">
            <Pie data={subtaskPriorityData} options={{ maintainAspectRatio: false }} />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Subtasks by Status</h3>
          <div className="h-64">
            <Pie data={subtaskStatusData} options={{ maintainAspectRatio: false }} />
          </div>
        </div>
      </div>

      {/* Subtasks by Task Section */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6">Subtasks by Task</h2>
        <div className="space-y-6">
          {tasksWithSubtasks.map((task) => {
            const subtaskStats = calculateSubtaskStats(task);
            
            return (
              <div key={task.id} className="bg-white p-4 rounded-lg shadow">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">{task.title}</h3>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    task.completed ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {task.completed ? 'Completed' : 'In Progress'}
                  </span>
                </div>
                
                {subtaskStats.totalSubtasks > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Completion Stats */}
                    <div className="bg-gray-50 p-3 rounded">
                      <h4 className="text-sm font-medium text-gray-600 mb-2">Completion</h4>
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

                    {/* Time Stats */}
                    <div className="bg-gray-50 p-3 rounded">
                      <h4 className="text-sm font-medium text-gray-600 mb-2">Time Metrics</h4>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Avg. Completion Time:</span>
                          <span className="font-medium">
                            {subtaskStats.avgCompletionTime 
                              ? `${subtaskStats.avgCompletionTime.toFixed(1)}h`
                              : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Deadline Stats */}
                    <div className="bg-gray-50 p-3 rounded">
                      <h4 className="text-sm font-medium text-gray-600 mb-2">Deadlines</h4>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Upcoming:</span>
                          <span className="font-medium text-blue-600">{subtaskStats.upcomingDeadlines}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Overdue:</span>
                          <span className="font-medium text-red-600">{subtaskStats.overdueDeadlines}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No subtasks for this task</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Completions */}
      <div className="mt-8 bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Recent Completions</h3>
        <div className="space-y-2">
          {stats.recent_completions.map((task) => (
            <div key={task.id} className="flex justify-between items-center p-2 hover:bg-gray-50">
              <span className="font-medium">{task.title}</span>
              <span className="text-sm text-gray-500">
                Completed {new Date(task.updated_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Statistics; 