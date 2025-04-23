const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const { auth, isTeacher, isStudent } = require('../middleware/auth');

// Get attendance for a specific student (for student dashboard)
router.get('/student/:studentId', auth, async (req, res) => {
  try {
    const { studentId } = req.params;
    console.log('Fetching attendance for student:', studentId);
    
    // Check if the requesting user is the student or a teacher
    if (req.user.role === 'student' && req.user.id !== studentId) {
      return res.status(403).json({ message: 'Unauthorized access to attendance records' });
    }
    
    const student = await Student.findById(studentId).select('attendance name batch');
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // If teacher, check if they have access to this student's batch
    if (req.user.role === 'teacher') {
      const teacherBatches = req.user.batches || [];
      if (!teacherBatches.includes(student.batch)) {
        return res.status(403).json({ message: 'You do not have access to this student' });
      }
    }
    
    // Check if attendance exists and is an array
    if (!student.attendance || !Array.isArray(student.attendance)) {
      console.log(`No attendance records found for student ${student.name}`);
      return res.json({ attendance: [] });
    }
    
    // Process attendance records to ensure they have subject field
    const processedAttendance = student.attendance.map(record => {
      // Convert to plain object if it's a Mongoose document
      const recordObj = record.toObject ? record.toObject() : {...record};
      
      return {
        ...recordObj,
        subject: recordObj.subject || 'General'
      };
    });
    
    console.log(`Found ${processedAttendance.length} attendance records for student ${student.name}`);
    
    // Return attendance in the expected format
    res.json({
      attendance: processedAttendance || []
    });
  } catch (error) {
    console.error('Error fetching student attendance:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get attendance for all students in a batch (teachers only)
router.get('/batch/:batch', auth, isTeacher, async (req, res) => {
  try {
    const { batch } = req.params;
    const { date } = req.query;
    
    // Validate that teacher has access to this batch
    const teacherBatches = req.user.batches || [];
    if (!teacherBatches.includes(batch)) {
      return res.status(403).json({ message: 'You do not have access to this batch' });
    }
    
    // Find all students in the batch
    const students = await Student.find({ batch }).select('name attendance');
    
    // If date is provided, filter attendance for that date
    if (date) {
      const targetDate = new Date(date);
      const formattedDate = targetDate.toISOString().split('T')[0];
      
      const result = students.map(student => {
        const attendanceForDate = student.attendance.find(a => {
          const attendanceDate = new Date(a.date).toISOString().split('T')[0];
          return attendanceDate === formattedDate;
        });
        
        return {
          id: student._id,
          name: student.name,
          status: attendanceForDate ? attendanceForDate.status : 'unmarked'
        };
      });
      
      return res.json(result);
    }
    
    // Otherwise return all attendance records
    const result = students.map(student => ({
      id: student._id,
      name: student.name,
      attendance: student.attendance || []
    }));
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching batch attendance:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark attendance for a batch (teachers only)
router.post('/mark', auth, isTeacher, async (req, res) => {
  try {
    console.log('Marking attendance: Starting process');
    const { batch, date, attendanceData } = req.body;
    
    console.log('Received attendance data:', {
      batch,
      date,
      teacherId: req.user.id,
      teacherName: req.user.name,
      attendanceCount: attendanceData ? attendanceData.length : 0,
      rawData: JSON.stringify(req.body, null, 2)
    });
    
    if (!batch || !date || !attendanceData || !Array.isArray(attendanceData)) {
      console.log('Invalid request data:', { 
        batch, 
        date, 
        hasAttendanceData: !!attendanceData, 
        isArray: Array.isArray(attendanceData),
        body: JSON.stringify(req.body, null, 2) 
      });
      return res.status(400).json({ message: 'Invalid request data' });
    }
    
    // Validate that teacher has access to this batch
    const teacherBatches = req.user.batches || [];
    if (!teacherBatches.includes(batch)) {
      console.log('Teacher does not have access to batch:', { teacherBatches, requestedBatch: batch });
      return res.status(403).json({ message: 'You do not have access to this batch' });
    }
    
    const attendanceDate = new Date(date);
    const teacherId = req.user.id;
    
    // Process each student's attendance
    const results = [];
    const attendanceRecords = []; // For the Attendance model (if it exists)
    
    for (const item of attendanceData) {
      const { studentId, status } = item;
      
      console.log('Processing attendance for student:', { studentId, status });
      
      if (!studentId || !['present', 'absent', 'late'].includes(status)) {
        console.log('Invalid attendance data for student:', { studentId, status });
        results.push({ studentId, success: false, message: 'Invalid data' });
        continue;
      }
      
      try {
        const student = await Student.findById(studentId);
        
        if (!student) {
          console.log('Student not found:', studentId);
          results.push({ studentId, success: false, message: 'Student not found' });
          continue;
        }
        
        if (student.batch !== batch) {
          console.log('Student not in this batch:', { studentId, studentName: student.name, studentBatch: student.batch, requestedBatch: batch });
          results.push({ studentId, success: false, message: 'Student not in this batch' });
          continue;
        }
        
        // Check if attendance already marked for this date
        const existingIndex = student.attendance.findIndex(a => {
          const aDate = new Date(a.date);
          return aDate.toISOString().split('T')[0] === attendanceDate.toISOString().split('T')[0];
        });
        
        if (existingIndex >= 0) {
          // Update existing attendance
          console.log('Updating existing attendance for student:', { studentId, studentName: student.name, previousStatus: student.attendance[existingIndex].status, newStatus: status });
          student.attendance[existingIndex] = {
            date: attendanceDate,
            status,
            markedBy: teacherId
          };
        } else {
          // Add new attendance record
          console.log('Adding new attendance record for student:', { studentId, studentName: student.name, status });
          student.attendance.push({
            date: attendanceDate,
            status,
            markedBy: teacherId
          });
        }
        
        // Also prepare record for the Attendance model if it exists
        try {
          const Attendance = require('../models/Attendance');
          attendanceRecords.push({
            student: studentId,
            teacher: teacherId,
            batch,
            date: attendanceDate,
            status,
            notes: ''
          });
        } catch (modelError) {
          console.log('Attendance model not found or not used in this setup');
        }
        
        // Save with error handling
        try {
          await student.save();
          console.log('Successfully saved attendance for student:', { studentId, studentName: student.name });
          results.push({ 
            studentId, 
            success: true, 
            message: 'Attendance marked successfully',
            name: student.name,
            status
          });
        } catch (saveError) {
          console.error('Error saving student attendance:', saveError);
          results.push({ 
            studentId, 
            success: false, 
            message: `Error saving: ${saveError.message}`,
            name: student.name
          });
        }
      } catch (error) {
        console.error(`Error marking attendance for student ${studentId}:`, error);
        results.push({ studentId, success: false, message: 'Server error' });
      }
    }
    
    // Also save to Attendance collection if records were created
    if (attendanceRecords.length > 0) {
      try {
        const Attendance = require('../models/Attendance');
        
        // First, delete any existing attendance records for this batch and date
        await Attendance.deleteMany({
          batch,
          date: {
            $gte: new Date(attendanceDate.setHours(0, 0, 0, 0)),
            $lt: new Date(attendanceDate.setHours(23, 59, 59, 999))
          }
        });
        
        // Then insert new records
        if (attendanceRecords.length > 0) {
          await Attendance.insertMany(attendanceRecords);
          console.log(`Saved ${attendanceRecords.length} records to Attendance collection`);
        }
      } catch (attendanceError) {
        console.error('Error saving to Attendance collection:', attendanceError);
      }
    }
    
    console.log('Attendance marking complete, results:', { 
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length
    });
    
    res.json({ 
      success: true, 
      message: 'Attendance processed', 
      date: attendanceDate,
      results 
    });
  } catch (error) {
    console.error('Error marking attendance:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get attendance for a specific date (teachers only)
router.get('/by-date', auth, isTeacher, async (req, res) => {
  try {
    const { date, batches } = req.query;
    
    console.log('Fetching attendance for date:', date, 'Batches:', batches);
    console.log('Request headers:', req.headers);
    
    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }
    
    // Parse batches
    let batchList = [];
    if (batches) {
      batchList = batches.split(',');
    } else {
      batchList = req.user.batches || [];
    }
    
    console.log('Batch list for attendance query:', batchList);
    
    // Validate that teacher has access to these batches
    const teacherBatches = req.user.batches || [];
    const validBatches = batchList.filter(batch => teacherBatches.includes(batch));
    
    if (validBatches.length === 0) {
      return res.status(403).json({ message: 'You do not have access to any of the specified batches' });
    }
    
    // Find all students in the batches
    console.log('Finding students in batches:', validBatches);
    const students = await Student.find({ batch: { $in: validBatches } })
      .select('_id name batch attendance');
    
    console.log(`Found ${students.length} students in the specified batches`);
    
    const targetDate = new Date(date);
    const formattedDate = targetDate.toISOString().split('T')[0];
    
    console.log('Formatted date for comparison:', formattedDate);
    
    // Extract attendance for the specified date
    const attendanceRecords = [];
    
    for (const student of students) {
      console.log(`Processing student: ${student.name}, ID: ${student._id}`);
      
      // Ensure attendance exists and is an array
      const attendance = Array.isArray(student.attendance) ? student.attendance : [];
      console.log(`Student has ${attendance.length} attendance records`);
      
      // Find attendance for this date
      let foundAttendance = null;
      
      for (const record of attendance) {
        if (!record || !record.date) continue;
        
        try {
          const recordDate = new Date(record.date);
          const recordFormattedDate = recordDate.toISOString().split('T')[0];
          
          if (recordFormattedDate === formattedDate) {
            foundAttendance = record;
            console.log(`Found matching attendance record for date ${formattedDate}`);
            break;
          }
        } catch (dateError) {
          console.error('Error parsing date:', dateError);
        }
      }
      
      // Add record with appropriate status
      attendanceRecords.push({
        studentId: student._id,
        name: student.name,
        batch: student.batch,
        status: foundAttendance ? foundAttendance.status : 'unmarked',
        date: targetDate,
        // Include additional fields if available
        remarks: foundAttendance ? foundAttendance.remarks || '' : '',
        markedBy: foundAttendance ? foundAttendance.markedBy : null
      });
    }
    
    console.log(`Returning ${attendanceRecords.length} attendance records for date ${formattedDate}`);
    
    // Return the attendance records
    res.json({
      date: formattedDate,
      records: attendanceRecords
    });
  } catch (error) {
    console.error('Error fetching attendance by date:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get recent attendance for a student
router.get('/recent/:studentId', auth, async (req, res) => {
  try {
    console.log(`Fetching recent attendance for student: ${req.params.studentId}`);
    
    // Check if user is authorized to view this attendance
    if (req.user.role === 'student' && req.user.id !== req.params.studentId) {
      return res.status(403).json({ message: 'Unauthorized to view this attendance' });
    }
    
    const student = await Student.findById(req.params.studentId).select('name batch attendance');
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // If teacher, check if they have access to this student's batch
    if (req.user.role === 'teacher') {
      const teacherBatches = req.user.batches || [];
      if (!teacherBatches.includes(student.batch)) {
        return res.status(403).json({ message: 'You do not have access to this student' });
      }
    }
    
    // Check if attendance exists and is an array
    if (!student.attendance || !Array.isArray(student.attendance)) {
      console.log(`No attendance records found for student ${student.name}`);
      return res.json([]);
    }
    
    // Get the student's recent attendance records
    const recentAttendance = student.attendance
      .filter(record => record && record.date) // Ensure valid records
      .sort((a, b) => new Date(b.date) - new Date(a.date)) // Sort by date descending
      .slice(0, 5); // Get 5 most recent records
    
    // Convert to plain objects and add missing fields
    const processedAttendance = recentAttendance.map(record => {
      // Convert to plain object if it's a Mongoose document
      const recordObj = record.toObject ? record.toObject() : {...record};
      
      return {
        ...recordObj,
        subject: recordObj.subject || 'General',
        studentName: student.name,
        batch: student.batch
      };
    });
    
    console.log(`Returning ${processedAttendance.length} recent attendance records`);
    res.json(processedAttendance);
  } catch (error) {
    console.error('Error fetching recent attendance:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get attendance history by month (teachers only)
router.get('/history', auth, isTeacher, async (req, res) => {
  try {
    const { month, batches } = req.query;
    
    console.log('Fetching attendance history for month:', month, 'Batches:', batches);
    
    if (!month) {
      return res.status(400).json({ message: 'Month is required (YYYY-MM format)' });
    }
    
    // Parse batches
    let batchList = [];
    if (batches) {
      batchList = batches.split(',');
    } else {
      batchList = req.user.batches || [];
    }
    
    console.log('Batch list for history query:', batchList);
    
    // Validate that teacher has access to these batches
    const teacherBatches = req.user.batches || [];
    const validBatches = batchList.filter(batch => teacherBatches.includes(batch));
    
    if (validBatches.length === 0) {
      return res.status(403).json({ message: 'You do not have access to any of the specified batches' });
    }
    
    // Create date range for the month
    const [year, monthNum] = month.split('-');
    const startDate = new Date(year, parseInt(monthNum) - 1, 1);
    const endDate = new Date(year, parseInt(monthNum), 0); // Last day of month
    
    console.log('Date range:', startDate.toISOString(), 'to', endDate.toISOString());
    
    // Find all students in the batches
    console.log('Finding students in batches:', validBatches);
    const students = await Student.find({ batch: { $in: validBatches } })
      .select('_id name class batch attendance');
    
    console.log(`Found ${students.length} students in the specified batches`);
    
    // Collect all attendance records for the month
    const attendanceHistory = [];
    
    students.forEach(student => {
      if (!student.attendance || !Array.isArray(student.attendance)) {
        console.log(`No attendance records found for student ${student.name}`);
        return;
      }
      
      const monthlyAttendance = student.attendance.filter(record => {
        if (!record || !record.date) return false;
        
        const recordDate = new Date(record.date);
        return recordDate >= startDate && recordDate <= endDate;
      });
      
      monthlyAttendance.forEach(record => {
        attendanceHistory.push({
          date: record.date,
          studentId: student._id,
          studentName: student.name,
          studentClass: student.class,
          batch: student.batch,
          status: record.status
        });
      });
    });
    
    // Sort by date (most recent first)
    attendanceHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    console.log(`Found ${attendanceHistory.length} attendance records for ${month}`);
    
    res.json(attendanceHistory);
  } catch (error) {
    console.error('Error fetching attendance history:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
