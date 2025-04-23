import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { baseUrl } from '../../config';
import './Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  
  const { login, error, user } = useContext(AuthContext);
  const navigate = useNavigate();
  
  // Debug info
  console.log("Login component rendered");
  console.log("API Base URL:", baseUrl);
  console.log("Current AuthContext user:", user);
  
  useEffect(() => {
    // Redirect if already logged in
    if (user) {
      console.log('User already logged in, redirecting to dashboard:', user);
      console.log('Redirect path:', `/${user.role}-dashboard`);
      
      // Use a slight delay to ensure states are properly updated
      const timer = setTimeout(() => {
        if (user.role === 'student') {
          navigate('/student-dashboard');
        } else if (user.role === 'teacher') {
          navigate('/teacher-dashboard');
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [user, navigate]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username || !password) {
      setLoginError('Username and password are required');
      return;
    }
    
    setIsLoading(true);
    setLoginError('');
    
    try {
      console.log(`Attempting to login as ${role} with username: ${username}`);
      console.log('Login endpoint:', `${baseUrl}/api/auth/${role}-login`);
      console.log('Current role selected:', role);
      
      const success = await login(username, password, role);
      
      console.log('Login result:', success);
      console.log('Current user after login attempt:', user);
      
      if (success) {
        console.log(`Login successful, will navigate to /${role}-dashboard`);
        // Add debug to check if role is properly set
        setTimeout(() => {
          const token = localStorage.getItem('token');
          const studentData = localStorage.getItem('studentData');
          const teacherData = localStorage.getItem('teacherData');
          console.log('Token in localStorage:', token ? 'exists' : 'missing');
          console.log('Student data in localStorage:', studentData ? JSON.parse(studentData) : 'missing');
          console.log('Teacher data in localStorage:', teacherData ? JSON.parse(teacherData) : 'missing');
          console.log('Current role selection:', role);
          console.log('Current AuthContext user:', user);
        }, 50);
        // Navigation will happen in the useEffect when user state updates
      } else {
        console.error('Login failed, error from context:', error);
        setLoginError(error || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setLoginError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <img src="/logo.jpg" alt="Adhyayan Classes" className="login-logo" />
          <h1>Adhyayan Classes</h1>
        </div>
        
        <div className="role-toggle">
          <button 
            className={role === 'student' ? 'active' : ''} 
            onClick={() => setRole('student')}
          >
            Student
          </button>
          <button 
            className={role === 'teacher' ? 'active' : ''} 
            onClick={() => setRole('teacher')}
          >
            Teacher
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>
          
          {(error || loginError) && <div className="error-message">{loginError || error}</div>}
          
          <button 
            type="submit" 
            className="login-button" 
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        <div className="login-footer">
          <p>&copy; {new Date().getFullYear()} Adhyayan Classes. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Login; 