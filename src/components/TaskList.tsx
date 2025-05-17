'use client';

import React from 'react';
import TaskItem from './TaskItem';

// Define the structure for a subtask
export interface Subtask {
  id: string; // Local unique ID
  googleId?: string; // Google's unique ID for this subtask, if it's a full task in Google
  taskListId?: string; // Google's Task List ID, if it's a Google Task
  etag?: string; // Google's ETag, if it's a Google Task
  title: string; // Maps to description in backend
  description: string; // Maps to description in backend
  completed: boolean; // Maps to Google Task 'status'
  deadline?: string; // Maps to deadline in backend
  priority: string; // low, medium, high
  expected_work_load?: number; // in hours
  planned_start_time?: string; // ISO date string
  planned_finish_time?: string; // ISO date string
  // rawGoogleTask?: any; // Optional: Store the original Google Task object if subtasks are full tasks
}

// Define the structure for a task, now more aligned with Google Tasks
export interface Task {
  id: string; // Local unique ID (can be same as googleId if fetched)
  googleId?: string; // Google's unique ID for this task
  taskListId?: string; // Google's Task List ID
  etag?: string; // Google's ETag for optimistic concurrency control
  title: string;
  description?: string; // Corresponds to Google Task 'notes'
  priority?: "High" | "Medium" | "Low" | string; // User-defined priority.
  status: "needsAction" | "completed"; // Aligns with Google Task 'status'
  progress?: number; // Calculated locally
  createdDate?: string; // Google 'created' or 'updated' timestamp
  dueDate?: string; // Corresponds to Google Task 'due' (an RFC3339 timestamp)
  tags?: string[]; // Local concept, could be stored in notes or via extended properties if available
  subtasks: Subtask[]; // Subtasks associated with this task
  link?: string; // Google Task 'selfLink' or other relevant link
  // rawGoogleTask?: any; // Optional: Store the original Google Task object for more details
}

// Sample Data (replace with actual data fetching later)
const initialTasksSample: Task[] = [
  {
    id: '1',
    title: 'Create presentation for client meeting',
    description: 'Prepare slides for the quarterly review with AMC Corp.',
    priority: 'High Priority',
    status: "needsAction", // Corrected status
    tags: ['work', 'presentation'],
    dueDate: 'Due in 3 days',
    createdDate: 'Created 2 days ago',
    progress: 50,
    subtasks: [
      { id: 's1-1', title: 'Research content', description: 'Research content', completed: true, priority: 'high' },
      { id: 's1-2', title: 'Design slides', description: 'Design slides', completed: false, priority: 'medium' },
      { id: 's1-3', title: 'Practice presentation', description: 'Practice presentation', completed: false, priority: 'high' },
    ],
  },
  {
    id: '2',
    title: 'Weekly grocery shopping',
    description: 'Get items for the week and meal prep ingredients',
    priority: 'Medium Priority',
    status: "needsAction", // Corrected status
    tags: ['personal', 'shopping'],
    dueDate: 'Due in 1 day',
    createdDate: 'Created 1 day ago',
    progress: 33,
    subtasks: [
      { id: 's2-1', title: 'Make shopping list', description: 'Make shopping list', completed: true, priority: 'medium' },
      { id: 's2-2', title: 'Check pantry inventory', description: 'Check pantry inventory', completed: false, priority: 'low' },
      { id: 's2-3', title: "Visit farmer's market", description: "Visit farmer's market", completed: false, priority: 'medium' },
    ],
  },
  {
    id: '3',
    title: 'Update personal portfolio website',
    description: 'Add new projects and refresh the design.',
    priority: 'Low Priority',
    status: "needsAction", // Corrected status
    tags: ['personal', 'development'],
    dueDate: 'Due in 7 days',
    createdDate: 'Created 5 days ago',
    progress: 0,
    subtasks: [
      { id: 's3-1', title: 'Gather project details', description: 'Gather project details', completed: false, priority: 'medium' },
      { id: 's3-2', title: 'Design new sections', description: 'Design new sections', completed: false, priority: 'high' },
      { id: 's3-3', title: 'Develop new components', description: 'Develop new components', completed: false, priority: 'high' },
      { id: 's3-4', title: 'Deploy changes', description: 'Deploy changes', completed: false, priority: 'medium' },
    ],
  },
];

export interface TaskListProps {
  tasks: Task[];
  toggleSubtaskCompletion: (taskId: string, subtaskId: string) => void;
  toggleTaskCompletion: (taskId: string) => void;
  onEditTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  expandedTaskIds: string[]; // Add prop for expanded task IDs
  onToggleTaskExpansion: (taskId: string) => void; // Add prop for toggling expansion
}

const TaskList: React.FC<TaskListProps> = ({ 
  tasks, 
  toggleSubtaskCompletion, 
  toggleTaskCompletion, 
  onEditTask, 
  onDeleteTask, 
  expandedTaskIds, 
  onToggleTaskExpansion 
}) => {
  if (!tasks || tasks.length === 0) {
    return <div className="text-gray-500">No tasks available. Create your first task!</div>;
  }

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Your Tasks</h2>
      <div className="space-y-4">
        {tasks.map(task => (
          <TaskItem 
            key={task.id} 
            task={task} 
            toggleSubtaskCompletion={toggleSubtaskCompletion} 
            toggleTaskCompletion={toggleTaskCompletion}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
            isExpanded={expandedTaskIds.includes(task.id)} // Pass isExpanded state
            onToggleExpansion={() => onToggleTaskExpansion(task.id)} // Pass toggle handler
          />
        ))}
      </div>
    </div>
  );
};

export default TaskList;
