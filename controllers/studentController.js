const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const TestScore = require('../models/TestScore');
const Note = require('../models/Note');

// Get student dashboard
exports.getDashboard = async (req, res) => {
  try {
    const student = await Student.findById(req.user._id);
    
    // Get recent attendance
    const recentAttendance = await Attendance.find({ student: student._id })
      .sort({ date: -1 })
      .limit(5);
    
    // Get recent test scores
    const recentScores = await TestScore.find({ student: student._id })
      .sort({ date: -1 })
      .limit(5);
    
    // Get recent notes
    const recentNotes = await Note.find({ batch: student.batch })
      .sort({ uploadDate: -1 })
      .limit(5);
    
    // Combine recent activity
    const recentActivity = [
      ...recentAttendance.map(record => ({
        date: record.date,
        type: 'Attendance',
        details: `Marked as ${record.status}`
      })),
      ...recentScores.map(score => ({
        date: score.date,
        type: 'Test Score',
        details: `${score.subject}: ${score.score}/${score.maxScore}`
      })),
      ...recentNotes.map(note => ({
        date: note.uploadDate,
        type: note.type === 'note' ? 'New Note' : 'New Test',
        details: `${note.subject}: ${note.title}`
      }))
    ].sort((a, b) => b.date - a.date).slice(0, 10);
    
    res.render('student/dashboard', {
      title: 'Student Dashboard',
      user: student,
      recentActivity
    });
  } catch (error) {
    console.error('Error in getDashboard:', error);
    res.status(500).render('error', { message: 'Error loading dashboard' });
  }
};

// Get student attendance
exports.getAttendance = async (req, res) => {
  try {
    const student = await Student.findById(req.user._id);
    
    // Get all attendance records
    const attendanceHistory = await Attendance.find({ student: student._id })
      .sort({ date: -1 });
    
    // Calculate attendance summary
    const total = attendanceHistory.length;
    const present = attendanceHistory.filter(record => record.status === 'present').length;
    const absent = attendanceHistory.filter(record => record.status === 'absent').length;
    const late = attendanceHistory.filter(record => record.status === 'late').length;
    
    const attendanceSummary = {
      present,
      absent,
      late,
      presentPercentage: total ? Math.round((present / total) * 100) : 0,
      absentPercentage: total ? Math.round((absent / total) * 100) : 0,
      latePercentage: total ? Math.round((late / total) * 100) : 0
    };
    
    res.render('student/attendance', {
      title: 'My Attendance',
      attendanceSummary,
      attendanceHistory
    });
  } catch (error) {
    console.error('Error in getAttendance:', error);
    res.status(500).render('error', { message: 'Error loading attendance' });
  }
};

// Get student test scores
exports.getTestScores = async (req, res) => {
  try {
    const student = await Student.findById(req.user._id);
    
    // Get all test scores
    const testHistory = await TestScore.find({ student: student._id })
      .sort({ date: -1 });
    
    // Calculate subject-wise performance
    const subjectPerformance = {};
    testHistory.forEach(test => {
      if (!subjectPerformance[test.subject]) {
        subjectPerformance[test.subject] = {
          totalScore: 0,
          totalMaxScore: 0,
          count: 0
        };
      }
      
      subjectPerformance[test.subject].totalScore += test.score;
      subjectPerformance[test.subject].totalMaxScore += test.maxScore;
      subjectPerformance[test.subject].count++;
    });
    
    // Calculate averages and percentages
    Object.keys(subjectPerformance).forEach(subject => {
      const performance = subjectPerformance[subject];
      performance.averageScore = Math.round(performance.totalScore / performance.count);
      performance.maxScore = Math.round(performance.totalMaxScore / performance.count);
      performance.averagePercentage = Math.round((performance.averageScore / performance.maxScore) * 100);
    });
    
    // Add percentage to test history
    const testHistoryWithPercentage = testHistory.map(test => ({
      ...test.toObject(),
      percentage: Math.round((test.score / test.maxScore) * 100)
    }));
    
    res.render('student/test-scores', {
      title: 'My Test Scores',
      subjectPerformance,
      testHistory: testHistoryWithPercentage
    });
  } catch (error) {
    console.error('Error in getTestScores:', error);
    res.status(500).render('error', { message: 'Error loading test scores' });
  }
};

// Get student notes
exports.getNotes = async (req, res) => {
  try {
    const student = await Student.findById(req.user._id);
    
    // Get all notes for student's batch
    const materials = await Note.find({ batch: student.batch })
      .sort({ uploadDate: -1 });
    
    // Get unique subjects for filter
    const subjects = [...new Set(materials.map(material => material.subject))];
    
    res.render('student/notes', {
      title: 'Study Materials',
      materials,
      subjects
    });
  } catch (error) {
    console.error('Error in getNotes:', error);
    res.status(500).render('error', { message: 'Error loading study materials' });
  }
}; 