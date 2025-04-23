const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const { generateUsername, ensureUniqueUsername } = require('./username-generator');

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

// Function to update students database
async function updateStudentsDatabase(content) {
  try {
    // Get existing students to preserve usernames
    const existingStudents = await Student.find({});
    const existingUsernames = {};
    existingStudents.forEach(student => {
      existingUsernames[student.name] = student.username;
    });
    
    // Clear existing students
    await Student.deleteMany({});
    
    const lines = content.split('\n');
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
        if (existingUsernames[studentName]) {
          studentData.username = existingUsernames[studentName];
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
      await Student.insertMany(students);
      console.log('Students database updated successfully');
      console.log('Created students:', students.map(s => ({ name: s.name, username: s.username, phone: s.phoneNumber })));
    } else {
      console.log('No students found to import');
    }
  } catch (error) {
    console.error('Error updating students database:', error);
  }
}

// Function to update teachers database
async function updateTeachersDatabase(content) {
  try {
    // Get existing teachers to preserve usernames
    const existingTeachers = await Teacher.find({});
    const existingUsernames = {};
    existingTeachers.forEach(teacher => {
      existingUsernames[teacher.name] = teacher.username;
    });
    
    // Clear existing teachers
    await Teacher.deleteMany({});
    
    const lines = content.split('\n');
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
          subjects: ['Default Subject'], // Default subject to avoid validation error
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
              const subjectsText = nextLine.split(':')[1].trim();
              if (subjectsText) {
                currentTeacher.subjects = subjectsText.split(',').map(s => s.trim());
              }
              console.log(`  Subjects: ${currentTeacher.subjects.join(', ')}`);
            } else if (nextLine.startsWith('Batches:')) {
              const batchesText = nextLine.split(':')[1].trim();
              if (batchesText) {
                currentTeacher.batches = batchesText.split(',')
                  .map(b => b.trim())
                  .filter(b => ['Udbhav', 'Maadhyam', 'Vedant'].includes(b));
              }
              if (currentTeacher.batches.length === 0) {
                currentTeacher.batches = ['Udbhav']; // Default batch to avoid validation error
              }
              console.log(`  Batches: ${currentTeacher.batches.join(', ')}`);
            } else if (nextLine.startsWith('Phone no.')) {
              currentTeacher.phoneNumber = extractPhoneNumber(nextLine);
              console.log(`  Phone: ${currentTeacher.phoneNumber}`);
            } else if (nextLine.startsWith('E-mail:')) {
              const emailText = nextLine.split(':')[1].trim();
              if (emailText) {
                currentTeacher.email = emailText;
              }
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
      if (existingUsernames[teacher.name]) {
        teacher.username = existingUsernames[teacher.name];
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
      await Teacher.insertMany(teachers);
      console.log('Teachers database updated successfully');
      console.log('Created teachers:', teachers.map(t => ({ name: t.name, username: t.username, phone: t.phoneNumber })));
    } else {
      console.log('No teachers found to import');
    }
  } catch (error) {
    console.error('Error updating teachers database:', error);
  }
}

// Initialize file watcher
function initWatcher() {
  const watcher = chokidar.watch('./txt_files', {
    ignored: /(^|[\/\\])\../,
    persistent: true
  });

  console.log('File watcher initialized, watching ./txt_files directory');

  watcher.on('change', async (filePath) => {
    console.log(`File ${filePath} has been changed`);
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      if (filePath.includes('students.txt')) {
        await updateStudentsDatabase(content);
      } else if (filePath.includes('teachers.txt')) {
        await updateTeachersDatabase(content);
      }
    } catch (error) {
      console.error(`Error updating database from ${path.basename(filePath)}:`, error);
    }
  });

  // Initial load of files
  const studentsPath = path.join('./txt_files', 'students.txt');
  const teachersPath = path.join('./txt_files', 'teachers.txt');

  console.log('Checking for existing txt files to load on startup');

  if (fs.existsSync(studentsPath)) {
    console.log('Found students.txt, loading data...');
    const studentsContent = fs.readFileSync(studentsPath, 'utf8');
    updateStudentsDatabase(studentsContent);
  } else {
    console.log('students.txt not found');
  }

  if (fs.existsSync(teachersPath)) {
    console.log('Found teachers.txt, loading data...');
    const teachersContent = fs.readFileSync(teachersPath, 'utf8');
    updateTeachersDatabase(teachersContent);
  } else {
    console.log('teachers.txt not found');
  }
}

module.exports = { initWatcher }; 