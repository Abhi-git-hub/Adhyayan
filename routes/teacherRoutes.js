const express = require('express');
const router = express.Router();
const { isTeacher } = require('../middleware/authMiddleware');

// All routes require teacher authentication
router.use(isTeacher);

// Teacher dashboard
router.get('/dashboard', (req, res) => {
  res.render('teacher/dashboard', {
    title: 'Teacher Dashboard',
    user: req.user
  });
});

module.exports = router; 