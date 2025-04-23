const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const { auth, isTeacher } = require('../middleware/auth');

// Get students by batches (teachers only)
router.get('/by-batches', auth, isTeacher, async (req, res) => {
  try {
    const { batches } = req.query;
    
    if (!batches) {
      return res.status(400).json({ message: 'Batches parameter is required' });
    }
    
    const batchesArray = batches.split(',');
    
    // Validate that teacher has access to these batches
    const teacherBatches = req.user.batches || [];
    for (const batch of batchesArray) {
      if (!teacherBatches.includes(batch)) {
        return res.status(403).json({ message: `You do not have access to batch: ${batch}` });
      }
    }
    
    // Find students in these batches
    const students = await Student.find({ batch: { $in: batchesArray } })
      .select('name class batch phoneNumber dateOfAdmission')
      .sort({ name: 1 });
    
    res.json(students);
  } catch (error) {
    console.error('Error fetching students by batches:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a specific student (accessible by teachers who have access to the student's batch)
router.get('/:id', auth, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .select('-password');
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Check if user is authorized to view this student
    if (req.user.role === 'student' && req.user.id !== req.params.id) {
      return res.status(403).json({ message: 'Unauthorized to view this student' });
    }
    
    if (req.user.role === 'teacher') {
      const teacherBatches = req.user.batches || [];
      if (!teacherBatches.includes(student.batch)) {
        return res.status(403).json({ message: 'You do not have access to this student' });
      }
    }
    
    res.json(student);
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get student stats
router.get('/:id/stats', auth, async (req, res) => {
  try {
    // Check if user is authorized to view this student's stats
    if (req.user.role === 'student' && req.user.id !== req.params.id) {
      return res.status(403).json({ message: 'Unauthorized to view these stats' });
    }
    
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // If teacher, check if they have access to this student's batch
    if (req.user.role === 'teacher') {
      const teacherBatches = req.user.batches || [];
      if (!teacherBatches.includes(student.batch)) {
        return res.status(403).json({ message: 'You do not have access to this student' });
      }
    }
    
    // Calculate attendance rate
    let attendanceRate = 0;
    if (student.attendance && student.attendance.length > 0) {
      const presentCount = student.attendance.filter(a => a.status === 'present').length;
      attendanceRate = (presentCount / student.attendance.length) * 100;
    }
    
    // Count upcoming tests (mock data)
    const upcomingTests = 2;
    
    // Count completed assignments (mock data)
    const completedAssignments = 5;
    
    // Calculate average test score
    let averageScore = 0;
    if (student.testScores && student.testScores.length > 0) {
      const totalPercentage = student.testScores.reduce((sum, test) => {
        return sum + ((test.score / test.maxScore) * 100);
      }, 0);
      averageScore = totalPercentage / student.testScores.length;
    }
    
    res.json({
      attendanceRate: attendanceRate.toFixed(1),
      upcomingTests,
      completedAssignments,
      averageScore: averageScore.toFixed(1)
    });
  } catch (error) {
    console.error('Error fetching student stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get student's upcoming classes
router.get('/:id/upcoming-classes', auth, async (req, res) => {
  try {
    // Check if user is authorized to view this student's classes
    if (req.user.role === 'student' && req.user.id !== req.params.id) {
      return res.status(403).json({ message: 'Unauthorized to view these classes' });
    }
    
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // If teacher, check if they have access to this student's batch
    if (req.user.role === 'teacher') {
      const teacherBatches = req.user.batches || [];
      if (!teacherBatches.includes(student.batch)) {
        return res.status(403).json({ message: 'You do not have access to this student' });
      }
    }
    
    // Generate upcoming classes based on student's batch
    const upcomingClasses = [];
    
    // Current date
    const now = new Date();
    
    // Generate classes for the next 7 days
    const subjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English'];
    
    for (let i = 0; i < 5; i++) {
      const classDate = new Date(now);
      classDate.setDate(classDate.getDate() + i + 1);
      
      // Set random hour between 9 AM and 4 PM
      classDate.setHours(9 + Math.floor(Math.random() * 7), 0, 0, 0);
      
      upcomingClasses.push({
        subject: subjects[i % subjects.length],
        teacher: `Teacher ${i + 1}`,
        scheduledAt: classDate,
        location: `Room ${100 + i}`
      });
    }
    
    // Sort by date (earliest first)
    upcomingClasses.sort((a, b) => a.scheduledAt - b.scheduledAt);
    
    res.json(upcomingClasses);
  } catch (error) {
    console.error('Error fetching upcoming classes:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get student's upcoming tests
router.get('/:id/upcoming-tests', auth, async (req, res) => {
  try {
    // Check if user is authorized to view this student's tests
    if (req.user.role === 'student' && req.user.id !== req.params.id) {
      return res.status(403).json({ message: 'Unauthorized to view these tests' });
    }
    
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // If teacher, check if they have access to this student's batch
    if (req.user.role === 'teacher') {
      const teacherBatches = req.user.batches || [];
      if (!teacherBatches.includes(student.batch)) {
        return res.status(403).json({ message: 'You do not have access to this student' });
      }
    }
    
    // Generate upcoming tests
    const upcomingTests = [];
    
    // Current date
    const now = new Date();
    
    // Generate tests for the next 30 days
    const subjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English'];
    
    for (let i = 0; i < 3; i++) {
      const testDate = new Date(now);
      testDate.setDate(testDate.getDate() + (i + 1) * 7); // One test per week
      
      upcomingTests.push({
        subject: subjects[i % subjects.length],
        testName: `${subjects[i % subjects.length]} Test ${i + 1}`,
        scheduledAt: testDate,
        maxScore: 100,
        duration: 60 // minutes
      });
    }
    
    // Sort by date (earliest first)
    upcomingTests.sort((a, b) => a.scheduledAt - b.scheduledAt);
    
    res.json(upcomingTests);
  } catch (error) {
    console.error('Error fetching upcoming tests:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 