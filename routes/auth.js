const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const jwt = require('jsonwebtoken');
const { auth, isTeacher, isStudent } = require('../middleware/auth');

// Login page
router.get('/login', (req, res) => {
  res.render('login', { title: 'Login' });
});

// Student login API endpoint
router.post('/student-login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Find student by username
    const student = await Student.findOne({ username });
    
    if (!student) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Check if password matches (either plain text or hashed)
    const isMatch = student.password === password || 
                   (student.comparePassword && await student.comparePassword(password));
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Create JWT payload
    const payload = {
      id: student._id,
      name: student.name,
      role: 'student',
      batch: student.batch
    };
    
    // Sign token
    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'adhyayanclassessecret',
      { expiresIn: '1d' },
      (err, token) => {
        if (err) throw err;
        
        // Return token and student data
        res.json({
          success: true,
          token,
          student: {
            id: student._id,
            name: student.name,
            username: student.username,
            class: student.class,
            batch: student.batch,
            phoneNumber: student.phoneNumber
          }
        });
      }
    );
  } catch (error) {
    console.error('Student login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Teacher login API endpoint
router.post('/teacher-login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Find teacher by username
    const teacher = await Teacher.findOne({ username });
    
    if (!teacher) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Check if password matches (either plain text or hashed)
    const isMatch = teacher.password === password || 
                   (teacher.comparePassword && await teacher.comparePassword(password));
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Create JWT payload
    const payload = {
      id: teacher._id,
      name: teacher.name,
      role: 'teacher',
      batches: teacher.batches
    };
    
    // Sign token
    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'adhyayanclassessecret',
      { expiresIn: '1d' },
      (err, token) => {
        if (err) throw err;
        
        // Return token and teacher data
        res.json({
          success: true,
          token,
          teacher: {
            id: teacher._id,
            name: teacher.name,
            username: teacher.username,
            subjects: teacher.subjects,
            batches: teacher.batches,
            phoneNumber: teacher.phoneNumber,
            email: teacher.email
          }
        });
      }
    );
  } catch (error) {
    console.error('Teacher login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login process (for session-based auth - legacy)
router.post('/login', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    
    let user;
    
    if (role === 'student') {
      user = await Student.findOne({ username });
    } else if (role === 'teacher') {
      user = await Teacher.findOne({ username });
    }
    
    if (!user) {
      return res.render('login', { 
        title: 'Login',
        error: 'Invalid credentials' 
      });
    }
    
    // Check if password matches (either plain text or hashed)
    const isMatch = user.password === password || 
                   (user.comparePassword && await user.comparePassword(password));
    
    if (!isMatch) {
      return res.render('login', { 
        title: 'Login',
        error: 'Invalid credentials' 
      });
    }
    
    // Set user session
    req.session.user = {
      _id: user._id,
      name: user.name,
      username: user.username,
      role: role
    };
    
    // Redirect based on role
    if (role === 'student') {
      res.redirect('/student/dashboard');
    } else if (role === 'teacher') {
      res.redirect('/teacher/dashboard');
    }
  } catch (error) {
    console.error('Login error:', error);
    res.render('login', { 
      title: 'Login',
      error: 'An error occurred during login' 
    });
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// Home page - redirect to appropriate dashboard or login
router.get('/', (req, res) => {
  if (req.session.user) {
    if (req.session.user.role === 'student') {
      res.redirect('/student/dashboard');
    } else if (req.session.user.role === 'teacher') {
      res.redirect('/teacher/dashboard');
    }
  } else {
    res.redirect('/login');
  }
});

// Get teacher profile data
router.get('/teacher', auth, isTeacher, async (req, res) => {
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

// Update teacher profile
router.put('/teacher/update', auth, isTeacher, async (req, res) => {
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
    
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    
    res.json(teacher);
  } catch (error) {
    console.error('Error updating teacher profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Change password
router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Find user based on role
    let user;
    if (req.user.role === 'teacher') {
      user = await Teacher.findById(req.user.id);
    } else if (req.user.role === 'student') {
      user = await Student.findById(req.user.id);
    }
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if current password is correct
    const isMatch = user.password === currentPassword || 
                   (user.comparePassword && await user.comparePassword(currentPassword));
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get student profile data
router.get('/student', auth, isStudent, async (req, res) => {
  try {
    console.log('Fetching student profile for ID:', req.user.id);
    const student = await Student.findById(req.user.id).select('-password');
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    console.log('Found student:', student.name);
    res.json(student);
  } catch (error) {
    console.error('Error fetching student profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update student profile
router.put('/student/update', auth, isStudent, async (req, res) => {
  try {
    const { phone, address, emergencyContact } = req.body;
    
    console.log('Updating student profile for ID:', req.user.id);
    console.log('Update data:', req.body);
    
    // Build update object
    const updateFields = {};
    if (phone) updateFields.phoneNumber = phone;
    if (address) updateFields.address = address;
    if (emergencyContact) updateFields.emergencyContact = emergencyContact;
    
    const student = await Student.findByIdAndUpdate(
      req.user.id,
      { $set: updateFields },
      { new: true }
    ).select('-password');
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    console.log('Student profile updated successfully');
    res.json(student);
  } catch (error) {
    console.error('Error updating student profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;