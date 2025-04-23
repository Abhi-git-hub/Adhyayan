import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { FaHome, FaBook, FaClipboardList, FaUser, FaCalendarAlt, FaCheckCircle, FaTimesCircle, FaExclamationCircle, FaPhone, FaEnvelope, FaIdCard, FaClock, FaDownload } from 'react-icons/fa';
import api from '../../utils/api'; // Use the configured API instance
import { mockStudentData, mockStats, mockRecentNotes, mockRecentTestScores, mockRecentAttendance, mockUpcomingClasses } from './mockData';
import './Dashboard.css';
import axios from 'axios';

const Home = () => {
  const { user, getAuthHeader } = useContext(AuthContext);
  const [studentData, setStudentData] = useState(null);
  const [stats, setStats] = useState({
    attendanceRate: 0,
    upcomingTests: 0,
    completedAssignments: 0,
    averageScore: 0
  });
  const [recentNotes, setRecentNotes] = useState([]);
  const [recentTestScores, setRecentTestScores] = useState([]);
  const [recentAttendance, setRecentAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [useMockData, setUseMockData] = useState(false);

  // Enhanced debugging information
  const [debugInfo, setDebugInfo] = useState({
    apiCalls: [],
    lastError: null
  });

  // Function to load mock data
  const loadMockData = () => {
    console.log("Loading mock data for demonstration");
    setStudentData({
      ...mockStudentData,
      name: user?.name || mockStudentData.name,
      email: user?.email || mockStudentData.email,
      batch: user?.batch || mockStudentData.batch
    });
    setStats(mockStats);
    setRecentNotes(mockRecentNotes);
    setRecentTestScores(mockRecentTestScores);
    setRecentAttendance(mockRecentAttendance);
    setUseMockData(true);
    setError('Using demo data due to API connection issues');
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user || !user.id) {
        console.log("No user ID available, cannot fetch data");
        setError("User information is missing. Please log in again.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const headers = getAuthHeader();
        console.log("Auth headers being used:", headers);
        
        // Track API calls for debugging
        const apiCalls = [];
        let apiErrorCount = 0;
        
        // Fetch complete student data
        try {
          console.log("Fetching student data...");
          const studentResponse = await api.get('/api/auth/student');
          console.log("Student data response:", studentResponse.data);
          setStudentData(studentResponse.data);
          apiCalls.push({ endpoint: '/api/auth/student', status: 'success' });
        } catch (err) {
          console.error("Error fetching student data:", err);
          apiCalls.push({ 
            endpoint: '/api/auth/student', 
            status: 'error', 
            message: err.message,
            response: err.response?.data
          });
          apiErrorCount++;
        }
        
        // Fetch student stats
        try {
          console.log(`Fetching stats for student ID: ${user.id}`);
          const statsResponse = await api.get(`/api/students/${user.id}/stats`);
          console.log("Stats response:", statsResponse.data);
          
          // Set stats with fallbacks to prevent NaN or undefined values
          setStats({
            attendanceRate: statsResponse.data.attendanceRate || 0,
            upcomingTests: statsResponse.data.upcomingTests || 0,
            completedAssignments: statsResponse.data.completedAssignments || 0,
            averageScore: statsResponse.data.averageScore || 0
          });
          apiCalls.push({ endpoint: `/api/students/${user.id}/stats`, status: 'success' });
        } catch (err) {
          console.error("Error fetching stats:", err);
          apiCalls.push({ 
            endpoint: `/api/students/${user.id}/stats`, 
            status: 'error', 
            message: err.message,
            response: err.response?.data
          });
          apiErrorCount++;
        }
        
        // Fetch recent notes
        try {
          console.log(`Fetching notes for student ID: ${user.id}`);
          const notesResponse = await api.get(`/api/notes/recent/${user.id}`);
          console.log("Notes response:", notesResponse.data);
          setRecentNotes(notesResponse.data || []);
          apiCalls.push({ endpoint: `/api/notes/recent/${user.id}`, status: 'success' });
        } catch (err) {
          console.error("Error fetching notes:", err);
          apiCalls.push({ 
            endpoint: `/api/notes/recent/${user.id}`, 
            status: 'error', 
            message: err.message,
            response: err.response?.data 
          });
          apiErrorCount++;
        }
        
        // Fetch recent test scores
        try {
          console.log(`Fetching test scores for student ID: ${user.id}`);
          const testScoresResponse = await api.get(`/api/test-scores/recent/${user.id}`);
          console.log("Test scores response:", testScoresResponse.data);
          setRecentTestScores(testScoresResponse.data || []);
          apiCalls.push({ endpoint: `/api/test-scores/recent/${user.id}`, status: 'success' });
        } catch (err) {
          console.error("Error fetching test scores:", err);
          apiCalls.push({ 
            endpoint: `/api/test-scores/recent/${user.id}`, 
            status: 'error', 
            message: err.message,
            response: err.response?.data 
          });
          apiErrorCount++;
        }
        
        // Fetch recent attendance
        try {
          console.log(`Fetching attendance for student ID: ${user.id}`);
          const attendanceResponse = await api.get(`/api/attendance/recent/${user.id}`);
          console.log("Attendance response:", attendanceResponse.data);
          setRecentAttendance(attendanceResponse.data || []);
          apiCalls.push({ endpoint: `/api/attendance/recent/${user.id}`, status: 'success' });
        } catch (err) {
          console.error("Error fetching attendance:", err);
          apiCalls.push({ 
            endpoint: `/api/attendance/recent/${user.id}`, 
            status: 'error', 
            message: err.message,
            response: err.response?.data 
          });
          apiErrorCount++;
        }
        
        // Store API calls for debugging
        setDebugInfo({ apiCalls, lastError: null });
        
        // If most API calls failed, use mock data
        if (apiErrorCount >= 4) { // More than half of the API calls failed
          loadMockData();
        } else if (apiErrorCount > 0) {
          // Some API calls failed but not enough to switch to mock data
          setError('Some data could not be loaded, but we\'ve displayed what we could fetch.');
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error in dashboard data fetch process:', error);
        setDebugInfo({ 
          apiCalls: debugInfo.apiCalls, 
          lastError: {
            message: error.message,
            stack: error.stack,
            response: error.response?.data
          } 
        });
        
        // Use mock data as fallback for complete failure
        loadMockData();
        setLoading(false);
      }
    };
    
    if (user && user.id) {
      console.log("Starting data fetch for user:", user.id);
      fetchDashboardData();
    } else {
      console.log("No user data available");
      setLoading(false);
      setError("Please log in to view your dashboard");
    }
  }, [user, getAuthHeader]);
  
  const getStatusIcon = (status) => {
    switch (status) {
      case 'present':
        return <FaCheckCircle className="status-icon present" />;
      case 'absent':
        return <FaTimesCircle className="status-icon absent" />;
      case 'late':
        return <FaExclamationCircle className="status-icon late" />;
      default:
        return null;
    }
  };
  
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };
  
  const formatTime = (dateString) => {
    const options = { hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleTimeString('en-US', options);
  };
  
  const getTimeRemaining = (dateString) => {
    const now = new Date();
    const classTime = new Date(dateString);
    const diffMs = classTime - now;
    
    if (diffMs < 0) return 'Past';
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ${diffHours} hr${diffHours > 1 ? 's' : ''}`;
    } else {
      return `${diffHours} hr${diffHours > 1 ? 's' : ''}`;
    }
  };

  // Add this handler function to the component
  const handleDownload = async (event, noteId, title) => {
    event.preventDefault();
    console.log(`Attempting to download note: ${noteId}`);
    
    try {
      // Get auth token from context or localStorage
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('No auth token found');
        return;
      }
      
      const response = await axios.get(`/api/notes/download/${noteId}`, {
        responseType: 'blob',
        headers: {
          'x-auth-token': token
        }
      });
      
      // Create a blob URL from the response data
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Create a download link and click it
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (error) {
      console.error('Error downloading note:', error);
      alert('Failed to download the note. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="student-dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your dashboard data...</p>
        </div>
      </div>
    );
  }
  
  if (error && !useMockData) {
    return (
      <div className="student-dashboard">
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button onClick={() => loadMockData()} className="retry-button" style={{marginRight: '10px'}}>
            Use Demo Data
          </button>
          <button onClick={() => window.location.reload()} className="retry-button">
            Try Again
          </button>
          {debugInfo.apiCalls.some(call => call.status === 'error') && (
            <div className="debug-info" style={{marginTop: '20px', textAlign: 'left', backgroundColor: '#f8f8f8', padding: '15px', borderRadius: '5px', fontSize: '12px'}}>
              <p>API diagnostic information:</p>
              <ul>
                {debugInfo.apiCalls.map((call, index) => (
                  <li key={index} style={{color: call.status === 'error' ? 'red' : 'green', marginBottom: '5px'}}>
                    {call.endpoint}: {call.status} {call.message ? `(${call.message})` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="student-dashboard">
      {useMockData && (
        <div className="mock-data-notice" style={{backgroundColor: '#fffbea', padding: '10px', marginBottom: '20px', borderRadius: '5px', border: '1px solid #ffd700'}}>
          <p style={{margin: 0, fontSize: '14px', color: '#665500'}}>
            <strong>Note:</strong> Showing demonstration data due to connection issues. Some features may be limited.
          </p>
        </div>
      )}
      <div className="welcome-section">
        <h2>Welcome, {studentData?.name || user?.name || 'Student'}!</h2>
        <p className="welcome-message">
          Track your academic progress, access study materials, and stay updated with your performance.
        </p>
      </div>
      
      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-icon">
            <FaCalendarAlt />
          </div>
          <div className="stat-content">
            <h3>Attendance</h3>
            <p className="stat-value">{stats.attendanceRate}%</p>
            <p className="stat-label">Overall Attendance</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">
            <FaClipboardList />
          </div>
          <div className="stat-content">
            <h3>Test Performance</h3>
            <p className="stat-value">{stats.averageScore}%</p>
            <p className="stat-label">Average Score</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">
            <FaBook />
          </div>
          <div className="stat-content">
            <h3>Assignments</h3>
            <p className="stat-value">{stats.completedAssignments}</p>
            <p className="stat-label">Completed</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">
            <FaCalendarAlt />
          </div>
          <div className="stat-content">
            <h3>Upcoming Tests</h3>
            <p className="stat-value">{stats.upcomingTests}</p>
            <p className="stat-label">Scheduled</p>
          </div>
        </div>
      </div>
      
      <div className="info-section">
        <div className="info-card personal-info">
          <h3>Personal Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <FaUser className="info-icon" />
              <span className="info-label">Name:</span>
              <span className="info-value">{studentData?.name || user?.name || 'N/A'}</span>
            </div>
            <div className="info-item">
              <FaIdCard className="info-icon" />
              <span className="info-label">Username:</span>
              <span className="info-value">{studentData?.username || user?.username || 'N/A'}</span>
            </div>
            <div className="info-item">
              <FaEnvelope className="info-icon" />
              <span className="info-label">Email:</span>
              <span className="info-value">{studentData?.email || user?.email || 'N/A'}</span>
            </div>
            <div className="info-item">
              <FaPhone className="info-icon" />
              <span className="info-label">Phone:</span>
              <span className="info-value">{studentData?.phoneNumber || 'N/A'}</span>
            </div>
          </div>
        </div>
        
        <div className="info-card academic-info">
          <h3>Academic Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Class:</span>
              <span className="info-value">{studentData?.class || user?.class || 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Batch:</span>
              <span className="info-value">{studentData?.batch || user?.batch || 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Admission Date:</span>
              <span className="info-value">
                {studentData?.dateOfAdmission 
                  ? formatDate(studentData.dateOfAdmission)
                  : user?.dateOfAdmission 
                    ? formatDate(user.dateOfAdmission)
                    : 'N/A'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Subjects:</span>
              <span className="info-value">
                {studentData?.batch === 'Udbhav' ? 'Science, Maths, English' : 
                 studentData?.batch === 'Maadhyam' ? 'Science, Maths, Social Studies' : 
                 studentData?.batch === 'Vedant' ? 'Physics, Chemistry, Maths' : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="dashboard-grid">
        <div className="dashboard-section recent-test-scores">
          <h3>Recent Test Scores</h3>
          <div className="activity-list">
            {recentTestScores && recentTestScores.length > 0 ? (
              recentTestScores.map((test, index) => (
                <div className="activity-item" key={index}>
                  <div className="activity-icon">
                    <FaClipboardList />
                  </div>
                  <div className="activity-content">
                    <h4>{test.testName}</h4>
                    <p>Subject: {test.subject}</p>
                    <p>Score: {test.score}/{test.maxScore} ({((test.score/test.maxScore) * 100).toFixed(1)}%)</p>
                    <p className="activity-date">
                      {formatDate(test.date)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="no-activity">No recent test scores available.</p>
            )}
          </div>
        </div>
        
        <div className="dashboard-section recent-notes">
          <h3>Recent Notes</h3>
          <div className="activity-list">
            {recentNotes && recentNotes.length > 0 ? (
              recentNotes.map((note, index) => (
                <div className="activity-item" key={index}>
                  <div className="activity-icon">
                    <FaBook />
                  </div>
                  <div className="activity-content">
                    <h4>{note.title}</h4>
                    <p>Subject: <strong>{note.subject}</strong></p>
                    <p>By: <strong>{note.author?.name || 'Teacher'}</strong></p>
                    <p className="activity-date">
                      <FaClock /> {formatDate(note.createdAt)}
                    </p>
                    <a 
                      href="#"
                      className="download-link"
                      onClick={(e) => handleDownload(e, note._id, note.title)}
                    >
                      <FaDownload /> Download Note
                    </a>
                  </div>
                </div>
              ))
            ) : (
              <p className="no-activity">No recent notes available.</p>
            )}
          </div>
        </div>
        
        <div className="dashboard-section recent-attendance">
          <h3>Recent Attendance</h3>
          <div className="activity-list">
            {recentAttendance && recentAttendance.length > 0 ? (
              recentAttendance.map((record, index) => (
                <div className="activity-item" key={index}>
                  <div className="activity-icon">
                    {getStatusIcon(record.status)}
                  </div>
                  <div className="activity-content">
                    <h4>{record.status.charAt(0).toUpperCase() + record.status.slice(1)}</h4>
                    <p className="activity-date">
                      {formatDate(record.date)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="no-activity">No recent attendance records available.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home; 