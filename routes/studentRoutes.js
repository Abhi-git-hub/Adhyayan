const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { isStudent } = require('../middleware/authMiddleware');

// All routes require student authentication
router.use(isStudent);

// Dashboard
router.get('/dashboard', studentController.getDashboard);

// Attendance
router.get('/attendance', studentController.getAttendance);

// Test Scores
router.get('/test-scores', studentController.getTestScores);

// Notes
router.get('/notes', studentController.getNotes);

module.exports = router; 