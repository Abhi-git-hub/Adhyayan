const mongoose = require('mongoose');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create test accounts
const createTestAccounts = async () => {
  try {
    console.log('Clearing existing data...');
    
    // Clear existing data
    await Student.deleteMany({});
    await Teacher.deleteMany({});
    
    console.log('Existing data cleared successfully.');
    
    // Create test student accounts
    const students = [
      {
        username: 'lakshay123',
        password: '8595715727',
        name: 'Lakshay',
        email: 'lakshay@student.adhyayan.com',
        class: '7th',
        batch: 'Udbhav',
        phoneNumber: '8595715727',
        dateOfAdmission: new Date('2025-03-01')
      },
      {
        username: 'sayyam123',
        password: '7678144622',
        name: 'Sayyam',
        email: 'sayyam@student.adhyayan.com',
        class: '8th',
        batch: 'Udbhav',
        phoneNumber: '7678144622',
        dateOfAdmission: new Date('2024-10-01')
      },
      {
        username: 'abhey123',
        password: '9310007717',
        name: 'Abhey Yadav',
        email: 'abhey@student.adhyayan.com',
        class: '9th',
        batch: 'Maadhyam',
        phoneNumber: '9310007717',
        dateOfAdmission: new Date('2024-08-01')
      }
    ];
    
    // Insert students
    for (const student of students) {
      try {
        // Don't hash the password here, let the model do it
        const newStudent = await Student.create(student);
        console.log(`Created student account:\n  Name: ${student.name}\n  Username: ${student.username}\n  Password: ${student.password}\n  Email: ${student.email}\n  Class: ${student.class}\n  Batch: ${student.batch}\n`);
      } catch (error) {
        console.error(`Error creating student ${student.name}:`, error.message);
      }
    }
    
    // Create test teacher account
    const teachers = [
      {
        username: 'abhi123',
        password: '1234567890',
        name: 'Abhi Yadav',
        email: 'abhi@teacher.adhyayan.com',
        subjects: ['Science', 'Maths'],
        batches: ['Maadhyam', 'Vedant'],
        phoneNumber: '1234567890',
        dob: new Date('2006-04-02')
      }
    ];
    
    // Insert teachers
    for (const teacher of teachers) {
      try {
        // Don't hash the password here, let the model do it
        await Teacher.create(teacher);
        console.log(`Created teacher account:\n  Name: ${teacher.name}\n  Username: ${teacher.username}\n  Password: ${teacher.password}\n  Email: ${teacher.email}\n  Subjects: ${teacher.subjects.join(', ')}\n  Batches: ${teacher.batches.join(', ')}\n`);
      } catch (error) {
        console.error(`Error creating teacher ${teacher.name}:`, error.message);
      }
    }
    
    console.log('Test accounts created successfully!');
    mongoose.connection.close();
  } catch (error) {
    console.error('Error creating test accounts:', error);
    mongoose.connection.close();
  }
};

// Connect to MongoDB and create test accounts
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/adhyayan', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('MongoDB connected successfully to:', process.env.MONGODB_URI || 'mongodb://localhost:27017/adhyayan');
  createTestAccounts();
})
.catch(err => {
  console.error('MongoDB connection error:', err);
}); 