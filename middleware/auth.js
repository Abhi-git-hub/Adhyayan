const jwt = require('jsonwebtoken');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');

// Authentication middleware
exports.auth = async (req, res, next) => {
  try {
    console.log(`Auth middleware - Request to ${req.method} ${req.originalUrl}`);
    console.log('Auth middleware - Request content type:', req.headers['content-type']);
    
    // Get token from headers (try both formats)
    let token = req.header('x-auth-token');
    
    // If token not found in x-auth-token header, try Authorization header
    if (!token) {
      const authHeader = req.header('Authorization');
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7); // Remove 'Bearer ' prefix
        console.log('Auth middleware - Token extracted from Authorization header');
      }
    }
    
    // Also check for token in query parameters (for GET requests)
    if (!token && req.query && req.query.token) {
      token = req.query.token;
      console.log('Auth middleware - Token found in query parameters');
    }
    
    // Also check for token in request body (for POST/PUT requests)
    if (!token && req.body && req.body.token) {
      token = req.body.token;
      console.log('Auth middleware - Token found in request body');
    }
    
    console.log('Auth middleware - Token found:', !!token);

    // Check if no token
    if (!token) {
      console.log('Auth middleware - No token found in request');
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Use a fallback JWT secret if environment variable is not set
    const jwtSecret = process.env.JWT_SECRET || 'adhyayanclassessecret';
    
    // Verify token
    try {
      console.log('Auth middleware - Verifying token...');
      const decoded = jwt.verify(token, jwtSecret);
      console.log('Auth middleware - Token verified successfully for user:', decoded.id);
      
      // Add user from payload
      req.user = decoded;
      
      // Save token for subsequent middleware in this request
      req.token = token;
      
      next();
    } catch (jwtError) {
      console.error('Auth middleware - JWT verification error:', jwtError.message);
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          message: 'Token has expired', 
          error: 'token_expired',
          expiredAt: jwtError.expiredAt 
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          message: 'Invalid token', 
          error: 'invalid_token',
          details: jwtError.message 
        });
      } else {
        return res.status(401).json({ 
          message: 'Token verification failed', 
          error: 'token_verification_failed',
          details: jwtError.message 
        });
      }
    }
  } catch (err) {
    console.error('Auth middleware - Unexpected error:', err.message);
    res.status(500).json({ message: 'Server error during authentication' });
  }
};

// Teacher authorization middleware
exports.isTeacher = async (req, res, next) => {
  try {
    console.log('Teacher authorization check for user:', { id: req.user.id, role: req.user.role });
    
    if (req.user.role !== 'teacher') {
      console.log('Authorization failed: User is not a teacher');
      return res.status(403).json({ message: 'Access denied. Teacher role required.' });
    }
    
    // Add a debug header to show authorization was successful
    res.setHeader('X-Auth-Role', 'teacher');
    console.log('Teacher authorization successful');
    
    next();
  } catch (err) {
    console.error('Teacher authorization error:', err);
    res.status(500).json({ message: 'Server error during authorization' });
  }
};

// Student authorization middleware
exports.isStudent = async (req, res, next) => {
  try {
    console.log('Student authorization check for user:', { id: req.user.id, role: req.user.role });
    
    if (req.user.role !== 'student') {
      console.log('Authorization failed: User is not a student');
      return res.status(403).json({ message: 'Access denied. Student role required.' });
    }
    
    // Add a debug header to show authorization was successful
    res.setHeader('X-Auth-Role', 'student');
    console.log('Student authorization successful');
    
    next();
  } catch (err) {
    console.error('Student authorization error:', err);
    res.status(500).json({ message: 'Server error during authorization' });
  }
}; 