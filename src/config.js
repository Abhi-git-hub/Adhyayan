// Configuration for the application

// Determine the API base URL based on environment
const getBaseUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    // Check for specific deployment platforms
    if (window.location.hostname.includes('vercel.app')) {
      return 'https://adhyayan-website.vercel.app';
    }
    if (window.location.hostname.includes('render.com')) {
      return 'https://adhyayan-website.onrender.com';
    }
    if (process.env.REACT_APP_API_URL) {
      return process.env.REACT_APP_API_URL;
    }
    // If we can't determine the environment, use the current origin
    return window.location.origin;
  }
  // Development environment
  return 'http://localhost:3001';
};

// Base URL for API calls
export const baseUrl = getBaseUrl();

// Other configuration values
export const defaultPaginationLimit = 10;
export const maxFileUploadSize = 10 * 1024 * 1024; // 10MB 

// API configuration settings
const config = {
  // Base API URL with correct host
  apiUrl: getBaseUrl(),
  
  // Default timeout for API requests (in milliseconds)
  apiTimeout: 15000,
  
  // Debug mode for extra logging
  debug: process.env.NODE_ENV !== 'production',
  
  // Authorization header name
  authHeader: 'x-auth-token',
  
  // Routes that don't require authentication
  publicRoutes: [
    '/login',
    '/register',
    '/forgot-password',
    '/',
    '/about',
    '/contact'
  ]
};

export default config; 