import React from 'react';

// Define a type for individual support messages
interface SupportMessage {
  id: string;
  icon: string; // Could be an emoji or an SVG icon component
  text: string;
  colorClass: string; // Tailwind CSS class for background/text color
}

// Sample Data
const supportMessages: SupportMessage[] = [
  { id: '1', icon: '💖', text: "You're doing great! Keep up the good work.", colorClass: 'bg-pink-100 text-pink-700' },
  { id: '2', icon: '🧘', text: "Don't forget to take a break and stretch!", colorClass: 'bg-blue-100 text-blue-700' },
  { id: '3', icon: '💡', text: 'Try breaking down large tasks into smaller steps.', colorClass: 'bg-yellow-100 text-yellow-700' },
  { id: '4', icon: '🎉', text: 'Congratulations on completing your tasks!', colorClass: 'bg-green-100 text-green-700' },
];


const SupportPanel: React.FC = () => {
  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Support & Motivation</h2>
      <div className="space-y-3">
        {supportMessages.map(message => (
          <div key={message.id} className={`p-3 rounded-lg flex items-center ${message.colorClass}`}>
            <span className="text-xl mr-3">{message.icon}</span>
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SupportPanel;
