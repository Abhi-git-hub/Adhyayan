const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    addTestUsers();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

async function addTestUsers() {
  try {
    // First, let's drop the collections to start fresh
    try {
      await mongoose.connection.db.collection('students').drop();
      console.log('Students collection dropped');
    } catch (err) {
      console.log('No students collection to drop');
    }
    
    try {
      await mongoose.connection.db.collection('teachers').drop();
      console.log('Teachers collection dropped');
    } catch (err) {
      console.log('No teachers collection to drop');
    }
    
    // Create test student
    const newStudent = new Student({
      username: 'student1',
      password: 'password123',
      name: 'Test Student',
      email: 'student1@example.com',
      class: '10th',
      phoneNumber: '1234567890',
      batch: 'Vedant',
      dateOfAdmission: new Date()
    });
    
    await newStudent.save();
    console.log('Test student added successfully');
    
    // Create test teacher
    const newTeacher = new Teacher({
      username: 'teacher1',
      password: 'password123',
      name: 'Test Teacher',
      email: 'teacher1@example.com',
      phoneNumber: '9876543210',
      subjects: ['Mathematics', 'Science'],
      batches: ['Vedant', 'Udbhav']
    });
    
    await newTeacher.save();
    console.log('Test teacher added successfully');
    
    console.log('Test users setup complete');
    process.exit(0);
  } catch (error) {
    console.error('Error adding test users:', error);
    process.exit(1);
  }
} 