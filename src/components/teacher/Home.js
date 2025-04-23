import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';
import { FaUserGraduate, FaBook, FaClipboardList, FaCalendarAlt } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import './Home.css';

const Home = () => {
  const { user, getAuthHeader } = useContext(AuthContext);
  const [stats, setStats] = useState({
    students: 0,
    notes: 0,
    attendance: 0,
    testScores: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const loadTeacherData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Loading teacher data for ID:', user.id);
        
        // Get auth headers
        const authHeaders = getAuthHeader();
        console.log('Using auth headers for teacher data:', authHeaders);
        
        // Try to fetch real data, but fall back to mock data if API endpoints are not available
        try {
          // Fetch teacher stats
          const statsResponse = await axios.get(`/api/teachers/${user.id}/stats`, {
            headers: authHeaders
          });
          console.log('Teacher stats response:', statsResponse.data);
          setStats(statsResponse.data);
          
          // Fetch recent activity
          const activityResponse = await axios.get(`/api/teachers/${user.id}/activity`, {
            headers: authHeaders
          });
          console.log('Teacher activity response:', activityResponse.data);
          setRecentActivity(activityResponse.data);
        } catch (apiError) {
          console.error('Error fetching from API, using mock data:', apiError);
          
          // Fall back to mock data
          const mockStats = {
            students: user.batches ? user.batches.length * 15 : 30,
            notes: 5,
            attendance: 85.5,
            testScores: 10
          };
          
          const mockActivity = [
            {
              type: 'note',
              message: 'You uploaded a new study material',
              timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
            },
            {
              type: 'attendance',
              message: 'You marked attendance for Batch Vedant',
              timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000)
            },
            {
              type: 'test',
              message: 'You added test scores for Mathematics',
              timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
            }
          ];
          
          // Update states with mock data
          setStats(mockStats);
          setRecentActivity(mockActivity);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading teacher data:', error);
        console.error('Error details:', error.response ? error.response.data : 'No response data');
        setError('Failed to load your dashboard data. Please try again later.');
        setLoading(false);
      }
    };
    
    if (user && user.id) {
      loadTeacherData();
    }
  }, [user, getAuthHeader]);
  
  // Format date to readable format
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleString(undefined, options);
  };
  
  // Get time remaining until class
  const getTimeRemaining = (dateString) => {
    const now = new Date();
    const classTime = new Date(dateString);
    const diffMs = classTime - now;
    
    if (diffMs < 0) return 'Started';
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffDays > 0) {
      return `${diffDays}d ${diffHours}h`;
    } else if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    } else {
      return `${diffMinutes}m`;
    }
  };
  
  if (loading) {
    return (
      <div className="teacher-home">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your dashboard data...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="teacher-home">
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button onClick={() => window.location.reload()} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="teacher-home">
      <div className="welcome-section">
        <h2>Welcome, {user?.name || 'Teacher'}!</h2>
        <p className="welcome-message">
          Manage your students, upload study materials, and track academic performance.
        </p>
      </div>
      
      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-icon">
            <FaUserGraduate />
          </div>
          <div className="stat-content">
            <h3>Students</h3>
            <p className="stat-value">{stats.students}</p>
            <p className="stat-label">In Your Batches</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">
            <FaBook />
          </div>
          <div className="stat-content">
            <h3>Study Materials</h3>
            <p className="stat-value">{stats.notes}</p>
            <p className="stat-label">Uploaded Notes</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">
            <FaCalendarAlt />
          </div>
          <div className="stat-content">
            <h3>Attendance</h3>
            <p className="stat-value">{typeof stats.attendance === 'number' ? `${stats.attendance}%` : stats.attendance}</p>
            <p className="stat-label">Average Rate</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">
            <FaClipboardList />
          </div>
          <div className="stat-content">
            <h3>Test Scores</h3>
            <p className="stat-value">{stats.testScores}</p>
            <p className="stat-label">Recorded Tests</p>
          </div>
        </div>
      </div>
      
      <div className="dashboard-sections">
        <div className="info-card teacher-info">
          <h3>Your Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Name:</span>
              <span className="info-value">{user?.name || 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Email:</span>
              <span className="info-value">{user?.email || 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Subjects:</span>
              <span className="info-value">{user?.subjects?.join(', ') || 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Batches:</span>
              <span className="info-value">{user?.batches?.join(', ') || 'N/A'}</span>
            </div>
          </div>
        </div>
        
        <div className="quick-actions">
          <h3>Quick Actions</h3>
          <div className="action-buttons">
            <Link to="/teacher-dashboard/students" className="action-button">
              <FaUserGraduate />
              <span>View Students</span>
            </Link>
            <Link to="/teacher-dashboard/notes" className="action-button">
              <FaBook />
              <span>Upload Notes</span>
            </Link>
            <Link to="/teacher-dashboard/attendance" className="action-button">
              <FaCalendarAlt />
              <span>Mark Attendance</span>
            </Link>
            <Link to="/teacher-dashboard/test-scores" className="action-button">
              <FaClipboardList />
              <span>Add Test Scores</span>
            </Link>
          </div>
        </div>
      </div>
      
      <div className="recent-activity">
        <h3>Recent Activity</h3>
        {recentActivity.length > 0 ? (
          <div className="activity-list">
            {recentActivity.map((activity, index) => (
              <div className="activity-item" key={index}>
                <div className="activity-icon">
                  {activity.type === 'note' && <FaBook />}
                  {activity.type === 'attendance' && <FaCalendarAlt />}
                  {activity.type === 'test' && <FaClipboardList />}
                  {activity.type === 'class' && <FaUserGraduate />}
                </div>
                <div className="activity-content">
                  <h4>{activity.message}</h4>
                  <p className="activity-date">
                    {formatDate(activity.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-activity">No recent activity to display.</p>
        )}
      </div>
    </div>
  );
};

export default Home; 