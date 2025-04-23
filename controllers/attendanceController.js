const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Attendance = require('../models/Attendance');

// Get attendance page with students for the teacher's batches
exports.getAttendancePage = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user._id);
    const batches = teacher.batches;
    
    // Get all students from the teacher's batches
    const students = await Student.find({ batch: { $in: batches } });
    
    // Group students by batch
    const studentsByBatch = {};
    batches.forEach(batch => {
      studentsByBatch[batch] = students.filter(student => student.batch === batch);
    });
    
    res.render('teacher/attendance', {
      title: 'Attendance',
      studentsByBatch,
      batches
    });
  } catch (error) {
    console.error('Error in getAttendancePage:', error);
    res.status(500).render('error', { message: 'Error loading attendance page' });
  }
};

// Mark attendance for students
exports.markAttendance = async (req, res) => {
  try {
    console.log('ATTENDANCE MARKING: Starting process with request body:', JSON.stringify(req.body, null, 2));
    const { batch, date, attendanceData } = req.body;
    
    if (!req.user || !req.user._id) {
      console.error('ATTENDANCE ERROR: No authenticated user found');
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const teacher = await Teacher.findById(req.user._id);
    
    if (!teacher) {
      console.error('ATTENDANCE ERROR: Teacher not found with ID:', req.user._id);
      return res.status(404).json({ error: 'Teacher not found' });
    }
    
    if (!teacher.batches.includes(batch)) {
      console.error('ATTENDANCE ERROR: Teacher not authorized for batch:', batch, 'Teacher batches:', teacher.batches);
      return res.status(403).json({ error: 'Not authorized for this batch' });
    }
    
    if (!attendanceData || !Array.isArray(attendanceData) || attendanceData.length === 0) {
      console.error('ATTENDANCE ERROR: Invalid attendance data format:', attendanceData);
      return res.status(400).json({ error: 'Invalid attendance data' });
    }
    
    console.log(`ATTENDANCE: Processing ${attendanceData.length} records for batch ${batch} on date ${date}`);
    
    // Process each student's attendance
    const results = [];
    const attendanceDate = new Date(date);
    
    for (const record of attendanceData) {
      try {
        const { studentId, status } = record;
        
        if (!studentId || !['present', 'absent', 'late'].includes(status)) {
          console.error('ATTENDANCE ERROR: Invalid record data:', record);
          results.push({ studentId, success: false, message: 'Invalid data' });
          continue;
        }
        
        console.log(`ATTENDANCE: Processing student ${studentId} with status ${status}`);
        
        // 1. Find the student
        const student = await Student.findById(studentId);
        if (!student) {
          console.error('ATTENDANCE ERROR: Student not found:', studentId);
          results.push({ studentId, success: false, message: 'Student not found' });
          continue;
        }
        
        if (student.batch !== batch) {
          console.error(`ATTENDANCE ERROR: Student ${studentId} batch (${student.batch}) doesn't match request batch (${batch})`);
          results.push({ studentId, success: false, message: 'Student not in this batch' });
          continue;
        }
        
        // 2. Update or create attendance in Student model
        // Check if attendance already exists for this date
        const existingAttendanceIndex = student.attendance.findIndex(a => {
          if (!a || !a.date) return false;
          const aDate = new Date(a.date);
          return aDate.toISOString().split('T')[0] === attendanceDate.toISOString().split('T')[0];
        });
        
        if (existingAttendanceIndex >= 0) {
          // Update existing attendance
          console.log(`ATTENDANCE: Updating existing attendance for student ${studentId}`);
          student.attendance[existingAttendanceIndex].status = status;
          student.attendance[existingAttendanceIndex].markedBy = teacher._id;
        } else {
          // Add new attendance
          console.log(`ATTENDANCE: Adding new attendance for student ${studentId}`);
          student.attendance.push({
            date: attendanceDate,
            status: status,
            markedBy: teacher._id
          });
        }
        
        // Save student with updated attendance
        await student.save();
        
        // 3. Also create/update entry in Attendance model if it exists
        try {
          const existingAttendance = await Attendance.findOne({
            student: studentId,
            date: {
              $gte: new Date(attendanceDate.setHours(0, 0, 0, 0)),
              $lt: new Date(attendanceDate.setHours(23, 59, 59, 999))
            }
          });
          
          if (existingAttendance) {
            existingAttendance.status = status;
            await existingAttendance.save();
            console.log(`ATTENDANCE: Updated existing Attendance record for student ${studentId}`);
          } else {
            const newAttendance = new Attendance({
              student: studentId,
              teacher: teacher._id,
              batch: batch,
              date: attendanceDate,
              status: status,
              notes: record.notes || ''
            });
            
            await newAttendance.save();
            console.log(`ATTENDANCE: Created new Attendance record for student ${studentId}`);
          }
        } catch (attendanceModelError) {
          console.log('ATTENDANCE: Separate Attendance model might not be used in this setup');
          // Continue as student record was still updated
        }
        
        results.push({ 
          studentId, 
          success: true, 
          message: 'Attendance marked successfully',
          name: student.name,
          status
        });
      } catch (studentError) {
        console.error(`ATTENDANCE ERROR: Error processing student attendance:`, studentError);
        results.push({
          studentId: record.studentId,
          success: false,
          message: `Error: ${studentError.message}`
        });
      }
    }
    
    console.log('ATTENDANCE SUCCESS: Processed all attendance records');
    res.json({ 
      success: true, 
      message: 'Attendance processed successfully',
      results,
      count: results.filter(r => r.success).length
    });
  } catch (error) {
    console.error('ATTENDANCE ERROR: Error in markAttendance:', error);
    res.status(500).json({ error: 'Error marking attendance', details: error.message });
  }
};

// Get attendance history for a student
exports.getStudentAttendance = async (req, res) => {
  try {
    const { studentId } = req.params;
    const teacher = await Teacher.findById(req.user._id);
    
    const student = await Student.findById(studentId);
    if (!student || !teacher.batches.includes(student.batch)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const attendance = await Attendance.find({ student: studentId })
      .sort({ date: -1 })
      .limit(30);
    
    res.json(attendance);
  } catch (error) {
    console.error('Error in getStudentAttendance:', error);
    res.status(500).json({ error: 'Error fetching attendance history' });
  }
}; 