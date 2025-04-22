const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');

// Debug info route - for checking API status
router.get('/status', async (req, res) => {
  try {
    res.json({
      status: 'online',
      message: 'API is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 3001
    });
  } catch (error) {
    console.error('Error in status check:', error);
    res.status(500).json({ message: 'Server error during status check' });
  }
});

// Debug endpoint to verify authentication
router.get('/auth-check', auth, (req, res) => {
  try {
    res.json({
      authenticated: true,
      user: {
        id: req.user.id,
        role: req.user.role
      },
      message: 'Your authentication is working correctly'
    });
  } catch (error) {
    console.error('Error in auth check:', error);
    res.status(500).json({ message: 'Server error during auth check' });
  }
});

// Test endpoint for student data fetch
router.get('/student-test/:id', auth, async (req, res) => {
  try {
    // This is a mock endpoint to test student data fetch
    res.json({
      mock: true,
      studentId: req.params.id,
      name: "Test Student",
      batch: "Test Batch",
      attendanceRate: 95,
      upcomingTests: 2,
      completedAssignments: 15,
      averageScore: 85
    });
  } catch (error) {
    console.error('Error in student test endpoint:', error);
    res.status(500).json({ message: 'Server error during student test' });
  }
});

module.exports = router; 