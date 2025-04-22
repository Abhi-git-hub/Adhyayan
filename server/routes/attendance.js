const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const Batch = require('../models/Batch');

// @route   POST /api/attendance
// @desc    Record attendance for a batch
// @access  Private (Teachers only)
router.post('/', auth, async (req, res) => {
  try {
    console.log('Attendance POST request received:', {
      user: req.user.id,
      role: req.user.role,
      body: req.body
    });

    // Check if user is a teacher
    if (req.user.role !== 'teacher') {
      console.log('Unauthorized attendance submission attempt by non-teacher');
      return res.status(403).json({ message: 'Only teachers can record attendance' });
    }

    const { batch, date, attendanceRecords } = req.body;

    if (!batch || !date || !attendanceRecords || !Array.isArray(attendanceRecords)) {
      console.log('Invalid attendance data:', { batch, date, recordsProvided: !!attendanceRecords });
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if batch exists
    const batchExists = await Batch.findById(batch);
    if (!batchExists) {
      console.log('Batch not found:', batch);
      return res.status(404).json({ message: 'Batch not found' });
    }

    console.log(`Processing attendance for batch ${batchExists.name}, date ${date}, ${attendanceRecords.length} records`);

    // Delete any existing attendance records for this batch and date
    const deleteResult = await Attendance.deleteMany({
      batch,
      date: new Date(date)
    });
    
    console.log('Deleted existing attendance records:', deleteResult);

    // Create new attendance records
    const records = attendanceRecords.map(record => ({
      student: record.student,
      batch,
      date: new Date(date),
      present: record.present,
      recordedBy: req.user.id
    }));

    const insertResult = await Attendance.insertMany(records);
    console.log(`Successfully inserted ${insertResult.length} attendance records`);

    // Return success
    res.json({ 
      message: 'Attendance recorded successfully',
      count: insertResult.length
    });
  } catch (err) {
    console.error('Error recording attendance:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// @route   GET /api/attendance/student
// @desc    Get attendance for current student
// @access  Private (Students only)
router.get('/student', auth, async (req, res) => {
  try {
    console.log('Student attendance GET request received:', {
      user: req.user.id,
      role: req.user.role
    });

    // Check if user is a student
    if (req.user.role !== 'student') {
      console.log('Unauthorized student attendance access attempt by non-student');
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get student's batch
    const student = await Student.findOne({ user: req.user.id });
    if (!student) {
      console.log('Student profile not found for user:', req.user.id);
      return res.status(404).json({ message: 'Student profile not found' });
    }

    console.log(`Fetching attendance for student ${student._id} (${student.name})`);

    // Get attendance records for this student
    const attendance = await Attendance.find({ student: student._id })
      .sort({ date: -1 })
      .populate('batch', 'name');

    console.log(`Found ${attendance.length} attendance records for student`);
    
    res.json(attendance);
  } catch (err) {
    console.error('Error fetching student attendance:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// @route   GET /api/attendance/batch/:batchId
// @desc    Get attendance for a specific batch
// @access  Private (Teachers only)
router.get('/batch/:batchId', auth, async (req, res) => {
  try {
    console.log('Batch attendance GET request received:', {
      user: req.user.id,
      role: req.user.role,
      batchId: req.params.batchId,
      date: req.query.date
    });

    // Check if user is a teacher
    if (req.user.role !== 'teacher') {
      console.log('Unauthorized batch attendance access attempt by non-teacher');
      return res.status(403).json({ message: 'Access denied' });
    }

    const { batchId } = req.params;
    const { date } = req.query;

    // Validate batchId
    if (!batchId) {
      return res.status(400).json({ message: 'Batch ID is required' });
    }

    // Create query object
    const query = { batch: batchId };
    
    // Add date filter if provided
    if (date) {
      // Convert to Date object
      const dateObj = new Date(date);
      query.date = dateObj;
    }

    console.log('Attendance query:', query);

    // Get attendance records
    const attendance = await Attendance.find(query)
      .populate('student', 'name rollNumber')
      .sort({ date: -1 });

    console.log(`Found ${attendance.length} attendance records for batch`);
    
    res.json(attendance);
  } catch (err) {
    console.error('Error fetching batch attendance:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// @route   GET /api/attendance/summary/student/:studentId
// @desc    Get attendance summary for a student
// @access  Private (Teachers and Students)
router.get('/summary/student/:studentId', auth, async (req, res) => {
  try {
    console.log('Student attendance summary GET request received:', {
      user: req.user.id,
      role: req.user.role,
      studentId: req.params.studentId
    });

    const { studentId } = req.params;

    // Check if user is authorized
    if (req.user.role === 'student') {
      // If student, they can only access their own attendance
      const student = await Student.findOne({ user: req.user.id });
      if (!student || student._id.toString() !== studentId) {
        console.log('Unauthorized attempt to access another student\'s attendance');
        return res.status(403).json({ message: 'Access denied' });
      }
    } else if (req.user.role !== 'teacher') {
      console.log('Unauthorized attendance summary access attempt');
      return res.status(403).json({ message: 'Access denied' });
    }

    // Calculate attendance percentage
    const totalAttendance = await Attendance.countDocuments({ student: studentId });
    const presentAttendance = await Attendance.countDocuments({ 
      student: studentId,
      present: true
    });

    // Calculate percentage
    const attendancePercentage = totalAttendance === 0 
      ? 0 
      : (presentAttendance / totalAttendance) * 100;

    // Get recent attendance records
    const recentAttendance = await Attendance.find({ student: studentId })
      .sort({ date: -1 })
      .limit(10)
      .populate('batch', 'name');

    console.log('Attendance summary calculated:', {
      total: totalAttendance,
      present: presentAttendance,
      percentage: attendancePercentage.toFixed(2)
    });
    
    res.json({
      total: totalAttendance,
      present: presentAttendance,
      percentage: attendancePercentage.toFixed(2),
      recent: recentAttendance
    });
  } catch (err) {
    console.error('Error fetching attendance summary:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router; 