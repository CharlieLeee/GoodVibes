'use client';

import React, { useState } from 'react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  isLoading?: boolean; // Optional: to show a loading indicator for AI messages
}

const ChatPanel: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: "Hi there! I'm your AI task assistant. How can I help you today?", sender: 'ai' },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<'openai' | 'togetherai'>('openai'); // Default to OpenAI
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() === '' || isLoading) return;

    const newUserMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
    };
    setMessages(prevMessages => [...prevMessages, newUserMessage]);
    const currentInput = inputValue;
    setInputValue('');
    setIsLoading(true);
    setError(null);

    // Add a temporary loading message for AI response
    const loadingMessageId = (Date.now() + 1).toString();
    setMessages(prevMessages => [...prevMessages, { id: loadingMessageId, text: 'Thinking...', sender: 'ai', isLoading: true }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: currentInput, provider: selectedProvider }),
      });

      // Remove the loading message
      setMessages(prevMessages => prevMessages.filter(msg => msg.id !== loadingMessageId));

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API request failed with status ${response.status}`);
      }

      const data = await response.json();
      const aiResponse: Message = {
        id: (Date.now() + 2).toString(), // Ensure unique ID
        text: data.reply || 'Sorry, I couldn\'t get a response.',
        sender: 'ai',
      };
      setMessages(prevMessages => [...prevMessages, aiResponse]);

    } catch (err: any) {
      console.error('Failed to send message:', err);
      setError(err.message || 'Failed to get a response from the AI.');
      // Optionally, add an error message to the chat
      setMessages(prevMessages => prevMessages.filter(msg => msg.id !== loadingMessageId)); // Ensure loading is removed
      setMessages(prevMessages => [...prevMessages, { 
        id: (Date.now() + 3).toString(), 
        text: `Error: ${err.message || 'Failed to connect to AI.'}`, 
        sender: 'ai' 
      }]);
    }
    setIsLoading(false);
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-4 flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">AI Task Assistant</h2>
        <div className="flex items-center">
          <select 
            value={selectedProvider} 
            onChange={(e) => setSelectedProvider(e.target.value as 'openai' | 'togetherai')}
            className="mr-2 p-1 border border-gray-300 rounded-md text-sm"
            disabled={isLoading}
          >
            <option value="openai">OpenAI</option>
            <option value="togetherai">Together AI</option>
          </select>
          <span className="text-xs text-gray-500">Powered by {selectedProvider === 'openai' ? 'OpenAI' : 'Together AI'}</span>
        </div>
      </div>
      
      {error && (
        <div className="mb-2 p-2 text-sm text-red-700 bg-red-100 rounded-md">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto mb-4 pr-2 space-y-3">
        {messages.map(message => (
          <div
            key={message.id}
            className={`p-3 rounded-lg max-w-[80%] break-words ${
              message.sender === 'user'
                ? 'bg-blue-500 text-white self-end ml-auto'
                : message.isLoading 
                  ? 'bg-gray-100 text-gray-500 self-start mr-auto' 
                  : 'bg-gray-200 text-gray-800 self-start mr-auto'
            }`}
          >
            {message.text}
          </div>
        ))}
      </div>

      <form onSubmit={handleSendMessage} className="flex items-center border-t pt-4">
        <button type="button" className="p-2 text-gray-500 hover:text-gray-700">
          {/* Placeholder for Upload Icon */}
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.122 2.122l7.81-7.81" />
          </svg>
        </button>
        <input
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          placeholder="Describe a task or ask for help..."
          className="flex-1 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mx-2"
          disabled={isLoading}
        />
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          )}
        </button>
      </form>
    </div>
  );
};

export default ChatPanel;

