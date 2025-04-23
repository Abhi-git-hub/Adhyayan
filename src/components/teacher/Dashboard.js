import React, { useContext, useState, useEffect } from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { FaHome, FaBook, FaClipboardList, FaSignOutAlt, FaUser, FaUserGraduate, FaUsers, FaCalendarAlt, FaChartLine } from 'react-icons/fa';
import './Dashboard.css';

// Teacher Dashboard Components
import Home from './Home';
import Students from './Students';
import Notes from './Notes';
import Attendance from './Attendance';
import TestScores from './TestScores';
import Profile from './Profile';
import Footer from '../common/Footer';

const TeacherDashboard = () => {
  const { user, logout, getAuthHeader } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalBatches: 0,
    totalClasses: 0,
    upcomingClasses: 0,
    recentAttendance: 0
  });
  const [batches, setBatches] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        console.log('Fetching dashboard data for teacher ID:', user.id);
        
        // Create auth headers
        const headers = getAuthHeader();
        console.log('Using auth headers:', headers);
        
        // Fetch teacher stats
        console.log('Fetching teacher stats...');
        const statsResponse = await axios.get(`/api/teachers/${user.id}/stats`, { headers });
        console.log('Teacher stats response:', statsResponse.data);
        setStats(statsResponse.data);
        
        // Fetch batches taught by the teacher
        console.log('Fetching teacher batches...');
        const batchesResponse = await axios.get(`/api/teachers/${user.id}/batches`, { headers });
        console.log('Teacher batches response:', batchesResponse.data);
        setBatches(batchesResponse.data);
        
        // Fetch recent activity
        console.log('Fetching teacher activity...');
        const activityResponse = await axios.get(`/api/teachers/${user.id}/activity`, { headers });
        console.log('Teacher activity response:', activityResponse.data);
        setRecentActivity(activityResponse.data);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        const errorMessage = err.response?.data?.message || err.message || 'Unknown error';
        setError(`Failed to load dashboard data: ${errorMessage}. Please try again later.`);
        setLoading(false);
      }
    };

    if (user && user.id) {
      fetchDashboardData();
    } else {
      setError('User information missing. Please log in again.');
      setLoading(false);
    }
  }, [user, getAuthHeader]);

  // Format date to readable format
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleString(undefined, options);
  };

  // Format date for upcoming classes
  const formatClassTime = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { weekday: 'long', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
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
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <h3>Error</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()} className="retry-button">Try Again</button>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-left">
          <button className="mobile-menu-toggle" onClick={toggleMobileMenu}>
            <span></span>
            <span></span>
            <span></span>
          </button>
          <img src="/logo.jpg" alt="Adhyayan Classes" className="dashboard-logo" />
          <h1>Teacher Dashboard</h1>
        </div>
        <div className="header-right">
          <span className="user-name">{user?.name || 'Teacher'}</span>
          <button className="logout-button" onClick={handleLogout}>
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </header>
      
      <div className="dashboard-content">
        <aside className={`dashboard-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
          <nav>
            <ul>
              <li>
                <NavLink to="" end className={({ isActive }) => isActive ? 'active' : ''} onClick={() => setIsMobileMenuOpen(false)}>
                  <FaHome /> Home
                </NavLink>
              </li>
              <li>
                <NavLink to="students" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => setIsMobileMenuOpen(false)}>
                  <FaUserGraduate /> Students
                </NavLink>
              </li>
              <li>
                <NavLink to="notes" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => setIsMobileMenuOpen(false)}>
                  <FaBook /> Notes
                </NavLink>
              </li>
              <li>
                <NavLink to="attendance" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => setIsMobileMenuOpen(false)}>
                  <FaClipboardList /> Attendance
                </NavLink>
              </li>
              <li>
                <NavLink to="test-scores" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => setIsMobileMenuOpen(false)}>
                  <FaClipboardList /> Test Scores
                </NavLink>
              </li>
              <li>
                <NavLink to="profile" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => setIsMobileMenuOpen(false)}>
                  <FaUser /> Profile
                </NavLink>
              </li>
            </ul>
          </nav>
          
          <div className="sidebar-footer">
            <p>Subjects: {user?.subjects?.join(', ') || 'N/A'}</p>
            <p>Batches: {user?.batches?.join(', ') || 'N/A'}</p>
          </div>
        </aside>
        
        <main className="dashboard-main">
          <Routes>
            <Route path="" element={<Home />} />
            <Route path="students" element={<Students />} />
            <Route path="notes" element={<Notes />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="test-scores" element={<TestScores />} />
            <Route path="profile" element={<Profile />} />
          </Routes>
        </main>
      </div>
      
      <Footer />
      
      {isMobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}
    </div>
  );
};

export default TeacherDashboard; 