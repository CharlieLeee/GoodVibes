"use client";

import React from 'react';
import { Calendar, dateFnsLocalizer, Event as BigCalendarEvent } from 'react-big-calendar'; // Renamed Event to avoid conflict
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Task, Subtask } from './TaskList'; // Assuming Task and Subtask interfaces are here

interface CalendarViewProps {
  tasks: Task[];
}

interface CalendarEvent extends BigCalendarEvent { // Extend from BigCalendarEvent
  // title, start, end are inherited from BigCalendarEvent
  id: string; // Keep your custom id
  type: 'task' | 'subtask';
  resource?: any;
}

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const CalendarView: React.FC<CalendarViewProps> = ({ tasks }) => {
  const events: CalendarEvent[] = [];

  tasks.forEach(task => {
    if (task.subtasks && task.subtasks.length > 0) {
      task.subtasks.forEach(subtask => {
        if (!subtask.completed && subtask.dueDate) { // Only add if not completed and has dueDate
          events.push({
            id: subtask.id,
            title: `${task.title} - ${subtask.name}`,
            start: new Date(subtask.dueDate),
            end: new Date(subtask.dueDate),
            type: 'subtask',
          });
        }
      });
    } else if (task.status !== 'Completed' && task.dueDate) { // Task without subtasks, add if not completed and has dueDate
      events.push({
        id: task.id,
        title: task.title,
        start: new Date(task.dueDate),
        end: new Date(task.dueDate),
        type: 'task',
      });
    }
  });

  return (
    <div className="bg-white shadow-md rounded-lg p-6 h-[600px]">
      <h2 className="text-2xl font-semibold mb-4 text-gray-800">Calendar View</h2>
      <Calendar
        localizer={localizer}
        events={events} // Pass the filtered events
        startAccessor="start"
        endAccessor="end"
        style={{ height: 500 }}
        eventPropGetter={(event: CalendarEvent) => {
          const backgroundColor = event.type === 'task' ? 'bg-blue-500' : 'bg-green-500';
          return { className: `${backgroundColor} text-white p-1 rounded` };
        }}
      />
    </div>
  );
};

export default CalendarView;
