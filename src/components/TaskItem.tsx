'use client';

import React, { useState } from 'react';
import { Task, Subtask } from './TaskList'; // Assuming TaskList exports these types
import SubtaskItem from './SubtaskItem';

interface TaskItemProps {
  task: Task;
  toggleSubtaskCompletion: (taskId: string, subtaskId: string) => void;
  toggleTaskCompletion: (taskId: string) => void; // Added prop
}

const TaskItem: React.FC<TaskItemProps> = ({ task, toggleSubtaskCompletion, toggleTaskCompletion }) => {
  const [showSubtasks, setShowSubtasks] = useState(false);

  const getPriorityClasses = (priority: Task['priority']) => {
    switch (priority) {
      case 'High Priority':
        return 'bg-red-100 text-red-700';
      case 'Medium Priority':
        return 'bg-yellow-100 text-yellow-700';
      case 'Low Priority':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-start">
        <div className="flex items-start flex-grow">
          {/* Checkbox for tasks without subtasks */}
          {(!task.subtasks || task.subtasks.length === 0) && (
            <input
              type="checkbox"
              checked={task.status === 'Completed'}
              onChange={() => toggleTaskCompletion(task.id)}
              className="mr-3 mt-1 h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 self-start"
            />
          )}
          <div className={task.subtasks && task.subtasks.length > 0 ? "w-full" : "w-full"}> {/* Ensure title takes full width available */}
            <h3 className={`text-lg font-semibold text-gray-800 ${task.status === 'Completed' ? 'line-through text-gray-400' : ''}`}>{task.title}</h3>
            <p className={`text-sm text-gray-500 mb-2 ${task.status === 'Completed' ? 'line-through' : ''}`}>{task.description}</p>
            <div className="flex items-center space-x-2 mb-2 flex-wrap">
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded-full ${getPriorityClasses(task.priority)} ${task.status === 'Completed' ? 'opacity-50' : ''}`}
              >
                {task.priority}
              </span>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 ${task.status === 'Completed' ? 'opacity-50' : ''}`}>
                {task.status}
              </span>
              {task.tags.map(tag => (
                <span key={tag} className={`px-2 py-0.5 text-xs font-medium rounded-full bg-gray-200 text-gray-700 ${task.status === 'Completed' ? 'opacity-50' : ''}`}>
                  {tag}
                </span>
              ))}
            </div>
            <div className={`text-xs text-gray-400 space-x-4 mb-1 ${task.status === 'Completed' ? 'line-through' : ''}`}>
              {task.dueDate && <span>Due: {task.dueDate}</span>}
              {task.createdDate && <span>Created: {task.createdDate}</span>}
            </div>
          </div>
        </div>
        <button className="text-gray-400 hover:text-gray-600 ml-2 flex-shrink-0">
          {/* Placeholder for More Options Icon (e.g., three dots) */}
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
          </svg>
        </button>
      </div>

      <div className="mt-3">
        <div className="flex justify-between items-center text-sm mb-1">
          <p className="text-gray-600">Progress: {task.subtasks.length > 0 ? `${task.subtasks.filter(st => st.completed).length} of ${task.subtasks.length} subtasks` : 'No subtasks'}</p>
          <span className="font-medium text-gray-700">{task.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
          <div
            className="bg-blue-600 h-2 rounded-full"
            style={{ width: `${task.progress}%` }}
          ></div>
        </div>
      </div>

      {task.subtasks && task.subtasks.length > 0 && (
        <div>
          <button
            onClick={() => setShowSubtasks(!showSubtasks)}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center w-full text-left mb-2"
          >
            {showSubtasks ? 'Hide Subtasks' : 'View Subtasks'}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-4 h-4 ml-1 transform transition-transform ${showSubtasks ? 'rotate-180' : ''}`}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
          {showSubtasks && (
            <div className="space-y-2 pl-4 border-l-2 border-gray-200 ml-1">
              {task.subtasks.map(subtask => (
                <SubtaskItem 
                  key={subtask.id} 
                  subtask={subtask} 
                  onToggle={() => toggleSubtaskCompletion(task.id, subtask.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskItem;

