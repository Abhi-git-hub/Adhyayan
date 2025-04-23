const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { isTeacher } = require('../middleware/authMiddleware');

// All routes require teacher authentication
router.use(isTeacher);

// Get attendance page
router.get('/', attendanceController.getAttendancePage);

// Mark attendance
router.post('/mark', attendanceController.markAttendance);

// Get student attendance history
router.get('/student/:studentId', attendanceController.getStudentAttendance);

module.exports = router; 