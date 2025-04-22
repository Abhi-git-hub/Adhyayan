import React, { useContext, useState, useEffect } from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { FaHome, FaBook, FaClipboardList, FaSignOutAlt, FaUser, FaCalendarAlt, FaChartLine, FaClipboardCheck, FaUserGraduate, FaPhone, FaEnvelope, FaIdCard, FaCheckCircle, FaTimesCircle, FaExclamationCircle } from 'react-icons/fa';
import './Dashboard.css';

// Student Dashboard Components
import Home from './Home';
import Notes from './Notes';
import TestScores from './TestScores';
import Attendance from './Attendance';
import Profile from './Profile';
import Footer from '../common/Footer';

const Dashboard = () => {
  const { user, logout, getAuthHeader } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
        setError(null);
        
        // Fetch complete student data
        const studentResponse = await axios.get('/api/auth/student', {
          headers: getAuthHeader()
        });
        
        setStudentData(studentResponse.data);
        
        // Fetch student stats
        const statsResponse = await axios.get(`/api/students/${user.id}/stats`, {
          headers: getAuthHeader()
        });
        
        // Fetch recent notes
        const notesResponse = await axios.get(`/api/notes/recent/${user.id}`, {
          headers: getAuthHeader()
        });
        
        setRecentNotes(notesResponse.data);
        
        // Fetch recent test scores
        const testScoresResponse = await axios.get(`/api/test-scores/recent/${user.id}`, {
          headers: getAuthHeader()
        });
        
        setRecentTestScores(testScoresResponse.data);
        
        // Fetch recent attendance
        const attendanceResponse = await axios.get(`/api/attendance/recent/${user.id}`, {
          headers: getAuthHeader()
        });
        
        setRecentAttendance(attendanceResponse.data);
        
        // Set stats from the stats endpoint
        setStats({
          attendanceRate: statsResponse.data.attendanceRate || 0,
          upcomingTests: statsResponse.data.upcomingTests || 0,
          completedAssignments: statsResponse.data.completedAssignments || 0,
          averageScore: statsResponse.data.averageScore || 0
        });
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load your data. Please try again later.');
        setLoading(false);
      }
    };
    
    if (user && user.id) {
      fetchDashboardData();
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
  
  if (error) {
    return (
      <div className="student-dashboard">
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
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-left">
          <button className="mobile-menu-toggle" onClick={toggleMobileMenu}>
            <span></span>
            <span></span>
            <span></span>
          </button>
          <img src="/logo.jpg" alt="Adhyayan Classes" className="dashboard-logo" />
          <h1>Student Dashboard</h1>
        </div>
        <div className="header-right">
          <span className="user-name">{user?.name || 'Student'}</span>
          <button className="logout-button" onClick={handleLogout}>
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </header>
      
      <div className="dashboard-layout">
        <aside className={`dashboard-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
          <div className="sidebar-header">
            <div className="user-info">
              <FaUserGraduate className="user-icon" />
              <div className="user-details">
                <h3>{user?.name || 'Student'}</h3>
                <p>{user?.batch || 'Batch'}</p>
              </div>
            </div>
          </div>
          
          <ul className="sidebar-nav">
            <li>
              <NavLink to="" end className={({ isActive }) => isActive ? 'active' : ''} onClick={() => setIsMobileMenuOpen(false)}>
                <FaHome /> Home
              </NavLink>
            </li>
            <li>
              <NavLink to="notes" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => setIsMobileMenuOpen(false)}>
                <FaBook /> Notes
              </NavLink>
            </li>
            <li>
              <NavLink to="test-scores" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => setIsMobileMenuOpen(false)}>
                <FaClipboardList /> Test Scores
              </NavLink>
            </li>
            <li>
              <NavLink to="attendance" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => setIsMobileMenuOpen(false)}>
                <FaCalendarAlt /> Attendance
              </NavLink>
            </li>
            <li>
              <NavLink to="profile" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => setIsMobileMenuOpen(false)}>
                <FaUser /> Profile
              </NavLink>
            </li>
          </ul>
          
          <div className="sidebar-footer">
            <p>Batch: {user?.batch || 'N/A'}</p>
            <p>Last Login: {new Date().toLocaleDateString()}</p>
          </div>
        </aside>
        
        <main className="dashboard-main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="notes" element={<Notes />} />
            <Route path="test-scores" element={<TestScores />} />
            <Route path="attendance" element={<Attendance />} />
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

export default Dashboard; 