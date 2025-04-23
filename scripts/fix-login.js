const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Get Student and Teacher models
    const Student = require('../models/Student');
    const Teacher = require('../models/Teacher');
    
    // Add comparePassword method to Student prototype if it doesn't exist
    if (!Student.schema.methods.comparePassword) {
      console.log('Adding comparePassword method to Student model');
      Student.schema.methods.comparePassword = async function(candidatePassword) {
        try {
          // For plain text passwords (no hashing)
          if (this.password === candidatePassword) {
            return true;
          }
          
          // For hashed passwords
          return await bcrypt.compare(candidatePassword, this.password);
        } catch (error) {
          console.error('Password comparison error:', error);
          return false;
        }
      };
    }
    
    // Add comparePassword method to Teacher prototype if it doesn't exist
    if (!Teacher.schema.methods.comparePassword) {
      console.log('Adding comparePassword method to Teacher model');
      Teacher.schema.methods.comparePassword = async function(candidatePassword) {
        try {
          // For plain text passwords (no hashing)
          if (this.password === candidatePassword) {
            return true;
          }
          
          // For hashed passwords
          return await bcrypt.compare(candidatePassword, this.password);
        } catch (error) {
          console.error('Password comparison error:', error);
          return false;
        }
      };
    }
    
    // Update all students to set password to phone number
    const students = await Student.find({});
    console.log(`Found ${students.length} students`);
    
    for (const student of students) {
      // Set password to phone number
      student.password = student.phoneNumber || 'password123';
      await student.save({ validateBeforeSave: false });
    }
    console.log('Updated all student passwords to match phone numbers');
    
    // Update all teachers to set password to phone number
    const teachers = await Teacher.find({});
    console.log(`Found ${teachers.length} teachers`);
    
    for (const teacher of teachers) {
      // Set password to phone number
      teacher.password = teacher.phoneNumber || 'password123';
      await teacher.save({ validateBeforeSave: false });
    }
    console.log('Updated all teacher passwords to match phone numbers');
    
    console.log('Login fix completed successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }); 
  