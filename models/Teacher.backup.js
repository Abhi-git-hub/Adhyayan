const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const TeacherSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    maxLength: 12
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  subjects: {
    type: [String],
    default: []
  },
  batches: {
    type: [String],
    enum: ['Udbhav', 'Maadhyam', 'Vedant'],
    default: []
  },
  phoneNumber: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  dateOfJoining: {
    type: Date,
    default: Date.now
  },
  dateOfBirth: {
    type: Date,
    default: Date.now
  },
  publishedNotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Note'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
TeacherSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
TeacherSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Method to set password
TeacherSchema.methods.setPassword = async function(newPassword) {
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(newPassword, salt);
};

// Method to get students in teacher's batches
TeacherSchema.methods.getStudents = async function() {
  const Student = mongoose.model('Student');
  return await Student.find({ batch: { $in: this.batches } });
};

// Method to check if teacher can manage a student
TeacherSchema.methods.canManageStudent = function(student) {
  return this.batches.includes(student.batch);
};

module.exports = mongoose.model('Teacher', TeacherSchema); 