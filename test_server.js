// Simple script to test the chat endpoint
const axios = require('axios');

const API_URL = 'http://localhost:8000/api'; // Adjust if your server is running on a different port

async function testChatEndpoint() {
  try {
    console.log('Testing chat endpoint...');
    const response = await axios.post(`${API_URL}/chat`, {
      message: 'Hello, can you help me?',
      user_id: 'default-user-id' // Replace with a valid user ID from your database
    });
    
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Error testing chat endpoint:');
    console.error('Status:', error.response?.status);
    console.error('Message:', error.message);
    console.error('Response data:', error.response?.data);
  }
}

testChatEndpoint(); 