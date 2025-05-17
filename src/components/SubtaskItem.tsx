import React from 'react';
import { Subtask } from './TaskList'; // Assuming Subtask type is exported from TaskList

interface SubtaskItemProps {
  subtask: Subtask;
  onToggle: () => void;
}

const SubtaskItem: React.FC<SubtaskItemProps> = ({ subtask, onToggle }) => {
  // Helper function to format date strings
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  // Helper function to get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  // Calculate duration and progress
  const getDurationInfo = () => {
    if (!subtask.planned_start_time || !subtask.planned_finish_time) return null;
    
    const start = new Date(subtask.planned_start_time);
    const finish = new Date(subtask.planned_finish_time);
    const now = new Date();
    
    const totalDuration = finish.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    const progress = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
    
    const durationHours = totalDuration / (1000 * 60 * 60);
    
    return {
      progress,
      durationHours: Math.round(durationHours * 10) / 10,
      isOngoing: now >= start && now <= finish,
      isPast: now > finish,
      isFuture: now < start
    };
  };

  const durationInfo = getDurationInfo();

  return (
    <div className="flex flex-col space-y-2 py-2 border-b border-gray-200">
      <div className="flex items-center">
        <input
          type="checkbox"
          id={`subtask-${subtask.id}`}
          checked={subtask.completed}
          onChange={onToggle}
          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label
          htmlFor={`subtask-${subtask.id}`}
          className={`ml-2 text-sm flex-grow ${subtask.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}
        >
          {subtask.title}
        </label>
        <span className={`text-xs font-medium ${getPriorityColor(subtask.priority)}`}>
          {subtask.priority.toUpperCase()}
        </span>
      </div>
      
      <div className="ml-6 text-xs space-y-2">
        {subtask.expected_work_load && (
          <div className="text-gray-500">
            Expected work: {subtask.expected_work_load} hours
          </div>
        )}
        
        {durationInfo && (
          <div className="space-y-1">
            <div className="flex justify-between text-gray-500">
              <span>{formatDate(subtask.planned_start_time)}</span>
              <span>{durationInfo.durationHours}h</span>
              <span>{formatDate(subtask.planned_finish_time)}</span>
            </div>
            
            <div className="relative h-1.5 bg-gray-200 rounded-full overflow-hidden">
              {/* Timeline bar */}
              <div
                className={`absolute h-full rounded-full ${
                  durationInfo.isPast ? 'bg-gray-400' : 
                  durationInfo.isOngoing ? 'bg-blue-500' : 
                  'bg-blue-200'
                }`}
                style={{ width: `${durationInfo.progress}%` }}
              />
              
              {/* Current time indicator */}
              {durationInfo.isOngoing && (
                <div 
                  className="absolute w-0.5 h-3 bg-blue-700 transform -translate-y-0.5"
                  style={{ left: `${durationInfo.progress}%` }}
                />
              )}
            </div>
            
            <div className="text-xs text-gray-500">
              {durationInfo.isPast ? (
                <span className="text-gray-500">Completed</span>
              ) : durationInfo.isOngoing ? (
                <span className="text-blue-600">In Progress</span>
              ) : (
                <span className="text-blue-400">Upcoming</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubtaskItem;
