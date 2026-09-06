const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const PASSWORD_SALT_ROUNDS = 12;

const StudentSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    maxLength: 32,
    index: true
  },
  password: {
    type: String,
    required: true,
    minLength: 8
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxLength: 100
  },
  class: {
    type: String,
    required: true,
    trim: true,
    maxLength: 50
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true,
    default: '0000000000'
  },
  batch: {
    type: String,
    required: true,
    enum: ['Udbhav', 'Maadhyam', 'Vedant'],
    index: true
  },
  dateOfAdmission: {
    type: Date,
    required: true,
    default: Date.now
  },
  attendance: [{
    date: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late'],
      required: true
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher'
    }
  }],
  testScores: [{
    testName: {
      type: String,
      required: true,
      trim: true,
      maxLength: 120
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxLength: 80
    },
    score: {
      type: Number,
      required: true,
      min: 0
    },
    maxScore: {
      type: Number,
      required: true,
      min: 0
    },
    date: {
      type: Date,
      default: Date.now
    },
    remarks: {
      type: String,
      trim: true,
      maxLength: 500
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher'
    }
  }],
  accessibleNotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Note'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

StudentSchema.pre('save', async function hashPassword(next) {
  try {
    if (!this.isModified('password')) return next();

    // Preserve already-hashed bcrypt values while transparently migrating
    // legacy plaintext passwords the first time the record is saved.
    if (/^\$2[aby]\$\d{2}\$/.test(this.password)) return next();

    this.password = await bcrypt.hash(this.password, PASSWORD_SALT_ROUNDS);
    next();
  } catch (error) {
    next(error);
  }
});

StudentSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Student', StudentSchema);
