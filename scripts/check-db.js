const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Import models
    const Student = require('../models/Student');
    const Teacher = require('../models/Teacher');
    
    // Check students
    const students = await Student.find({}).sort({ name: 1 });
    console.log(`\nFound ${students.length} students in database:`);
    
    if (students.length > 0) {
      console.log('\nSTUDENTS:');
      console.log('==========');
      students.forEach(student => {
        console.log(`Name: ${student.name}`);
        console.log(`Username: ${student.username}`);
        console.log(`Password: ${student.password}`);
        console.log(`Phone: ${student.phoneNumber}`);
        console.log(`Batch: ${student.batch}`);
        console.log(`Class: ${student.class}`);
        console.log(`Date of Admission: ${student.dateOfAdmission.toISOString().split('T')[0]}`);
        console.log('----------');
      });
    } else {
      console.log('No students found in database!');
    }
    
    // Check teachers
    const teachers = await Teacher.find({}).sort({ name: 1 });
    console.log(`\nFound ${teachers.length} teachers in database:`);
    
    if (teachers.length > 0) {
      console.log('\nTEACHERS:');
      console.log('==========');
      teachers.forEach(teacher => {
        console.log(`Name: ${teacher.name}`);
        console.log(`Username: ${teacher.username}`);
        console.log(`Password: ${teacher.password}`);
        console.log(`Phone: ${teacher.phoneNumber}`);
        console.log(`Email: ${teacher.email}`);
        console.log(`Subjects: ${teacher.subjects.join(', ')}`);
        console.log(`Batches: ${teacher.batches.join(', ')}`);
        console.log(`Date of Birth: ${teacher.dateOfBirth.toISOString().split('T')[0]}`);
        console.log(`Date of Joining: ${teacher.dateOfJoining.toISOString().split('T')[0]}`);
        console.log('----------');
      });
    } else {
      console.log('No teachers found in database!');
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });