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
    default: '0000000000'
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
  notes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Note'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// DISABLED password hashing to allow plain text passwords
// TeacherSchema.pre('save', async function(next) {
//   if (!this.isModified('password')) {
//     return next();
//   }
//   
//   try {
//     const salt = await bcrypt.genSalt(10);
//     this.password = await bcrypt.hash(this.password, salt);
//     next();
//   } catch (error) {
//     next(error);
//   }
// });

// Method to compare passwords - supports both plain text and hashed
TeacherSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    // For plain text passwords (direct comparison)
    if (this.password === candidatePassword) {
      return true;
    }
    
    // For hashed passwords (bcrypt comparison)
    try {
      const bcryptMatch = await bcrypt.compare(candidatePassword, this.password);
      return bcryptMatch;
    } catch (err) {
      // If bcrypt comparison fails (e.g., password is not hashed), return false
      return false;
    }
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
};

module.exports = mongoose.model('Teacher', TeacherSchema);