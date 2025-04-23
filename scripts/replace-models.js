const fs = require('fs');
const path = require('path');

// Paths to the model files
const studentModelPath = path.join(__dirname, '../models/Student.js');
const teacherModelPath = path.join(__dirname, '../models/Teacher.js');
const studentFixedPath = path.join(__dirname, '../models/StudentFixed.js');
const teacherFixedPath = path.join(__dirname, '../models/TeacherFixed.js');

// Check if fixed models exist
if (!fs.existsSync(studentFixedPath)) {
  console.error('StudentFixed.js not found');
  process.exit(1);
}

if (!fs.existsSync(teacherFixedPath)) {
  console.error('TeacherFixed.js not found');
  process.exit(1);
}

// Backup original models
const studentBackupPath = path.join(__dirname, '../models/Student.backup.js');
const teacherBackupPath = path.join(__dirname, '../models/Teacher.backup.js');

try {
  // Backup Student model
  if (fs.existsSync(studentModelPath)) {
    fs.copyFileSync(studentModelPath, studentBackupPath);
    console.log('Student model backed up to', studentBackupPath);
  }
  
  // Backup Teacher model
  if (fs.existsSync(teacherModelPath)) {
    fs.copyFileSync(teacherModelPath, teacherBackupPath);
    console.log('Teacher model backed up to', teacherBackupPath);
  }
  
  // Replace with fixed models
  fs.copyFileSync(studentFixedPath, studentModelPath);
  console.log('Student model replaced with fixed version');
  
  fs.copyFileSync(teacherFixedPath, teacherModelPath);
  console.log('Teacher model replaced with fixed version');
  
  console.log('Model replacement completed successfully');
} catch (error) {
  console.error('Error replacing models:', error);
  process.exit(1);
} 