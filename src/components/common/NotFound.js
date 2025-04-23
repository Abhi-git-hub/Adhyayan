import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      height: '100vh',
      textAlign: 'center',
      padding: '20px'
    }}>
      <h1 style={{ fontSize: '4rem', marginBottom: '1rem', color: '#001f4d' }}>404</h1>
      <h2 style={{ marginBottom: '2rem', color: '#333' }}>Page Not Found</h2>
      <p style={{ marginBottom: '2rem', color: '#666', maxWidth: '500px' }}>
        The page you are looking for might have been removed, had its name changed,
        or is temporarily unavailable.
      </p>
      <Link 
        to="/login" 
        style={{
          padding: '10px 20px',
          background: 'linear-gradient(90deg, #ffd700, #c0c0c0)',
          color: '#001f4d',
          textDecoration: 'none',
          borderRadius: '5px',
          fontWeight: 'bold',
          boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
        }}
      >
        Go to Login
      </Link>
    </div>
  );
};

export default NotFound; 