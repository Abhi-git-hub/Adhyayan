const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const bcrypt = require('bcryptjs');

// Login page
router.get('/login', (req, res) => {
  res.render('login', { title: 'Login' });
});

// Login process
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

module.exports = router; 