const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import models
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const { generateUsername, ensureUniqueUsername } = require('../utils/username-generator');

// Function to parse date in DD.MM.YYYY format
function parseDate(dateStr) {
  if (!dateStr) return new Date();
  const [day, month, year] = dateStr.split('.');
  return new Date(`${year}-${month}-${day}`);
}

// Function to update students database
async function updateStudentsDatabase(content) {
  try {
    // Clear existing students
    await Student.deleteMany({});
    
    const lines = content.split('\n');
    let currentBatch = '';
    let students = [];
    
    for (let line of lines) {
      line = line.trim();
      if (line.startsWith('Batch name:')) {
        currentBatch = line.split(':')[1].trim().split(' ')[0];
      } else if (line.match(/^\d+\.\s*Name:/)) {
        const studentData = {
          batch: currentBatch,
          name: line.split('Name:')[1].trim(),
          class: '',
          phoneNumber: '',
          dateOfAdmission: new Date()
        };
        
        // Get next lines for additional info
        const nextIndex = lines.indexOf(line);
        for (let i = 1; i <= 4; i++) {
          const nextLine = lines[nextIndex + i]?.trim();
          if (!nextLine) continue;
          
          if (nextLine.startsWith('class:')) {
            studentData.class = nextLine.split(':')[1].trim();
          } else if (nextLine.startsWith('Phone no.')) {
            studentData.phoneNumber = nextLine.split('.')[1].trim();
          } else if (nextLine.toLowerCase().includes('date of admission')) {
            studentData.dateOfAdmission = parseDate(nextLine.split(':')[1].trim());
          }
        }
        
        // Generate username and password
        studentData.username = await ensureUniqueUsername(generateUsername(studentData.name), Student);
        studentData.password = studentData.phoneNumber || 'password123';
        
        // Set default values if missing
        if (!studentData.class) studentData.class = currentBatch === 'Udbhav' ? '7th' : 
                                                   currentBatch === 'Maadhyam' ? '9th' : '10th';
        if (!studentData.phoneNumber) studentData.phoneNumber = '0000000000';
        
        students.push(studentData);
      }
    }
    
    // Save all students
    await Student.insertMany(students);
    console.log('Students database updated successfully');
    console.log('Created students:', students.map(s => ({ name: s.name, username: s.username })));
  } catch (error) {
    console.error('Error updating students database:', error);
  }
}

// Function to update teachers database
async function updateTeachersDatabase(content) {
  try {
    // Clear existing teachers
    await Teacher.deleteMany({});
    
    const lines = content.split('\n');
    let teachers = [];
    let currentTeacher = null;
    
    for (let line of lines) {
      line = line.trim();
      if (line.match(/^\d+\.\s*Name:/)) {
        // Save previous teacher if exists
        if (currentTeacher) {
          teachers.push(currentTeacher);
        }
        
        currentTeacher = {
          name: line.split('Name:')[1].trim(),
          subjects: [],
          batches: [],
          phoneNumber: '0000000000',
          email: '',
          dateOfJoining: new Date(),
          dateOfBirth: new Date()
        };
      } else if (currentTeacher) {
        if (line.startsWith('subjects:')) {
          currentTeacher.subjects = line.split(':')[1].trim().split(',').map(s => s.trim());
        } else if (line.startsWith('Batches:')) {
          currentTeacher.batches = line.split(':')[1].trim().split(',')
            .map(b => b.trim())
            .filter(b => ['Udbhav', 'Maadhyam', 'Vedant'].includes(b));
        } else if (line.startsWith('Phone no.')) {
          currentTeacher.phoneNumber = line.split('.')[1].trim() || '0000000000';
        } else if (line.startsWith('E-mail:')) {
          currentTeacher.email = line.split(':')[1].trim();
        } else if (line.startsWith('DOB:')) {
          currentTeacher.dateOfBirth = parseDate(line.split(':')[1].trim());
        } else if (line.startsWith('Since:')) {
          currentTeacher.dateOfJoining = parseDate('01.01.' + line.split(':')[1].trim());
        }
      }
    }
    
    // Add last teacher
    if (currentTeacher) {
      teachers.push(currentTeacher);
    }
    
    // Add username, password and default email if missing
    for (let teacher of teachers) {
      teacher.username = await ensureUniqueUsername(generateUsername(teacher.name), Teacher);
      teacher.password = teacher.phoneNumber || 'password123';
      teacher.email = teacher.email || `${teacher.name.toLowerCase().replace(/\s+/g, '.')}@adhyayan.edu`;
    }
    
    // Save all teachers
    await Teacher.insertMany(teachers);
    console.log('Teachers database updated successfully');
    console.log('Created teachers:', teachers.map(t => ({ name: t.name, username: t.username })));
  } catch (error) {
    console.error('Error updating teachers database:', error);
  }
}

// Connect to MongoDB and populate database
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Read and process students.txt
    const studentsPath = path.join(__dirname, '../txt_files/students.txt');
    if (fs.existsSync(studentsPath)) {
      const studentsContent = fs.readFileSync(studentsPath, 'utf8');
      await updateStudentsDatabase(studentsContent);
    } else {
      console.log('students.txt not found');
    }
    
    // Read and process teachers.txt
    const teachersPath = path.join(__dirname, '../txt_files/teachers.txt');
    if (fs.existsSync(teachersPath)) {
      const teachersContent = fs.readFileSync(teachersPath, 'utf8');
      await updateTeachersDatabase(teachersContent);
    } else {
      console.log('teachers.txt not found');
    }
    
    console.log('Database population completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }); 