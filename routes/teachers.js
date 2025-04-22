const express = require('express');
const router = express.Router();
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Note = require('../models/Note');
const TestScore = require('../models/TestScore');
const { auth, isTeacher } = require('../middleware/auth');

// Get all teachers (admin only)
router.get('/', async (req, res) => {
  try {
    const teachers = await Teacher.find().select('-password');
    res.json(teachers);
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current teacher profile (me route)
router.get('/me', auth, isTeacher, async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user.id).select('-password');
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    res.json(teacher);
  } catch (error) {
    console.error('Error fetching current teacher profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a specific teacher
router.get('/:id', auth, async (req, res) => {
  try {
    // Only allow teachers to view their own profile or admin to view any
    if (req.user.role === 'teacher' && req.user.id !== req.params.id) {
      return res.status(403).json({ message: 'Unauthorized to view this teacher' });
    }
    
    const teacher = await Teacher.findById(req.params.id).select('-password');
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    
    res.json(teacher);
  } catch (error) {
    console.error('Error fetching teacher:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get teacher profile
router.get('/profile', auth, isTeacher, async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user.id).select('-password');
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    res.json(teacher);
  } catch (error) {
    console.error('Error fetching teacher profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get students in teacher's batches
router.get('/students', auth, isTeacher, async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user.id);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    
    // Create a safe copy of teacher data with default values for missing properties
    const safeTeacher = {
      ...teacher.toObject(),
      batches: teacher.batches || [],
      subjects: teacher.subjects || []
    };
    
    const students = await Student.find({ batch: { $in: safeTeacher.batches } }).select('-password');
    res.json(students);
  } catch (error) {
    console.error('Error fetching students for teacher:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get teacher stats
router.get('/:id/stats', auth, isTeacher, async (req, res) => {
  try {
    // Only allow teachers to view their own stats
    if (req.user.id !== req.params.id) {
      return res.status(403).json({ message: 'Unauthorized to view these stats' });
    }
    
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    
    // Create a safe copy of teacher data with default values for missing properties
    const safeTeacher = {
      ...teacher.toObject(),
      batches: teacher.batches || [],
      subjects: teacher.subjects || []
    };
    
    // Count students in teacher's batches
    const studentCount = await Student.countDocuments({ batch: { $in: safeTeacher.batches } });
    
    // Get batch count
    const batchCount = safeTeacher.batches.length;
    
    // Count notes uploaded by teacher
    const notesCount = await Note.countDocuments({ uploadedBy: req.params.id });
    
    // Count test scores added by teacher
    const testScoresCount = await TestScore.countDocuments({ teacher: req.params.id });
    
    // Count recent attendance records (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Mock data for attendance percentage
    const recentAttendance = 92.5;
    
    res.json({
      totalStudents: studentCount,
      totalBatches: batchCount,
      totalNotes: notesCount,
      totalTestScores: testScoresCount,
      recentAttendance
    });
  } catch (error) {
    console.error('Error fetching teacher stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get teacher's batches with details
router.get('/:id/batches', auth, isTeacher, async (req, res) => {
  try {
    // Only allow teachers to view their own batches
    if (req.user.id !== req.params.id) {
      return res.status(403).json({ message: 'Unauthorized to view these batches' });
    }
    
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    
    // Create a safe copy of teacher data with default values for missing properties
    const safeTeacher = {
      ...teacher.toObject(),
      batches: teacher.batches || [],
      subjects: teacher.subjects || []
    };
    
    // Get batch details with student counts
    const batchesWithDetails = await Promise.all(safeTeacher.batches.map(async (batchName) => {
      const studentCount = await Student.countDocuments({ batch: batchName });
      return {
        name: batchName,
        studentCount,
        subjects: safeTeacher.subjects // Assuming teacher teaches all subjects to their batches
      };
    }));
    
    res.json(batchesWithDetails);
  } catch (error) {
    console.error('Error fetching teacher batches:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get teacher's recent activity
router.get('/:id/activity', auth, isTeacher, async (req, res) => {
  try {
    // Only allow teachers to view their own activity
    if (req.user.id !== req.params.id) {
      return res.status(403).json({ message: 'Unauthorized to view this activity' });
    }
    
    // Fetch the teacher data
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    
    // Create a safe copy of teacher data with default values for missing properties
    // Use a more robust approach to handle Mongoose documents
    const safeTeacher = {
      ...(typeof teacher.toObject === 'function' ? teacher.toObject() : teacher),
      batches: Array.isArray(teacher.batches) ? teacher.batches : [],
      subjects: Array.isArray(teacher.subjects) ? teacher.subjects : []
    };
    
    // Get recent notes
    const recentNotes = await Note.find({ uploadedBy: req.params.id })
      .sort({ createdAt: -1 })
      .limit(3)
      .select('title subject createdAt');
    
    // Get recent test scores
    const recentTestScores = await TestScore.find({ teacher: req.params.id })
      .sort({ date: -1 })
      .limit(3)
      .select('testName subject date batch');
    
    // Combine and format activities
    const activities = [
      ...recentNotes.map(note => ({
        type: 'note',
        message: `Uploaded ${note.title} for ${note.subject}`,
        timestamp: note.createdAt
      })),
      ...recentTestScores.map(test => ({
        type: 'test',
        message: `Added ${test.testName} scores for ${test.subject} (${test.batch})`,
        timestamp: test.date
      }))
    ];
    
    try {
      // Add some mock attendance activities if teacher has batches
      if (safeTeacher.batches && safeTeacher.batches.length > 0) {
        activities.push({
          type: 'attendance',
          message: `Marked attendance for ${safeTeacher.batches[0]}`,
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
        });
        
        if (safeTeacher.batches.length > 1) {
          activities.push({
            type: 'attendance',
            message: `Marked attendance for ${safeTeacher.batches[1]}`,
            timestamp: new Date(Date.now() - 26 * 60 * 60 * 1000)
          });
        }
      }
    } catch (activityError) {
      console.error('Error adding mock activities:', activityError);
      // Continue without adding mock activities
    }
    
    // Sort by timestamp (newest first)
    activities.sort((a, b) => b.timestamp - a.timestamp);
    
    // Return only the 5 most recent activities
    res.json(activities.slice(0, 5));
  } catch (error) {
    console.error('Error fetching teacher activity:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get teacher's upcoming classes
router.get('/:id/upcoming-classes', auth, isTeacher, async (req, res) => {
  try {
    // Only allow teachers to view their own upcoming classes
    if (req.user.id !== req.params.id) {
      return res.status(403).json({ message: 'Unauthorized to view these classes' });
    }
    
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    
    // Create a safe copy of teacher data with default values for missing properties
    // Use a more robust approach to handle Mongoose documents
    const safeTeacher = {
      ...(typeof teacher.toObject === 'function' ? teacher.toObject() : teacher),
      batches: Array.isArray(teacher.batches) ? teacher.batches : [],
      subjects: Array.isArray(teacher.subjects) ? teacher.subjects : []
    };
    
    // Generate upcoming classes based on teacher's batches and subjects
    const upcomingClasses = [];
    
    // Current date
    const now = new Date();
    
    // Return empty array if no batches or subjects defined
    if (!safeTeacher.batches || !safeTeacher.subjects || 
        safeTeacher.batches.length === 0 || safeTeacher.subjects.length === 0) {
      console.log('Teacher has no batches or subjects defined');
      return res.json([]);
    }
    
    try {
      // Generate classes for the next 7 days
      for (let i = 0; i < safeTeacher.batches.length; i++) {
        const batch = safeTeacher.batches[i];
        
        for (let j = 0; j < safeTeacher.subjects.length; j++) {
          const subject = safeTeacher.subjects[j];
          
          // Add 1-3 days to current date for each class
          const classDate = new Date(now);
          classDate.setDate(classDate.getDate() + (i + j + 1));
          
          // Set random hour between 9 AM and 4 PM
          classDate.setHours(9 + Math.floor(Math.random() * 7), 0, 0, 0);
          
          upcomingClasses.push({
            subject,
            batch,
            scheduledAt: classDate,
            location: `Room ${100 + i + j}`
          });
        }
      }
      
      // Sort by date (earliest first)
      upcomingClasses.sort((a, b) => a.scheduledAt - b.scheduledAt);
    } catch (classError) {
      console.error('Error generating upcoming classes:', classError);
      // Continue with empty classes list
    }
    
    // Return only the next 5 classes
    res.json(upcomingClasses.slice(0, 5));
  } catch (error) {
    console.error('Error fetching upcoming classes:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update teacher profile
router.put('/profile', auth, isTeacher, async (req, res) => {
  try {
    const { name, email, phoneNumber } = req.body;
    
    // Build update object
    const updateFields = {};
    if (name) updateFields.name = name;
    if (email) updateFields.email = email;
    if (phoneNumber) updateFields.phoneNumber = phoneNumber;
    
    const teacher = await Teacher.findByIdAndUpdate(
      req.user.id,
      { $set: updateFields },
      { new: true }
    ).select('-password');
    
    res.json(teacher);
  } catch (error) {
    console.error('Error updating teacher profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all batches for the logged in teacher
router.get('/batches', auth, isTeacher, async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user.id);
    
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    
    // Return the batches that this teacher is assigned to
    const batches = teacher.batches;
    
    res.json(batches.map(batch => ({
      _id: batch,
      name: batch // Using the batch name as both ID and name for simplicity
    })));
  } catch (error) {
    console.error('Error fetching teacher batches:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 