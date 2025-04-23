const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const TestScore = require('../models/TestScore');

// Get test scores page with students for the teacher's batches
exports.getTestScoresPage = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user._id);
    const batches = teacher.batches;
    
    // Get all students from the teacher's batches
    const students = await Student.find({ batch: { $in: batches } });
    
    // Group students by batch
    const studentsByBatch = {};
    batches.forEach(batch => {
      studentsByBatch[batch] = students.filter(student => student.batch === batch);
    });
    
    res.render('teacher/test-scores', {
      title: 'Test Scores',
      studentsByBatch,
      batches,
      subjects: teacher.subjects
    });
  } catch (error) {
    console.error('Error in getTestScoresPage:', error);
    res.status(500).render('error', { message: 'Error loading test scores page' });
  }
};

// Add test score for a student
exports.addTestScore = async (req, res) => {
  try {
    const { studentId, subject, testName, score, maxScore, remarks } = req.body;
    const teacher = await Teacher.findById(req.user._id);
    
    const student = await Student.findById(studentId);
    if (!student || !teacher.batches.includes(student.batch)) {
      return res.status(403).json({ error: 'Not authorized for this student' });
    }
    
    if (!teacher.subjects.includes(subject)) {
      return res.status(403).json({ error: 'Not authorized for this subject' });
    }
    
    const testScore = new TestScore({
      student: studentId,
      teacher: teacher._id,
      batch: student.batch,
      subject,
      testName,
      score: Number(score),
      maxScore: Number(maxScore),
      remarks
    });
    
    await testScore.save();
    
    res.json({ success: true, message: 'Test score added successfully' });
  } catch (error) {
    console.error('Error in addTestScore:', error);
    res.status(500).json({ error: 'Error adding test score' });
  }
};

// Get test scores for a student
exports.getStudentTestScores = async (req, res) => {
  try {
    const { studentId } = req.params;
    const teacher = await Teacher.findById(req.user._id);
    
    const student = await Student.findById(studentId);
    if (!student || !teacher.batches.includes(student.batch)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const testScores = await TestScore.find({ student: studentId })
      .sort({ date: -1 })
      .limit(30);
    
    res.json(testScores);
  } catch (error) {
    console.error('Error in getStudentTestScores:', error);
    res.status(500).json({ error: 'Error fetching test scores' });
  }
}; 