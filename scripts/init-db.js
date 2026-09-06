const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');

dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/adhyayan';

async function createTestStudent() {
  const existingStudent = await Student.findOne({ username: 'student1' });
  if (existingStudent) {
    console.log('Test student already exists');
    return;
  }

  await Student.create({
    username: 'student1',
    password: 'password123',
    name: 'Test Student',
    class: '10th',
    phoneNumber: '9000000001',
    batch: 'Udbhav'
  });

  console.log('Test student created successfully');
}

async function createTestTeacher() {
  const existingTeacher = await Teacher.findOne({ username: 'teacher1' });
  if (existingTeacher) {
    console.log('Test teacher already exists');
    return;
  }

  await Teacher.create({
    username: 'teacher1',
    password: 'password123',
    name: 'Test Teacher',
    phoneNumber: '9000000002',
    email: 'teacher@test.com',
    subjects: ['Mathematics'],
    batches: ['Udbhav']
  });

  console.log('Test teacher created successfully');
}

async function initializeDatabase() {
  try {
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected');

    await createTestStudent();
    await createTestTeacher();

    console.log('Database initialization completed');
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

initializeDatabase();
