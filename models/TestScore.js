const mongoose = require('mongoose');

const TestScoreSchema = new mongoose.Schema({
  testName: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  batch: {
    type: String,
    required: true,
    enum: ['Udbhav', 'Maadhyam', 'Vedant']
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  maxScore: {
    type: Number,
    required: true,
    min: 0
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  scores: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true
    },
    score: {
      type: Number,
      required: true,
      min: 0
    },
    remarks: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
TestScoreSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to get test scores by student
TestScoreSchema.statics.getByStudent = async function(studentId) {
  try {
    console.log(`Getting test scores for student ID: ${studentId}`);
    
    // Find test scores where student is in the scores array
    const testScores = await this.find({
      'scores.student': studentId
    }).sort({ date: -1 });
    
    console.log(`Found ${testScores.length} test score records containing this student`);
    
    // Extract this student's scores from each test
    const studentScores = [];
    
    for (const test of testScores) {
      const studentScore = test.scores.find(
        score => score.student.toString() === studentId
      );
      
      if (!studentScore) continue;
      
      studentScores.push({
        testId: test._id,
        testName: test.testName || 'Unknown Test',
        subject: test.subject || 'Unknown Subject',
        date: test.date,
        maxScore: test.maxScore,
        score: studentScore.score,
        remarks: studentScore.remarks || ''
      });
    }
    
    console.log(`Extracted ${studentScores.length} individual test scores for this student`);
    return studentScores;
  } catch (error) {
    console.error('Error in getByStudent method:', error);
    throw error;
  }
};

// Static method to get test scores by batch
TestScoreSchema.statics.getByBatch = async function(batch) {
  try {
    console.log(`Getting test scores for batch: ${batch}`);
    
    // Find all test scores for this batch
    const testScores = await this.find({ batch }).sort({ date: -1 });
    
    console.log(`Found ${testScores.length} test score records for batch ${batch}`);
    
    // Process test scores to include student information
    const processedScores = [];
    
    for (const test of testScores) {
      const testData = test.toObject();
      
      // Process each student's score
      for (const score of test.scores) {
        try {
          // Try to find student information
          const Student = mongoose.models.Student || mongoose.model('Student');
          const student = await Student.findById(score.student).select('name');
          
          processedScores.push({
            testId: test._id,
            testName: test.testName || 'Unknown Test',
            subject: test.subject || 'Unknown Subject',
            date: test.date,
            maxScore: test.maxScore,
            studentId: score.student,
            studentName: student ? student.name : 'Unknown Student',
            score: score.score,
            remarks: score.remarks || ''
          });
        } catch (studentError) {
          console.error(`Error processing student ${score.student}:`, studentError);
          
          // Include record even if student lookup fails
          processedScores.push({
            testId: test._id,
            testName: test.testName || 'Unknown Test',
            subject: test.subject || 'Unknown Subject',
            date: test.date,
            maxScore: test.maxScore,
            studentId: score.student,
            studentName: 'Unknown Student',
            score: score.score,
            remarks: score.remarks || ''
          });
        }
      }
    }
    
    console.log(`Processed ${processedScores.length} individual test scores`);
    return processedScores;
  } catch (error) {
    console.error('Error in getByBatch method:', error);
    throw error;
  }
};

// Static method to get average score by student
TestScoreSchema.statics.getAverageByStudent = async function(studentId, subject) {
  console.log('Calculating average scores for student:', studentId);
  try {
    // Get all test scores for this student
    const scores = await this.getByStudent(studentId);
    
    // Filter by subject if provided
    const filteredScores = subject 
      ? scores.filter(score => score.subject === subject)
      : scores;
    
    if (filteredScores.length === 0) {
      console.log('No scores found for calculation');
      return {
        average: 0,
        highest: 0,
        lowest: 0,
        totalTests: 0
      };
    }
    
    // Calculate percentages
    const percentages = filteredScores.map(score => 
      (score.score / score.maxScore) * 100
    );
    
    // Calculate stats
    const average = percentages.reduce((sum, p) => sum + p, 0) / percentages.length;
    const highest = Math.max(...percentages);
    const lowest = Math.min(...percentages);
    
    console.log(`Calculated stats: avg=${average.toFixed(2)}%, high=${highest.toFixed(2)}%, low=${lowest.toFixed(2)}%, total=${filteredScores.length}`);
    
    return {
      average: average.toFixed(1),
      highest: highest.toFixed(1),
      lowest: lowest.toFixed(1),
      totalTests: filteredScores.length
    };
  } catch (error) {
    console.error('Error in getAverageByStudent method:', error);
    return {
      average: 0,
      highest: 0,
      lowest: 0,
      totalTests: 0
    };
  }
};

module.exports = mongoose.model('TestScore', TestScoreSchema); 