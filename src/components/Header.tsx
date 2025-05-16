import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-md p-4 flex justify-between items-center">
      <h1 className="text-xl font-semibold">TaskBuddy</h1>
      <nav className="space-x-4">
        <button className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Tasks</button>
        <button className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Calendar</button>
      </nav>
      <div className="w-8 h-8 bg-gray-300 rounded-full"></div> {/* Placeholder for User Profile Icon */}
    </header>
  );
};

export default Header;
