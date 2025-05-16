import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-md p-4 flex justify-between items-center">
      <h1 className="text-xl font-semibold text-gray-800">TaskBuddy</h1>
      <div className="w-8 h-8 bg-gray-300 rounded-full"></div> {/* Placeholder for User Profile Icon */}
    </header>
  );
};

export default Header;
