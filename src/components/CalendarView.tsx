"use client";

import React, { useState } from 'react'; // Added useState
import { Calendar, dateFnsLocalizer, Event as BigCalendarEvent, Views, NavigateAction, View } from 'react-big-calendar'; // Added Views, NavigateAction, View
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

// Define the custom event component
const CustomEventComponent = ({ event }: { event: CalendarEvent }) => {
  // This div is the content of the event.
  // It should wrap text, use a smaller font, and hide overflow if it doesn't fit.
  // h-full attempts to make the content div fill the allocated event slot height.
  return (
    <div className="text-white text-xs whitespace-normal break-words overflow-hidden h-full">
      {event.title}
    </div>
  );
};

const CalendarView: React.FC<CalendarViewProps> = ({ tasks }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<View>(Views.MONTH);

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

  const handleNavigate = (newDate: Date, view: View, action: NavigateAction) => {
    setCurrentDate(newDate);
    setCurrentView(view);
    console.log("Navigated to:", newDate, "View:", view, "Action:", action); // For debugging
  };

  const handleViewChange = (newView: View) => {
    setCurrentView(newView);
    console.log("View changed to:", newView); // For debugging
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 flex flex-col" style={{ height: '700px' }}>
      <h2 className="text-2xl font-semibold mb-4 text-gray-800">Calendar View</h2>
      <div className="flex-grow relative">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '550px' }}
          components={{
            event: CustomEventComponent, // Use the custom event component
          }}
          eventPropGetter={(calEvent: CalendarEvent) => {
            const typeColor = calEvent.type === 'task' ? 'bg-blue-500' : 'bg-green-500';
            // Styling for the event container. Text styling is handled by CustomEventComponent.
            // p-0.5 for smaller padding, h-full to utilize event slot height.
            return { className: `${typeColor} p-0.5 rounded h-full` };
          }}
          date={currentDate}
          view={currentView}
          onNavigate={handleNavigate}
          onView={handleViewChange}
        />
      </div>
    </div>
  );
};

export default CalendarView;
