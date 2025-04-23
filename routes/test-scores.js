const express = require('express');
const router = express.Router();
const TestScore = require('../models/TestScore');
const Student = require('../models/Student');
const { auth, isTeacher } = require('../middleware/auth');

// Get all test scores for a batch (teachers only)
router.get('/batch/:batch', auth, isTeacher, async (req, res) => {
  try {
    const { batch } = req.params;
    
    // Validate that teacher has access to this batch
    if (!req.user.batches.includes(batch)) {
      return res.status(403).json({ message: 'You do not have access to this batch' });
    }
    
    const testScores = await TestScore.getByBatch(batch);
    
    res.json(testScores);
  } catch (error) {
    console.error('Error fetching test scores:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get test scores for a specific student (accessible by teachers and the student)
router.get('/student/:studentId', auth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { subject } = req.query;
    
    console.log('Fetching test scores for student:', studentId);
    console.log('User role:', req.user.role, 'User ID:', req.user.id);
    console.log('Request headers:', req.headers);
    
    // Check if user is authorized to view this student's test scores
    if (req.user.role === 'student' && req.user.id !== studentId) {
      return res.status(403).json({ message: 'Unauthorized to view this student\'s test scores' });
    }
    
    if (req.user.role === 'teacher') {
      const student = await Student.findById(studentId);
      if (!student) {
        return res.status(404).json({ message: 'Student not found' });
      }
      
      if (!req.user.batches.includes(student.batch)) {
        return res.status(403).json({ message: 'You do not have access to this student\'s test scores' });
      }
    }
    
    // Find the student to ensure they exist
    const student = await Student.findById(studentId).select('name batch testScores');
    if (!student) {
      console.log(`Student not found with ID: ${studentId}`);
      return res.status(404).json({ message: 'Student not found' });
    }
    
    console.log('Found student:', student.name);
    console.log('Student document has testScores:', !!student.testScores);
    if (student.testScores) {
      console.log('Number of test scores in student document:', student.testScores.length);
    }
    
    let testScores = [];
    
    // Check student's embedded test scores first - this is now the primary source
    if (student.testScores && student.testScores.length > 0) {
      console.log(`Using ${student.testScores.length} embedded test scores from student document`);
      // Convert Mongoose subdocuments to plain objects to avoid issues
      testScores = student.testScores.map(score => score.toObject ? score.toObject() : {...score});
      console.log('First test score in student document:', testScores[0]);
    }
    
    // If no embedded scores, try to get test scores from TestScore model
    if (testScores.length === 0) {
      try {
        console.log(`No embedded scores found. Attempting to retrieve test scores from TestScore model for student: ${studentId}`);
        const modelScores = await TestScore.getByStudent(studentId);
        console.log(`Found ${modelScores.length} test scores in TestScore model`);
        if (modelScores.length > 0) {
          testScores = modelScores;
          console.log('First test score from TestScore model:', testScores[0]);
        }
      } catch (scoreError) {
        console.error('Error retrieving scores from TestScore model:', scoreError);
      }
    }
    
    // Log the final test scores array before filtering
    console.log(`Retrieved ${testScores.length} test scores before filtering`);
    
    // Apply subject filter if provided
    if (subject && testScores.length > 0) {
      console.log(`Filtering test scores by subject: ${subject}`);
      testScores = testScores.filter(score => score.subject === subject);
      console.log(`After filtering by subject, ${testScores.length} scores remain`);
    }
    
    // Calculate average scores based on the available test scores
    let averageStats = { average: 0, highest: 0, lowest: 0, totalTests: testScores.length };
    
    if (testScores.length > 0) {
      try {
        console.log(`Calculating average stats for ${testScores.length} scores`);
        
        // Ensure all test scores have the required fields
        const validScores = testScores.filter(score => 
          score && 
          typeof score.score === 'number' && 
          typeof score.maxScore === 'number' &&
          score.maxScore > 0
        );
        
        console.log(`Found ${validScores.length} valid scores for stats calculation`);
        
        if (validScores.length > 0) {
          const percentages = validScores.map(score => 
            (score.score / score.maxScore) * 100
          );
          
          const average = percentages.reduce((sum, p) => sum + p, 0) / percentages.length;
          const highest = Math.max(...percentages);
          const lowest = Math.min(...percentages);
          
          averageStats = {
            average: average.toFixed(1),
            highest: highest.toFixed(1),
            lowest: lowest.toFixed(1),
            totalTests: validScores.length
          };
          
          console.log('Calculated average stats:', averageStats);
        } else {
          console.log('No valid scores for average calculation');
        }
      } catch (statsError) {
        console.error('Error calculating average stats:', statsError);
      }
    }
    
    console.log('Final response will include scores and averageStats');
    
    // Return both the scores and the average stats
    res.json({
      scores: testScores,
      averageStats
    });
  } catch (error) {
    console.error('Error fetching student test scores:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add test scores for a batch (teachers only)
router.post('/', auth, isTeacher, async (req, res) => {
  try {
    const { testName, subject, batch, date, maxScore, scores } = req.body;
    
    // Validate that teacher has access to this batch
    if (!req.user.batches.includes(batch)) {
      return res.status(403).json({ message: 'You do not have access to this batch' });
    }
    
    // Check if test already exists
    const existingTest = await TestScore.findOne({
      testName,
      subject,
      batch,
      date: new Date(date)
    });
    
    if (existingTest) {
      // Update existing test
      existingTest.maxScore = maxScore;
      existingTest.scores = scores;
      await existingTest.save();
      
      // Update individual student test scores
      for (const score of scores) {
        await Student.findByIdAndUpdate(score.student, {
          $pull: {
            testScores: { testName, subject }
          }
        });
        
        await Student.findByIdAndUpdate(score.student, {
          $push: {
            testScores: {
              testName,
              subject,
              score: score.score,
              maxScore,
              date: new Date(date),
              remarks: score.remarks,
              addedBy: req.user.id
            }
          }
        });
      }
      
      return res.json(existingTest);
    }
    
    // Create new test score record
    const newTestScore = new TestScore({
      testName,
      subject,
      batch,
      date: new Date(date),
      maxScore,
      teacher: req.user.id,
      scores
    });
    
    await newTestScore.save();
    
    // Update individual student test scores
    for (const score of scores) {
      await Student.findByIdAndUpdate(score.student, {
        $push: {
          testScores: {
            testName,
            subject,
            score: score.score,
            maxScore,
            date: new Date(date),
            remarks: score.remarks,
            addedBy: req.user.id
          }
        }
      });
    }
    
    res.status(201).json(newTestScore);
  } catch (error) {
    console.error('Error adding test scores:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a test score (teachers only)
router.put('/:id', auth, isTeacher, async (req, res) => {
  try {
    const { testName, subject, batch, date, maxScore, scores } = req.body;
    
    // Find the test
    const testScore = await TestScore.findById(req.params.id);
    
    if (!testScore) {
      return res.status(404).json({ message: 'Test score not found' });
    }
    
    // Check if teacher is the creator
    if (testScore.teacher.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only update your own test scores' });
    }
    
    // Validate that teacher has access to this batch
    if (!req.user.batches.includes(batch)) {
      return res.status(403).json({ message: 'You do not have access to this batch' });
    }
    
    // Update test score
    testScore.testName = testName;
    testScore.subject = subject;
    testScore.batch = batch;
    testScore.date = new Date(date);
    testScore.maxScore = maxScore;
    testScore.scores = scores;
    
    await testScore.save();
    
    // Update individual student test scores
    // First, remove old test scores
    const oldScores = testScore.scores.map(s => s.student);
    for (const studentId of oldScores) {
      await Student.findByIdAndUpdate(studentId, {
        $pull: {
          testScores: { testName: testScore.testName, subject: testScore.subject }
        }
      });
    }
    
    // Add updated test scores
    for (const score of scores) {
      await Student.findByIdAndUpdate(score.student, {
        $push: {
          testScores: {
            testName,
            subject,
            score: score.score,
            maxScore,
            date: new Date(date),
            remarks: score.remarks,
            addedBy: req.user.id
          }
        }
      });
    }
    
    res.json(testScore);
  } catch (error) {
    console.error('Error updating test score:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a test score (teachers only)
router.delete('/:id', auth, isTeacher, async (req, res) => {
  try {
    const testScore = await TestScore.findById(req.params.id);
    
    if (!testScore) {
      return res.status(404).json({ message: 'Test score not found' });
    }
    
    // Check if teacher is the creator
    if (testScore.teacher.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only delete your own test scores' });
    }
    
    // Remove test scores from students
    for (const score of testScore.scores) {
      await Student.findByIdAndUpdate(score.student, {
        $pull: {
          testScores: { testName: testScore.testName, subject: testScore.subject }
        }
      });
    }
    
    // Delete the test score
    await TestScore.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Test score deleted successfully' });
  } catch (error) {
    console.error('Error deleting test score:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get students for test score entry (teachers only)
router.get('/students/:batch', auth, isTeacher, async (req, res) => {
  try {
    const { batch } = req.params;
    
    // Validate that teacher has access to this batch
    if (!req.user.batches.includes(batch)) {
      return res.status(403).json({ message: 'You do not have access to this batch' });
    }
    
    const students = await Student.find({ batch }).select('name');
    
    res.json(students);
  } catch (error) {
    console.error('Error fetching students for test scores:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get test scores for a teacher (teacher's dashboard)
router.get('/by-teacher', auth, isTeacher, async (req, res) => {
  try {
    const teacherId = req.user.id;
    console.log(`Fetching test scores for teacher: ${teacherId}, batches: ${req.user.batches}`);
    
    // Get all test scores for batches this teacher handles
    const batches = req.user.batches || [];
    
    if (batches.length === 0) {
      console.log('No batches assigned to this teacher');
      return res.json([]);
    }
    
    console.log(`Searching for test scores in batches: ${batches}`);
    
    // Find tests created by this teacher
    const testScores = await TestScore.find({
      $or: [
        { teacher: teacherId },
        { batch: { $in: batches } }
      ]
    }).sort({ date: -1 });
    
    console.log(`Found ${testScores.length} test scores for teacher ${teacherId}`);
    
    // Process the test scores to include student information
    const processedScores = [];
    
    for (const test of testScores) {
      const testData = test.toObject();
      
      // For each score in the test, find the student name
      const processedScoresForTest = await Promise.all(
        test.scores.map(async (score) => {
          try {
            const student = await Student.findById(score.student).select('name batch');
            return {
              testId: test._id,
              testName: test.testName,
              subject: test.subject,
              batch: student ? student.batch : test.batch,
              date: test.date,
              maxScore: test.maxScore,
              studentId: score.student,
              studentName: student ? student.name : 'Unknown Student',
              score: score.score,
              remarks: score.remarks
            };
          } catch (err) {
            console.error(`Error processing score for student ${score.student}:`, err);
            return {
              testId: test._id,
              testName: test.testName,
              subject: test.subject,
              batch: test.batch,
              date: test.date,
              maxScore: test.maxScore,
              studentId: score.student,
              studentName: 'Unknown Student',
              score: score.score,
              remarks: score.remarks
            };
          }
        })
      );
      
      processedScores.push(...processedScoresForTest);
    }
    
    console.log(`Processed ${processedScores.length} individual test scores`);
    
    // Return processed scores
    res.json(processedScores);
  } catch (error) {
    console.error('Error fetching teacher test scores:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get recent test scores for a teacher (fallback endpoint)
router.get('/by-teacher/recent', auth, isTeacher, async (req, res) => {
  try {
    const teacherId = req.user.id;
    console.log(`Fetching recent test scores for teacher: ${teacherId}`);
    
    // Get all batches this teacher teaches
    const batches = req.user.batches || [];
    
    if (batches.length === 0) {
      console.log('No batches assigned to this teacher');
      return res.json([]);
    }
    
    // Find 10 most recent tests for these batches
    const recentTests = await TestScore.find({
      batch: { $in: batches }
    })
    .sort({ date: -1 })
    .limit(10);
    
    console.log(`Found ${recentTests.length} recent tests`);
    
    // Process the test scores to include student information
    const processedScores = [];
    
    for (const test of recentTests) {
      // For each score in the test, add student info if available
      for (const score of test.scores) {
        let studentName = 'Unknown Student';
        let studentBatch = test.batch;
        
        try {
          const student = await Student.findById(score.student).select('name batch');
          if (student) {
            studentName = student.name;
            studentBatch = student.batch;
          }
        } catch (err) {
          console.error(`Error finding student ${score.student}:`, err);
        }
        
        processedScores.push({
          testId: test._id,
          testName: test.testName,
          subject: test.subject,
          batch: studentBatch,
          date: test.date,
          maxScore: test.maxScore,
          studentId: score.student,
          studentName,
          score: score.score,
          remarks: score.remarks
        });
      }
    }
    
    console.log(`Processed ${processedScores.length} individual recent test scores`);
    
    res.json(processedScores);
  } catch (error) {
    console.error('Error fetching recent teacher test scores:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get recent test scores for a student
router.get('/recent/:studentId', auth, async (req, res) => {
  try {
    const { studentId } = req.params;
    console.log(`Fetching recent test scores for student: ${studentId}`);
    
    // Check if user is authorized to view these test scores
    if (req.user.role === 'student' && req.user.id !== studentId) {
      return res.status(403).json({ message: 'Unauthorized to view these test scores' });
    }
    
    // Find student
    const student = await Student.findById(studentId).select('name batch testScores');
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
    
    let scores = [];
    
    // First, try to get scores from the student document
    if (student.testScores && student.testScores.length > 0) {
      console.log(`Using ${student.testScores.length} embedded test scores from student document`);
      // Sort by date, most recent first
      scores = [...student.testScores].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
    }
    
    // If no scores found in student document, try test scores collection
    if (scores.length === 0) {
      console.log('No embedded scores, looking in TestScore collection');
      
      // Find test scores for this student
      const testScores = await TestScore.find({
        'scores.student': studentId
      })
      .sort({ date: -1 })
      .limit(10);
      
      if (testScores.length > 0) {
        console.log(`Found ${testScores.length} tests with scores for this student`);
        
        // Extract student's scores from each test
        for (const test of testScores) {
          const studentScore = test.scores.find(
            score => score.student.toString() === studentId
          );
          
          if (studentScore) {
            scores.push({
              testName: test.testName,
              subject: test.subject,
              score: studentScore.score,
              maxScore: test.maxScore,
              date: test.date,
              remarks: studentScore.remarks || ''
            });
          }
        }
      }
    }
    
    console.log(`Returning ${scores.length} recent test scores`);
    res.json(scores);
  } catch (error) {
    console.error('Error fetching recent test scores:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 