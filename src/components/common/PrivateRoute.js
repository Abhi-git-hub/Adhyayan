import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { Spinner } from 'react-bootstrap';

const PrivateRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();
  
  console.log('PrivateRoute - Current user:', user);
  console.log('PrivateRoute - Allowed roles:', allowedRoles);
  console.log('PrivateRoute - Current path:', location.pathname);
  
  if (loading) {
    console.log('PrivateRoute - Loading state, showing spinner');
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }
  
  if (!user) {
    console.log('PrivateRoute - No user found, redirecting to login');
    return <Navigate to="/login" />;
  }
  
  // Check if the user has the appropriate role
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    console.log(`PrivateRoute - User role (${user.role}) not in allowed roles (${allowedRoles.join(', ')})`);
    console.log('PrivateRoute - Redirecting to user\'s appropriate dashboard');
    
    const role = user.role;
    console.log('PrivateRoute - User role for redirect:', role);
    
    // Check if we're already on the correct dashboard path to prevent redirect loops
    if (role === 'student' && !location.pathname.startsWith('/student-dashboard')) {
      console.log('PrivateRoute - Redirecting to student dashboard');
      return <Navigate to="/student-dashboard" replace />;
    } else if (role === 'teacher' && !location.pathname.startsWith('/teacher-dashboard')) {
      console.log('PrivateRoute - Redirecting to teacher dashboard');
      return <Navigate to="/teacher-dashboard" replace />;
    } else if (role !== 'student' && role !== 'teacher') {
      console.log('PrivateRoute - Unknown role, redirecting to login');
      return <Navigate to="/login" replace />;
    }
  }
  
  console.log('PrivateRoute - User has correct role, rendering children');
  return children;
};

export default PrivateRoute; 