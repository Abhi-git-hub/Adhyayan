import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import jwt_decode from 'jwt-decode';

export const AuthContext = createContext();

// Add the useAuth hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('AuthProvider initialized');
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
      console.log('Token found in localStorage');
      try {
        const decodedToken = jwt_decode(token);
        console.log('Decoded token:', decodedToken);
        console.log('Token role:', decodedToken.role);
        
        // Check if there's a role override in localStorage
        const roleOverride = localStorage.getItem('roleOverride');
        if (roleOverride) {
          console.log('Role override found:', roleOverride);
          decodedToken.role = roleOverride;
        }
        
        // Check if token is expired
        if (decodedToken.exp * 1000 < Date.now()) {
          console.log('Token is expired, removing from localStorage');
          localStorage.removeItem('token');
          localStorage.removeItem('studentData');
          localStorage.removeItem('teacherData');
          localStorage.removeItem('roleOverride');
          setUser(null);
        } else {
          // Set user based on role (which might be overridden)
          const role = decodedToken.role;
          
          if (role === 'student') {
            console.log('Setting user as student');
            const studentData = JSON.parse(localStorage.getItem('studentData') || '{}');
            console.log('Student data from localStorage:', studentData);
            const userData = { ...decodedToken, ...studentData, role: 'student' };
            console.log('Final student user data:', userData);
            setUser(userData);
          } else if (role === 'teacher') {
            console.log('Setting user as teacher');
            const teacherData = JSON.parse(localStorage.getItem('teacherData') || '{}');
            console.log('Teacher data from localStorage:', teacherData);
            const userData = { ...decodedToken, ...teacherData, role: 'teacher' };
            console.log('Final teacher user data:', userData);
            setUser(userData);
          } else {
            console.log('Unknown role in token:', role);
            localStorage.removeItem('token');
            localStorage.removeItem('studentData');
            localStorage.removeItem('teacherData');
            localStorage.removeItem('roleOverride');
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Error decoding token:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('studentData');
        localStorage.removeItem('teacherData');
        localStorage.removeItem('roleOverride');
        setUser(null);
      }
    } else {
      console.log('No token found in localStorage');
    }
    setLoading(false);
  }, []);

  // Login function
  const login = async (username, password, role) => {
    try {
      console.log(`Attempting to login as ${role}:`, username);
      console.log('Selected role for login:', role);
      setError(null);
      const endpoint = role === 'student' ? '/api/auth/student-login' : '/api/auth/teacher-login';
      
      console.log('Making API request to:', endpoint);
      const response = await axios.post(endpoint, { username, password });
      
      console.log('Login response:', response.data);
      const { token, student, teacher } = response.data;
      
      // Decode token to verify role
      const decodedToken = jwt_decode(token);
      console.log('Decoded token after login:', decodedToken);
      console.log('Role from decoded token:', decodedToken.role);
      console.log('Expected role from selection:', role);
      
      // Check for role override
      const roleOverride = localStorage.getItem('roleOverride');
      if (roleOverride) {
        console.log('Using role override:', roleOverride);
        role = roleOverride;
      }
      
      // Verify that the token role matches the selected role
      if (decodedToken.role !== role && !roleOverride) {
        console.error(`Token role (${decodedToken.role}) doesn't match selected role (${role})`);
      }
      
      localStorage.setItem('token', token);
      
      if (role === 'student') {
        console.log('Storing student data in localStorage');
        console.log('Student data to store:', student);
        localStorage.setItem('studentData', JSON.stringify(student));
        const userData = { ...decodedToken, ...student, role: 'student' };
        console.log('Setting user state with:', userData);
        setUser(userData);
      } else {
        console.log('Storing teacher data in localStorage');
        console.log('Teacher data to store:', teacher);
        localStorage.setItem('teacherData', JSON.stringify(teacher));
        const userData = { ...decodedToken, ...teacher, role: 'teacher' };
        console.log('Setting user state with:', userData);
        setUser(userData);
      }
      
      return true;
    } catch (error) {
      console.error('Login error:', error);
      console.error('Error response:', error.response?.data);
      setError(error.response?.data?.message || 'Login failed. Please try again.');
      return false;
    }
  };

  // Logout function
  const logout = () => {
    console.log('Logging out, removing data from localStorage');
    localStorage.removeItem('token');
    localStorage.removeItem('studentData');
    localStorage.removeItem('teacherData');
    setUser(null);
    
    // Don't use window.location.href as it causes page reload issues
    // Instead, let the React Router handle navigation
  };

  // Set up axios interceptors when authcontext is initialized
  useEffect(() => {
    // Add request interceptor to automatically add the token to all requests
    const requestInterceptor = axios.interceptors.request.use(
      config => {
        const token = localStorage.getItem('token');
        if (token) {
          console.log('Axios interceptor: Adding auth headers to request');
          config.headers['x-auth-token'] = token;
          config.headers['Authorization'] = `Bearer ${token}`;
          config.headers['Content-Type'] = config.headers['Content-Type'] || 'application/json';
        }
        return config;
      },
      error => {
        console.error('Axios request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor to handle token expiration
    const responseInterceptor = axios.interceptors.response.use(
      response => response,
      error => {
        if (error.response && error.response.status === 401) {
          console.log('Received 401 Unauthorized response - user may need to re-login');
          // Only logout automatically if token expired message is received
          if (error.response.data && 
              (error.response.data.error === 'token_expired' || 
               error.response.data.message === 'Token is not valid' ||
               error.response.data.message === 'No token, authorization denied')) {
            console.log('Token expired or invalid, logging out');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );

    // Clean up interceptors when component unmounts
    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    console.log('Getting auth header, token exists:', !!token);
    
    if (!token) {
      console.warn('No auth token found in localStorage');
      return {};
    }
    
    // Include Content-Type in the headers to ensure proper API communication
    return {
      'x-auth-token': token,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      error, 
      login, 
      logout, 
      getAuthHeader, 
      authHeaders: { headers: getAuthHeader() }
    }}>
      {children}
    </AuthContext.Provider>
  );
}; 