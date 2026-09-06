const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const PASSWORD_SALT_ROUNDS = 12;

const TeacherSchema = new mongoose.Schema({
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
  subjects: {
    type: [String],
    default: ['Default Subject']
  },
  batches: {
    type: [String],
    enum: ['Udbhav', 'Maadhyam', 'Vedant'],
    default: ['Udbhav']
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true,
    default: '0000000000'
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  dateOfJoining: {
    type: Date,
    default: Date.now
  },
  dateOfBirth: {
    type: Date,
    default: Date.now
  },
  notes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Note'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

TeacherSchema.pre('save', async function hashPassword(next) {
  try {
    if (!this.isModified('password')) return next();

    // Preserve bcrypt hashes and transparently migrate legacy plaintext values.
    if (/^\$2[aby]\$\d{2}\$/.test(this.password)) return next();

    this.password = await bcrypt.hash(this.password, PASSWORD_SALT_ROUNDS);
    next();
  } catch (error) {
    next(error);
  }
});

TeacherSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Teacher', TeacherSchema);
