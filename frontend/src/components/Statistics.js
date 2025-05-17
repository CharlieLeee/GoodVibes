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

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/statistics/user/${userId}`);
        setStats(response.data);
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

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Task Statistics</h2>
      
      {/* Summary Cards */}
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

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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