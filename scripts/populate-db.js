const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const { generateUsername, ensureUniqueUsername } = require('../utils/username-generator');

dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/adhyayan';

function parseDate(dateStr) {
  if (!dateStr) return new Date();
  const [day, month, year] = dateStr.split('.');
  const parsed = new Date(`${year}-${month}-${day}`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

async function updateStudentsDatabase(content) {
  const lines = content.split(/\r?\n/);
  let currentBatch = '';
  const students = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();

    if (line.startsWith('Batch name:')) {
      currentBatch = line.split(':').slice(1).join(':').trim().split(' ')[0];
      continue;
    }

    if (!/^\d+\.\s*Name:/.test(line) || !currentBatch) continue;

    const studentData = {
      batch: currentBatch,
      name: line.split('Name:').slice(1).join('Name:').trim(),
      class: '',
      phoneNumber: '',
      dateOfAdmission: new Date()
    };

    for (let offset = 1; offset <= 4 && index + offset < lines.length; offset += 1) {
      const nextLine = lines[index + offset].trim();
      if (!nextLine) continue;

      if (nextLine.startsWith('class:')) {
        studentData.class = nextLine.split(':').slice(1).join(':').trim();
      } else if (nextLine.startsWith('Phone no.')) {
        studentData.phoneNumber = nextLine.split('.').slice(1).join('.').trim();
      } else if (nextLine.toLowerCase().includes('date of admission')) {
        studentData.dateOfAdmission = parseDate(nextLine.split(':').slice(1).join(':').trim());
      }
    }

    if (!['Udbhav', 'Maadhyam', 'Vedant'].includes(currentBatch)) continue;

    studentData.username = await ensureUniqueUsername(generateUsername(studentData.name), Student);
    studentData.password = studentData.phoneNumber || 'ChangeMe123!';
    studentData.class = studentData.class || (currentBatch === 'Udbhav' ? '7th' : currentBatch === 'Maadhyam' ? '9th' : '10th');
    studentData.phoneNumber = studentData.phoneNumber || '0000000000';
    students.push(studentData);
  }

  await Student.deleteMany({});
  // Model.create() runs save middleware, so passwords are bcrypt-hashed.
  await Student.create(students);
  console.log(`Created ${students.length} students`);
}

async function updateTeachersDatabase(content) {
  const lines = content.split(/\r?\n/);
  const teachers = [];
  let currentTeacher = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (/^\d+\.\s*Name:/.test(line)) {
      if (currentTeacher) teachers.push(currentTeacher);
      currentTeacher = {
        name: line.split('Name:').slice(1).join('Name:').trim(),
        subjects: [],
        batches: [],
        phoneNumber: '0000000000',
        email: '',
        dateOfJoining: new Date(),
        dateOfBirth: new Date()
      };
      continue;
    }

    if (!currentTeacher) continue;

    if (line.startsWith('subjects:')) {
      currentTeacher.subjects = line.split(':').slice(1).join(':').split(',').map((value) => value.trim()).filter(Boolean);
    } else if (line.startsWith('Batches:')) {
      currentTeacher.batches = line.split(':').slice(1).join(':').split(',')
        .map((value) => value.trim())
        .filter((value) => ['Udbhav', 'Maadhyam', 'Vedant'].includes(value));
    } else if (line.startsWith('Phone no.')) {
      currentTeacher.phoneNumber = line.split('.').slice(1).join('.').trim() || '0000000000';
    } else if (line.startsWith('E-mail:')) {
      currentTeacher.email = line.split(':').slice(1).join(':').trim();
    } else if (line.startsWith('DOB:')) {
      currentTeacher.dateOfBirth = parseDate(line.split(':').slice(1).join(':').trim());
    } else if (line.startsWith('Since:')) {
      const year = line.split(':').slice(1).join(':').trim();
      currentTeacher.dateOfJoining = parseDate(`01.01.${year}`);
    }
  }

  if (currentTeacher) teachers.push(currentTeacher);

  for (const teacher of teachers) {
    teacher.username = await ensureUniqueUsername(generateUsername(teacher.name), Teacher);
    teacher.password = teacher.phoneNumber || 'ChangeMe123!';
    teacher.email = teacher.email || `${teacher.name.toLowerCase().replace(/\s+/g, '.')}@adhyayan.edu`;
  }

  await Teacher.deleteMany({});
  // Model.create() runs save middleware, so passwords are bcrypt-hashed.
  await Teacher.create(teachers);
  console.log(`Created ${teachers.length} teachers`);
}

async function populateDatabase() {
  try {
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected');

    const studentsPath = path.join(__dirname, '../txt_files/students.txt');
    if (fs.existsSync(studentsPath)) {
      await updateStudentsDatabase(fs.readFileSync(studentsPath, 'utf8'));
    } else {
      console.log('students.txt not found');
    }

    const teachersPath = path.join(__dirname, '../txt_files/teachers.txt');
    if (fs.existsSync(teachersPath)) {
      await updateTeachersDatabase(fs.readFileSync(teachersPath, 'utf8'));
    } else {
      console.log('teachers.txt not found');
    }

    console.log('Database population completed');
  } catch (error) {
    console.error('Database population failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

populateDatabase();
