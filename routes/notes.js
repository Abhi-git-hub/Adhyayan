const express = require('express');
const router = express.Router();
const Note = require('../models/Note');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const { auth, isTeacher } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Test route - no auth required
router.get('/test', (req, res) => {
  try {
    console.log('Test route accessed');
    res.json({ 
      message: 'Notes API is working', 
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    console.error('Error in test route:', error);
    res.status(500).json({ message: 'Error in test route' });
  }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/notes');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, PPT, PPTX, and TXT files are allowed.'));
    }
  }
});

// Get all notes (filtered by batch for students, by author for teachers)
router.get('/', auth, async (req, res) => {
  try {
    console.log(`Fetching notes for ${req.user.role} with ID: ${req.user.id}`);
    
    let notes = [];
    
    if (req.user.role === 'student') {
      // Find the student
      const student = await Student.findById(req.user.id);
      
      if (!student) {
        console.log('Student not found in database');
        return res.status(404).json({ message: 'Student not found' });
      }
      
      console.log(`Found student: ${student.name}, Batch: ${student.batch}`);
      
      try {
        // Find notes for the student's batch
        notes = await Note.find({ targetBatches: { $in: [student.batch] } })
          .populate('author', 'name')
          .sort({ updatedAt: -1 });
        
        console.log(`Found ${notes.length} notes for batch ${student.batch}`);
      } catch (notesError) {
        console.error('Error fetching notes by batch:', notesError);
        notes = [];
      }
      
      // If no notes found, return an empty array instead of an error
      if (notes.length === 0) {
        console.log('No notes found for this batch, returning empty array');
        return res.json([]);
      }
      
      // Transform notes with additional information for student view
      notes = notes.map(note => {
        const noteObj = note.toObject();
        return {
          _id: noteObj._id,
          title: noteObj.title,
          subject: noteObj.subject,
          description: noteObj.description || '',
          uploadDate: noteObj.createdAt,
          fileName: `${noteObj.title}.pdf`,
          fileUrl: noteObj.fileUrl,
          teacherName: noteObj.author ? noteObj.author.name : 'Teacher'
        };
      });
    } else if (req.user.role === 'teacher') {
      try {
        // Find notes created by this teacher
        notes = await Note.find({ author: req.user.id })
          .sort({ updatedAt: -1 });
        
        console.log(`Found ${notes.length} notes created by teacher ${req.user.id}`);
      } catch (notesError) {
        console.error('Error fetching teacher notes:', notesError);
        notes = [];
      }
      
      // If no notes found, return an empty array instead of an error
      if (notes.length === 0) {
        console.log('No notes found for this teacher, returning empty array');
        return res.json([]);
      }
    } else {
      console.log('Invalid user role for notes access');
      return res.status(403).json({ message: 'Invalid user role' });
    }
    
    res.json(notes);
  } catch (error) {
    console.error('Error in notes route:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload a note (teachers only)
router.post('/upload', auth, isTeacher, upload.single('file'), async (req, res) => {
  try {
    const { title, description, subject, batch } = req.body;
    
    if (!title || !subject || !batch) {
      return res.status(400).json({ message: 'Title, subject, and batch are required' });
    }
    
    console.log('Uploading note with data:', { title, subject, batch });
    console.log('Uploaded file:', req.file);
    
    // Get teacher data to verify batches
    const teacher = await Teacher.findById(req.user.id);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    // Validate that teacher has access to this batch
    if (!teacher.batches.includes(batch)) {
      console.log(`Teacher ${teacher.name} (${teacher._id}) has batches: ${teacher.batches.join(', ')}`);
      return res.status(403).json({ message: `You do not have access to batch: ${batch}` });
    }
    
    // Create new note
    const newNote = new Note({
      title,
      description: description || '',
      subject,
      targetBatches: [batch],
      author: req.user.id,
      fileUrl: req.file ? `/uploads/notes/${req.file.filename}` : null
    });
    
    await newNote.save();
    
    console.log('Note saved successfully:', {
      id: newNote._id,
      title: newNote.title,
      batch: newNote.targetBatches
    });
    
    // Update teacher's published notes if field exists in schema
    try {
      if (teacher.publishedNotes) {
        await Teacher.findByIdAndUpdate(req.user.id, {
          $push: { publishedNotes: newNote._id }
        });
      }
    } catch (teacherUpdateError) {
      console.error('Non-critical error updating teacher publishedNotes:', teacherUpdateError);
      // Continue execution - this is not critical
    }
    
    // Update accessible notes for students in target batch if field exists in schema
    try {
      const students = await Student.find({ batch });
      for (const student of students) {
        if (student.accessibleNotes) {
          await Student.findByIdAndUpdate(student._id, {
            $push: { accessibleNotes: newNote._id }
          });
        }
      }
    } catch (studentUpdateError) {
      console.error('Non-critical error updating student accessibleNotes:', studentUpdateError);
      // Continue execution - this is not critical
    }
    
    res.status(201).json(newNote);
  } catch (error) {
    console.error('Error uploading note:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Get notes by teacher - IMPORTANT: Specific routes must come before parameter routes
router.get('/by-teacher', auth, isTeacher, async (req, res) => {
  try {
    console.log('Fetching notes for teacher ID:', req.user.id);
    
    // Find all notes created by this teacher
    const notes = await Note.find({ author: req.user.id })
      .sort({ updatedAt: -1 });
    
    console.log(`Found ${notes.length} notes for teacher ${req.user.id}`);
    
    // If no notes found, return an empty array
    if (notes.length === 0) {
      console.log('No notes found for this teacher, returning empty array');
      return res.json([]);
    }
    
    // Return the notes
    return res.json(notes);
  } catch (error) {
    console.error('Error in /by-teacher route:', error);
    return res.status(500).json({ 
      message: 'Server error: ' + error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Download a note file - IMPORTANT: Specific routes must come before parameter routes
router.get('/download/:id', auth, async (req, res) => {
  try {
    console.log(`Download request for note ID: ${req.params.id}`);
    console.log(`User role: ${req.user.role}, User ID: ${req.user.id}`);
    
    const note = await Note.findById(req.params.id);
    
    if (!note || !note.fileUrl) {
      console.log('Note or file URL not found');
      return res.status(404).json({ message: 'Note file not found' });
    }
    
    console.log(`Note found: ${note.title}, File URL: ${note.fileUrl}`);
    console.log(`Target batches: ${note.targetBatches.join(', ')}`);
    
    // Check if user has access to this note
    if (req.user.role === 'student') {
      const student = await Student.findById(req.user.id).lean();
      
      if (!student) {
        console.log('Student not found in database');
        return res.status(404).json({ message: 'Student not found' });
      }
      
      console.log(`Student batch: ${student.batch}`);
      
      // Check if student's batch is in the note's targetBatches
      if (!note.targetBatches.includes(student.batch)) {
        console.log(`Student batch ${student.batch} not in note's target batches ${note.targetBatches.join(', ')}`);
        return res.status(403).json({ message: 'You do not have access to this note' });
      }
      
      console.log('Student has access to this note');
    } else if (req.user.role === 'teacher' && note.author.toString() !== req.user.id) {
      console.log(`Teacher ID ${req.user.id} does not match note author ${note.author}`);
      return res.status(403).json({ message: 'You do not have access to this note' });
    }
    
    const filePath = path.join(__dirname, '..', note.fileUrl);
    console.log(`Full file path: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      console.log('File not found on server at path:', filePath);
      return res.status(404).json({ message: 'File not found on server' });
    }
    
    // Get file extension but always serve as PDF
    const fileExt = path.extname(filePath).toLowerCase();
    console.log(`File extension: ${fileExt}`);
    
    // Always use PDF content type regardless of the actual file type
    const contentType = 'application/pdf';
    
    console.log(`Using content type: ${contentType}`);
    
    // Always use PDF extension for consistency
    const sanitizedTitle = note.title.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${sanitizedTitle}.pdf`;
    
    // Set proper headers for download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Stream the file instead of using res.download for better control
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    // Handle errors in the stream
    fileStream.on('error', (err) => {
      console.error('Error streaming file:', err);
      if (!res.headersSent) {
        return res.status(500).json({ message: 'Error streaming file' });
      }
    });
    
    console.log('File stream started');
  } catch (error) {
    console.error('Error downloading note:', error);
    return res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Get recent notes (for student dashboard) - IMPORTANT: Specific routes must come before parameter routes
router.get('/recent', auth, async (req, res) => {
  try {
    let notes;
    
    if (req.user.role === 'student') {
      const student = await Student.findById(req.user.id);
      notes = await Note.find({ targetBatches: student.batch })
        .populate('author', 'name')
        .sort({ createdAt: -1 })
        .limit(2);
    } else if (req.user.role === 'teacher') {
      notes = await Note.find({ author: req.user.id })
        .sort({ createdAt: -1 })
        .limit(2);
    }
    
    // Transform notes to include teacher info
    const transformedNotes = notes.map(note => ({
      _id: note._id,
      title: note.title,
      subject: note.subject,
      uploadedAt: note.createdAt,
      fileUrl: note.fileUrl,
      teacher: note.author || { name: 'Unknown Teacher' }
    }));
    
    res.json(transformedNotes);
  } catch (error) {
    console.error('Error fetching recent notes:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get recent notes for a student - IMPORTANT: Specific routes must come before parameter routes
router.get('/recent/:studentId', auth, async (req, res) => {
  try {
    // Check if user is authorized to view these notes
    if (req.user.role === 'student' && req.user.id !== req.params.studentId) {
      return res.status(403).json({ message: 'Unauthorized to view these notes' });
    }
    
    const student = await Student.findById(req.params.studentId);
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
    
    // Find notes that target this student's batch
    const recentNotes = await Note.find({
      targetBatches: { $in: [student.batch] }
    })
    .sort({ createdAt: -1 })
    .limit(2)
    .populate('author', 'name');
    
    res.json(recentNotes);
  } catch (error) {
    console.error('Error fetching recent notes:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a specific note - IMPORTANT: Parameter routes must come AFTER all specific routes
router.get('/:id', auth, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id).populate('author', 'name');
    
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }
    
    // Check if user has access to this note
    if (req.user.role === 'student') {
      const student = await Student.findById(req.user.id);
      if (!note.targetBatches.includes(student.batch)) {
        return res.status(403).json({ message: 'You do not have access to this note' });
      }
    } else if (req.user.role === 'teacher' && note.author.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You do not have access to this note' });
    }
    
    res.json(note);
  } catch (error) {
    console.error('Error fetching note:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new note (teachers only)
router.post('/', auth, isTeacher, upload.single('file'), async (req, res) => {
  try {
    const { title, description, subject, content, targetBatches } = req.body;
    
    // Validate that teacher has access to these batches
    const teacher = await Teacher.findById(req.user.id);
    const batchesArray = Array.isArray(targetBatches) ? targetBatches : [targetBatches];
    
    for (const batch of batchesArray) {
      if (!teacher.batches.includes(batch)) {
        return res.status(403).json({ message: `You do not have access to batch: ${batch}` });
      }
    }
    
    const newNote = new Note({
      title,
      description,
      subject,
      content,
      targetBatches: batchesArray,
      author: req.user.id,
      fileUrl: req.file ? `/uploads/notes/${req.file.filename}` : null
    });
    
    await newNote.save();
    
    // Update teacher's published notes
    await Teacher.findByIdAndUpdate(req.user.id, {
      $push: { publishedNotes: newNote._id }
    });
    
    // Update accessible notes for students in target batches
    for (const batch of batchesArray) {
      const students = await Student.find({ batch });
      for (const student of students) {
        await Student.findByIdAndUpdate(student._id, {
          $push: { accessibleNotes: newNote._id }
        });
      }
    }
    
    res.status(201).json(newNote);
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a note (teachers only, only their own notes)
router.delete('/:id', auth, isTeacher, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }
    
    // Check if teacher is the author
    if (note.author.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only delete your own notes' });
    }
    
    // Delete file if exists
    if (note.fileUrl) {
      const filePath = path.join(__dirname, '..', note.fileUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    // Remove note from teacher's published notes
    await Teacher.findByIdAndUpdate(req.user.id, {
      $pull: { publishedNotes: note._id }
    });
    
    // Remove note from all students' accessible notes
    await Student.updateMany({}, {
      $pull: { accessibleNotes: note._id }
    });
    
    // Delete the note
    await Note.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Download PDF
router.get("/download-pdf/:id", auth, async (req, res) => {
  try {
    console.log(`[PDF Download] Request received for PDF download, ID: ${req.params.id}`);
    
    const note = await Note.findById(req.params.id).populate("teacher", "name");
    if (!note) {
      console.error(`[PDF Download] Note not found: ${req.params.id}`);
      return res.status(404).json({ msg: "Note not found" });
    }
    
    // Properly format the filename to be URL safe and include the teacher's name
    const safeFileName = `${note.title.replace(/[^a-z0-9]/gi, '_')}_by_${note.teacher.name.replace(/[^a-z0-9]/gi, '_')}.pdf`;
    console.log(`[PDF Download] Found note: ${note.title}, preparing file: ${safeFileName}`);
    
    // Check if the file exists
    const filePath = path.join(__dirname, "..", "uploads", note.fileUrl);
    if (!fs.existsSync(filePath)) {
      console.error(`[PDF Download] File not found at path: ${filePath}`);
      return res.status(404).json({ msg: "File not found on server" });
    }
    
    console.log(`[PDF Download] File exists at: ${filePath}, size: ${fs.statSync(filePath).size} bytes`);
    
    // Set proper headers for PDF content type and attachment download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);
    
    // Create a read stream and pipe it to the response
    const fileStream = fs.createReadStream(filePath);
    
    // Handle stream errors
    fileStream.on('error', (error) => {
      console.error(`[PDF Download] Stream error: ${error.message}`);
      // Only send error if headers haven't been sent
      if (!res.headersSent) {
        res.status(500).json({ msg: "Error streaming file" });
      }
    });
    
    // Log when streaming starts
    fileStream.on('open', () => {
      console.log(`[PDF Download] Started streaming file: ${safeFileName}`);
    });
    
    // Log when streaming completes
    fileStream.on('end', () => {
      console.log(`[PDF Download] Completed streaming file: ${safeFileName}`);
    });
    
    // Pipe the file to the response
    fileStream.pipe(res);
    
  } catch (err) {
    console.error(`[PDF Download] Server error: ${err.message}`);
    res.status(500).json({ msg: "Server Error", error: err.message });
  }
});

module.exports = router; 