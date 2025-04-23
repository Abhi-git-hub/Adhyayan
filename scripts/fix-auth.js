const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Function to extract phone number from text
function extractPhoneNumber(text) {
  if (!text) return '0000000000';
  
  const phoneMatch = text.match(/(\d+)/);
  if (phoneMatch && phoneMatch[1]) {
    return phoneMatch[1].trim();
  }
  
  return '0000000000';
}

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Import models
    const Student = require('../models/Student');
    const Teacher = require('../models/Teacher');
    
    // Read txt files
    const studentsPath = path.join(__dirname, '../txt_files/students.txt');
    const teachersPath = path.join(__dirname, '../txt_files/teachers.txt');
    
    // Process students.txt
    if (fs.existsSync(studentsPath)) {
      console.log('Processing students.txt...');
      const studentsContent = fs.readFileSync(studentsPath, 'utf8');
      const lines = studentsContent.split('\n');
      
      // Get all students from database
      const students = await Student.find({});
      console.log(`Found ${students.length} students in database`);
      
      // Create a map of student names to phone numbers
      const studentPhones = {};
      
      let currentStudent = '';
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.match(/^\d+\.\s*Name:/)) {
          currentStudent = line.split('Name:')[1].trim();
        } else if (line.startsWith('Phone no.') && currentStudent) {
          const phone = extractPhoneNumber(line);
          studentPhones[currentStudent] = phone;
          console.log(`Found phone for ${currentStudent}: ${phone}`);
        }
      }
      
      // Update each student's phone number and password
      let updatedCount = 0;
      
      for (const student of students) {
        if (studentPhones[student.name]) {
          student.phoneNumber = studentPhones[student.name];
          student.password = studentPhones[student.name];
          await student.save();
          updatedCount++;
          console.log(`Updated ${student.name} with phone ${student.phoneNumber}`);
        }
      }
      
      console.log(`Updated ${updatedCount} students with correct phone numbers and passwords`);
    } else {
      console.log('students.txt not found');
    }
    
    // Process teachers.txt
    if (fs.existsSync(teachersPath)) {
      console.log('\nProcessing teachers.txt...');
      const teachersContent = fs.readFileSync(teachersPath, 'utf8');
      const lines = teachersContent.split('\n');
      
      // Get all teachers from database
      const teachers = await Teacher.find({});
      console.log(`Found ${teachers.length} teachers in database`);
      
      // Create a map of teacher names to phone numbers
      const teacherPhones = {};
      
      let currentTeacher = '';
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.match(/^\d+\.\s*Name:/)) {
          currentTeacher = line.split('Name:')[1].trim();
        } else if (line.startsWith('Phone no.') && currentTeacher) {
          const phone = extractPhoneNumber(line);
          teacherPhones[currentTeacher] = phone;
          console.log(`Found phone for ${currentTeacher}: ${phone}`);
        }
      }
      
      // Update each teacher's phone number and password
      let updatedCount = 0;
      
      for (const teacher of teachers) {
        if (teacherPhones[teacher.name]) {
          teacher.phoneNumber = teacherPhones[teacher.name];
          teacher.password = teacherPhones[teacher.name];
          await teacher.save();
          updatedCount++;
          console.log(`Updated ${teacher.name} with phone ${teacher.phoneNumber}`);
        }
      }
      
      console.log(`Updated ${updatedCount} teachers with correct phone numbers and passwords`);
    } else {
      console.log('teachers.txt not found');
    }
    
    console.log('\nAuthentication fix completed successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  }); 