import axios from 'axios';
import config from '../config';

// Create a configured axios instance
const api = axios.create({
  baseURL: config.apiUrl,
  timeout: config.apiTimeout,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['x-auth-token'] = token;
    }
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for handling common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log detailed error information in development
    if (config.debug) {
      console.error('API Error Response:');
      console.error('Status:', error.response?.status);
      console.error('Data:', error.response?.data);
      console.error('Headers:', error.response?.headers);
    }

    // Handle authentication errors
    if (error.response?.status === 401) {
      console.log('Authentication error detected');
      // Could redirect to login or trigger auth refresh
    }
    
    return Promise.reject(error);
  }
);

export default api; 