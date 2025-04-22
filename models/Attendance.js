const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
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
  status: {
    type: String,
    required: true,
    enum: ['present', 'absent', 'late']
  },
  notes: String
});

// Static method to get attendance by date range and batch
AttendanceSchema.statics.getByDateRangeAndBatch = async function(startDate, endDate, batch) {
  return this.find({
    date: { $gte: startDate, $lte: endDate },
    batch: batch
  }).populate('teacher', 'name').populate('records.student', 'name');
};

// Static method to get attendance by student
AttendanceSchema.statics.getByStudent = async function(studentId, startDate, endDate) {
  return this.find({
    'records.student': studentId,
    date: { $gte: startDate, $lte: endDate }
  }).populate('teacher', 'name');
};

// Static method to get attendance percentage by student
AttendanceSchema.statics.getAttendancePercentage = async function(studentId, startDate, endDate) {
  const attendanceRecords = await this.find({
    'records.student': studentId,
    date: { $gte: startDate, $lte: endDate }
  });
  
  let totalClasses = 0;
  let presentClasses = 0;
  
  attendanceRecords.forEach(record => {
    const studentRecord = record.records.find(r => r.student.toString() === studentId.toString());
    if (studentRecord) {
      totalClasses++;
      if (studentRecord.status === 'present') {
        presentClasses++;
      }
    }
  });
  
  return totalClasses > 0 ? (presentClasses / totalClasses) * 100 : 0;
};

module.exports = mongoose.model('Attendance', AttendanceSchema); 