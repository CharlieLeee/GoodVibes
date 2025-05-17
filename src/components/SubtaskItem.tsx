import React from 'react';
import { Subtask } from './TaskList'; // Assuming Subtask type is exported from TaskList

interface SubtaskItemProps {
  subtask: Subtask;
  onToggle: () => void;
}

const SubtaskItem: React.FC<SubtaskItemProps> = ({ subtask, onToggle }) => {
  return (
    <div className="flex items-center py-1">
      <input
        type="checkbox"
        id={`subtask-${subtask.id}`}
        checked={subtask.completed}
        onChange={onToggle}
        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
      />
      <label
        htmlFor={`subtask-${subtask.id}`}
        className={`ml-2 text-sm ${subtask.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}
      >
        {subtask.title}
      </label>
    </div>
  );
};

export default SubtaskItem;
