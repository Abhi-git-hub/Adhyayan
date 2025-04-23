const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const StudentSchema = new mongoose.Schema({
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
  class: {
    type: String,
    required: true
  },
  phoneNumber: {
    type: String,
    required: true,
    default: '0000000000'
  },
  batch: {
    type: String,
    required: true,
    enum: ['Udbhav', 'Maadhyam', 'Vedant']
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
      required: true
    },
    subject: {
      type: String,
      required: true
    },
    score: {
      type: Number,
      required: true
    },
    maxScore: {
      type: Number,
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    },
    remarks: String,
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

// DISABLED password hashing to allow plain text passwords
// StudentSchema.pre('save', async function(next) {
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
StudentSchema.methods.comparePassword = async function(candidatePassword) {
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

module.exports = mongoose.model('Student', StudentSchema); 