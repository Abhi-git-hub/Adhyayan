// Parse date in DD.MM.YYYY format
const parseDate = (dateStr) => {
  if (!dateStr) return new Date();
  
  const [day, month, year] = dateStr.trim().split('.');
  return new Date(`${year}-${month}-${day}`);
};

// Parse student data from text file
const parseStudentData = (fileContent) => {
  const students = [];
  const batches = fileContent.split('Batch name:').filter(batch => batch.trim());
  
  for (const batchText of batches) {
    const [batchInfo, ...studentLines] = batchText.trim().split('\n');
    const batchName = batchInfo.split('(')[0].trim();
    
    let currentStudent = {};
    
    for (const line of studentLines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('Name:')) {
        if (Object.keys(currentStudent).length > 0 && currentStudent.name) {
          students.push(currentStudent);
        }
        currentStudent = {
          name: trimmedLine.replace('Name:', '').trim(),
          batch: batchName
        };
      } else if (trimmedLine.startsWith('class:')) {
        currentStudent.class = trimmedLine.replace('class:', '').trim();
      } else if (trimmedLine.startsWith('Phone no.') || trimmedLine.startsWith('phone no.')) {
        currentStudent.phoneNumber = trimmedLine.split('.')[1].trim();
      } else if (trimmedLine.startsWith('Date of admission') || trimmedLine.startsWith('date of admission')) {
        currentStudent.dateOfAdmission = parseDate(trimmedLine.split(':')[1].trim());
      }
    }
    
    if (Object.keys(currentStudent).length > 0 && currentStudent.name) {
      students.push(currentStudent);
    }
  }
  
  return students.filter(student => 
    student.name && 
    student.phoneNumber && 
    student.class && 
    student.dateOfAdmission
  );
};

// Parse teacher data from text file
const parseTeacherData = (fileContent) => {
  const teachers = [];
  const teacherBlocks = fileContent.split('\n\n').filter(block => block.trim());
  
  for (const block of teacherBlocks) {
    const lines = block.split('\n').filter(line => line.trim());
    const teacherInfo = {};
    
    for (const line of lines) {
      if (line.includes('Name:')) {
        teacherInfo.name = line.split(':')[1].trim();
      } else if (line.includes('Since:')) {
        teacherInfo.dateOfJoining = new Date(line.split(':')[1].trim(), 0, 1);
      } else if (line.includes('subjects:')) {
        teacherInfo.subjects = line.split(':')[1].trim().split(',').map(s => s.trim());
      } else if (line.includes('Batches:')) {
        teacherInfo.batches = line.split(':')[1].trim().split(',').map(b => b.trim());
      } else if (line.includes('DOB:')) {
        teacherInfo.dateOfBirth = parseDate(line.split(':')[1].trim());
      }
    }
    
    if (teacherInfo.name) {
      teachers.push(teacherInfo);
    }
  }
  
  return teachers;
};

module.exports = {
  parseDate,
  parseStudentData,
  parseTeacherData
}; 