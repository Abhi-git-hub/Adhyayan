const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Get Student and Teacher models
    const Student = require('../models/Student');
    const Teacher = require('../models/Teacher');
    
    // Check if models exist
    console.log('Checking models...');
    if (!Student || !Teacher) {
      console.error('Models not found!');
      process.exit(1);
    }
    
    // Check if comparePassword methods exist
    console.log('Checking comparePassword methods...');
    
    // Ensure Student comparePassword method works
    if (typeof Student.schema.methods.comparePassword !== 'function') {
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
    
    // Ensure Teacher comparePassword method works
    if (typeof Teacher.schema.methods.comparePassword !== 'function') {
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
    
    // Check if there are any students in the database
    const studentCount = await Student.countDocuments();
    console.log(`Found ${studentCount} students in the database`);
    
    // Check if there are any teachers in the database
    const teacherCount = await Teacher.countDocuments();
    console.log(`Found ${teacherCount} teachers in the database`);
    
    // If no students or teachers, try to populate from txt files
    if (studentCount === 0 || teacherCount === 0) {
      console.log('Database is empty or missing data, attempting to populate from txt files...');
      
      // Check if txt_files directory exists
      const txtFilesDir = path.join(__dirname, '../txt_files');
      if (!fs.existsSync(txtFilesDir)) {
        fs.mkdirSync(txtFilesDir, { recursive: true });
        console.log('Created txt_files directory');
      }
      
      // Check if students.txt exists
      const studentsPath = path.join(txtFilesDir, 'students.txt');
      if (fs.existsSync(studentsPath)) {
        console.log('Found students.txt, loading data...');
        const { initWatcher } = require('../utils/file-watcher');
        initWatcher();
      } else {
        console.log('students.txt not found, cannot populate students');
      }
    }
    
    // Ensure all students have passwords set to their phone numbers
    console.log('Ensuring all students have passwords set to their phone numbers...');
    const students = await Student.find({});
    let updatedStudents = 0;
    
    for (const student of students) {
      if (student.password !== student.phoneNumber) {
        student.password = student.phoneNumber || 'password123';
        await student.save({ validateBeforeSave: false });
        updatedStudents++;
      }
    }
    console.log(`Updated passwords for ${updatedStudents} students`);
    
    // Ensure all teachers have passwords set to their phone numbers
    console.log('Ensuring all teachers have passwords set to their phone numbers...');
    const teachers = await Teacher.find({});
    let updatedTeachers = 0;
    
    for (const teacher of teachers) {
      if (teacher.password !== teacher.phoneNumber) {
        teacher.password = teacher.phoneNumber || 'password123';
        await teacher.save({ validateBeforeSave: false });
        updatedTeachers++;
      }
    }
    console.log(`Updated passwords for ${updatedTeachers} teachers`);
    
    // Print sample login credentials for testing
    if (students.length > 0) {
      const sampleStudent = students[0];
      console.log('\nSample student login credentials:');
      console.log(`Username: ${sampleStudent.username}`);
      console.log(`Password: ${sampleStudent.phoneNumber || 'password123'}`);
    }
    
    if (teachers.length > 0) {
      const sampleTeacher = teachers[0];
      console.log('\nSample teacher login credentials:');
      console.log(`Username: ${sampleTeacher.username}`);
      console.log(`Password: ${sampleTeacher.phoneNumber || 'password123'}`);
    }
    
    console.log('\nAuthentication system check completed successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }); 