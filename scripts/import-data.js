const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Function to parse date in DD.MM.YYYY format
function parseDate(dateStr) {
  if (!dateStr) return new Date();
  
  try {
    const [day, month, year] = dateStr.split('.');
    return new Date(`${year}-${month}-${day}`);
  } catch (error) {
    console.error('Error parsing date:', dateStr);
    return new Date();
  }
}

// Function to extract phone number from text
function extractPhoneNumber(text) {
  if (!text) return '0000000000';
  
  const phoneMatch = text.match(/(\d+)/);
  if (phoneMatch && phoneMatch[1]) {
    return phoneMatch[1].trim();
  }
  
  return '0000000000';
}

// Function to generate a username from a name
function generateUsername(name) {
  if (!name) return 'user' + Math.floor(Math.random() * 10000);
  
  // Take first 4 characters of the name and add a random number
  const namePart = name.toLowerCase().replace(/[^a-z]/g, '').substring(0, 4);
  const randomNum = Math.floor(Math.random() * 10000);
  return namePart + randomNum;
}

// Function to ensure username is unique
async function ensureUniqueUsername(username, Model) {
  const existingUser = await Model.findOne({ username });
  if (!existingUser) return username;
  
  // If username exists, add a random number
  return username + Math.floor(Math.random() * 1000);
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
    
    // Get existing data to preserve usernames
    const existingStudents = await Student.find({});
    const existingTeachers = await Teacher.find({});
    
    console.log(`Found ${existingStudents.length} existing students`);
    console.log(`Found ${existingTeachers.length} existing teachers`);
    
    // Create maps of existing usernames
    const studentUsernames = {};
    const teacherUsernames = {};
    
    existingStudents.forEach(student => {
      studentUsernames[student.name] = student.username;
    });
    
    existingTeachers.forEach(teacher => {
      teacherUsernames[teacher.name] = teacher.username;
    });
    
    // Process students.txt
    if (fs.existsSync(studentsPath)) {
      console.log('Processing students.txt...');
      const studentsContent = fs.readFileSync(studentsPath, 'utf8');
      const lines = studentsContent.split('\n');
      
      let currentBatch = '';
      let students = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.startsWith('Batch name:')) {
          currentBatch = line.split(':')[1].trim().split(' ')[0];
          console.log(`Processing batch: ${currentBatch}`);
        } else if (line.match(/^\d+\.\s*Name:/)) {
          const studentName = line.split('Name:')[1].trim();
          console.log(`Processing student: ${studentName}`);
          
          // Create student object with defaults
          const studentData = {
            name: studentName,
            batch: currentBatch,
            class: currentBatch === 'Udbhav' ? '7th' : 
                  currentBatch === 'Maadhyam' ? '9th' : '10th',
            phoneNumber: '0000000000',
            dateOfAdmission: new Date()
          };
          
          // Look for additional info in the next few lines
          for (let j = 1; j <= 5; j++) {
            if (i + j < lines.length) {
              const nextLine = lines[i + j].trim();
              if (!nextLine) continue;
              
              if (nextLine.startsWith('class:')) {
                studentData.class = nextLine.split(':')[1].trim();
              } else if (nextLine.startsWith('Phone no.')) {
                studentData.phoneNumber = extractPhoneNumber(nextLine);
                console.log(`  Phone: ${studentData.phoneNumber}`);
              } else if (nextLine.toLowerCase().includes('date of admission') || 
                         nextLine.toLowerCase().includes('date of admissson')) {
                const datePart = nextLine.split(':')[1]?.trim();
                if (datePart) {
                  studentData.dateOfAdmission = parseDate(datePart);
                  console.log(`  Admission date: ${studentData.dateOfAdmission.toISOString().split('T')[0]}`);
                }
              }
            }
          }
          
          // Preserve existing username or generate a new one
          if (studentUsernames[studentName]) {
            studentData.username = studentUsernames[studentName];
            console.log(`  Preserving username: ${studentData.username}`);
          } else {
            const baseUsername = generateUsername(studentName);
            studentData.username = await ensureUniqueUsername(baseUsername, Student);
            console.log(`  Generated username: ${studentData.username}`);
          }
          
          // Set password to phone number
          studentData.password = studentData.phoneNumber;
          
          students.push(studentData);
        }
      }
      
      // Save students to database
      if (students.length > 0) {
        // Delete existing students
        await Student.deleteMany({});
        
        // Insert new students
        await Student.insertMany(students);
        console.log(`Imported ${students.length} students successfully`);
      } else {
        console.log('No students found to import');
      }
    } else {
      console.log('students.txt not found');
    }
    
    // Process teachers.txt
    if (fs.existsSync(teachersPath)) {
      console.log('\nProcessing teachers.txt...');
      const teachersContent = fs.readFileSync(teachersPath, 'utf8');
      const lines = teachersContent.split('\n');
      
      let teachers = [];
      let currentTeacher = null;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.match(/^\d+\.\s*Name:/)) {
          // Save previous teacher if exists
          if (currentTeacher) {
            teachers.push(currentTeacher);
          }
          
          const teacherName = line.split('Name:')[1].trim();
          console.log(`Processing teacher: ${teacherName}`);
          
          // Create teacher object with defaults
          currentTeacher = {
            name: teacherName,
            subjects: [],
            batches: [],
            phoneNumber: '0000000000',
            email: `${teacherName.toLowerCase().replace(/\s+/g, '.')}@adhyayan.edu`,
            dateOfJoining: new Date(),
            dateOfBirth: new Date()
          };
          
          // Look for additional info in the next few lines
          for (let j = 1; j <= 10; j++) {
            if (i + j < lines.length) {
              const nextLine = lines[i + j].trim();
              if (!nextLine || nextLine.match(/^\d+\.\s*Name:/)) break;
              
              if (nextLine.startsWith('subjects:')) {
                currentTeacher.subjects = nextLine.split(':')[1].trim().split(',').map(s => s.trim());
                console.log(`  Subjects: ${currentTeacher.subjects.join(', ')}`);
              } else if (nextLine.startsWith('Batches:')) {
                currentTeacher.batches = nextLine.split(':')[1].trim().split(',')
                  .map(b => b.trim())
                  .filter(b => ['Udbhav', 'Maadhyam', 'Vedant'].includes(b));
                console.log(`  Batches: ${currentTeacher.batches.join(', ')}`);
              } else if (nextLine.startsWith('Phone no.')) {
                currentTeacher.phoneNumber = extractPhoneNumber(nextLine);
                console.log(`  Phone: ${currentTeacher.phoneNumber}`);
              } else if (nextLine.startsWith('E-mail:')) {
                currentTeacher.email = nextLine.split(':')[1].trim() || currentTeacher.email;
                console.log(`  Email: ${currentTeacher.email}`);
              } else if (nextLine.startsWith('DOB:')) {
                const dobPart = nextLine.split(':')[1]?.trim();
                if (dobPart) {
                  currentTeacher.dateOfBirth = parseDate(dobPart);
                  console.log(`  DOB: ${currentTeacher.dateOfBirth.toISOString().split('T')[0]}`);
                }
              } else if (nextLine.startsWith('Since:')) {
                const sincePart = nextLine.split(':')[1]?.trim();
                if (sincePart) {
                  currentTeacher.dateOfJoining = parseDate(`01.01.${sincePart}`);
                  console.log(`  Joining date: ${currentTeacher.dateOfJoining.toISOString().split('T')[0]}`);
                }
              }
            }
          }
        }
      }
      
      // Add last teacher
      if (currentTeacher) {
        teachers.push(currentTeacher);
      }
      
      // Process teachers for usernames and passwords
      for (let teacher of teachers) {
        // Preserve existing username or generate a new one
        if (teacherUsernames[teacher.name]) {
          teacher.username = teacherUsernames[teacher.name];
          console.log(`  Preserving username: ${teacher.username}`);
        } else {
          const baseUsername = generateUsername(teacher.name);
          teacher.username = await ensureUniqueUsername(baseUsername, Teacher);
          console.log(`  Generated username: ${teacher.username}`);
        }
        
        // Set password to phone number
        teacher.password = teacher.phoneNumber;
      }
      
      // Save teachers to database
      if (teachers.length > 0) {
        // Delete existing teachers
        await Teacher.deleteMany({});
        
        // Insert new teachers
        await Teacher.insertMany(teachers);
        console.log(`Imported ${teachers.length} teachers successfully`);
      } else {
        console.log('No teachers found to import');
      }
    } else {
      console.log('teachers.txt not found');
    }
    
    console.log('\nData import completed successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  }); 