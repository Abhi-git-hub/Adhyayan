const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Create test student
const createTestStudent = async () => {
  try {
    // Check if test student already exists
    const existingStudent = await Student.findOne({ username: 'student1' });
    if (existingStudent) {
      console.log('Test student already exists');
      return;
    }

    // Create new test student
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    const newStudent = new Student({
      username: 'student1',
      password: hashedPassword,
      name: 'Test Student',
      email: 'student@test.com',
      grade: '10th'
    });

    await newStudent.save();
    console.log('Test student created successfully');
  } catch (error) {
    console.error('Error creating test student:', error);
  }
};

// Create test teacher
const createTestTeacher = async () => {
  try {
    // Check if test teacher already exists
    const existingTeacher = await Teacher.findOne({ username: 'teacher1' });
    if (existingTeacher) {
      console.log('Test teacher already exists');
      return;
    }

    // Create new test teacher
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    const newTeacher = new Teacher({
      username: 'teacher1',
      password: hashedPassword,
      name: 'Test Teacher',
      email: 'teacher@test.com',
      subject: 'Mathematics'
    });

    await newTeacher.save();
    console.log('Test teacher created successfully');
  } catch (error) {
    console.error('Error creating test teacher:', error);
  }
};

// Run initialization
const initializeDatabase = async () => {
  try {
    await createTestStudent();
    await createTestTeacher();
    console.log('Database initialization completed');
    process.exit(0);
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
};

initializeDatabase(); 