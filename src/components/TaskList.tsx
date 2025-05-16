'use client';

import React from 'react';
import TaskItem from './TaskItem';

// Define a type for individual tasks
export interface Subtask {
  id: string;
  name: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'High Priority' | 'Medium Priority' | 'Low Priority';
  status: string;
  tags: string[];
  dueDate: string;
  createdDate: string;
  progress: number; // e.g., 50 for 50%
  subtasks: Subtask[];
}


// Sample Data (replace with actual data fetching later)
const initialTasks: Task[] = [
  {
    id: '1',
    title: 'Create presentation for client meeting',
    description: 'Prepare slides for the quarterly review with AMC Corp.',
    priority: 'High Priority',
    status: 'In Progress',
    tags: ['work', 'presentation'],
    dueDate: 'Due in 3 days',
    createdDate: 'Created 2 days ago',
    progress: 50,
    subtasks: [
      { id: 's1-1', name: 'Research content', completed: true },
      { id: 's1-2', name: 'Design slides', completed: false },
      { id: 's1-3', name: 'Practice presentation', completed: false },
    ],
  },
  {
    id: '2',
    title: 'Weekly grocery shopping',
    description: 'Get items for the week and meal prep ingredients',
    priority: 'Medium Priority',
    status: 'Pending',
    tags: ['personal', 'shopping'],
    dueDate: 'Due in 1 day',
    createdDate: 'Created 1 day ago',
    progress: 33,
    subtasks: [
      { id: 's2-1', name: 'Make shopping list', completed: true },
      { id: 's2-2', name: 'Check pantry inventory', completed: false },
      { id: 's2-3', name: "Visit farmer's market", completed: false },
    ],
  },
  {
    id: '3',
    title: 'Update personal portfolio website',
    description: 'Add new projects and refresh the design.',
    priority: 'Low Priority',
    status: 'Pending',
    tags: ['personal', 'development'],
    dueDate: 'Due in 7 days',
    createdDate: 'Created 5 days ago',
    progress: 0,
    subtasks: [
      { id: 's3-1', name: 'Gather project details', completed: false },
      { id: 's3-2', name: 'Design new sections', completed: false },
      { id: 's3-3', name: 'Develop new components', completed: false },
      { id: 's3-4', name: 'Deploy changes', completed: false },
    ],
  },
];

const TaskList: React.FC = () => {
  const [tasks, setTasks] = React.useState<Task[]>(initialTasks);

  const toggleSubtaskCompletion = (taskId: string, subtaskId: string) => {
    setTasks(prevTasks =>
      prevTasks.map(task => {
        if (task.id === taskId) {
          const newSubtasks = task.subtasks.map(subtask =>
            subtask.id === subtaskId
              ? { ...subtask, completed: !subtask.completed }
              : subtask
          );

          const completedCount = newSubtasks.filter(st => st.completed).length;
          const newProgress = newSubtasks.length > 0
            ? Math.round((completedCount / newSubtasks.length) * 100)
            : 0;

          let newStatus = task.status;
          if (newSubtasks.length > 0 && completedCount === newSubtasks.length) {
            newStatus = "Completed";
          } else if (task.status === "Completed" && completedCount < newSubtasks.length) {
            // If a subtask was unchecked, and the task was previously completed,
            // revert to "In Progress" or its original non-completed status.
            // For simplicity, we'll use "In Progress".
            // A more complex solution might involve storing the pre-completed status.
            const originalTask = initialTasks.find(t => t.id === taskId);
            newStatus = originalTask && originalTask.status !== "Completed" ? originalTask.status : "In Progress";
          }


          return {
            ...task,
            subtasks: newSubtasks,
            progress: newProgress,
            status: newStatus,
          };
        }
        return task;
      })
    );
  };


  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Your Tasks</h2>
      <div className="space-y-4">
        {tasks.map(task => (
          <TaskItem key={task.id} task={task} toggleSubtaskCompletion={toggleSubtaskCompletion} />
        ))}
      </div>
    </div>
  );
};

export default TaskList;
