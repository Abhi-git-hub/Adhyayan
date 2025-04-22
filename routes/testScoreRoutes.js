const express = require('express');
const router = express.Router();
const testScoreController = require('../controllers/testScoreController');
const { isTeacher } = require('../middleware/authMiddleware');

// All routes require teacher authentication
router.use(isTeacher);

// Get test scores page
router.get('/', testScoreController.getTestScoresPage);

// Add test score
router.post('/add', testScoreController.addTestScore);

// Get student test scores
router.get('/student/:studentId', testScoreController.getStudentTestScores);

module.exports = router; 