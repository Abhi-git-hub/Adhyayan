const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const Note = require('../models/Note');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Batch = require('../models/Batch');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/notes';
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Create unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, uniqueSuffix + extension);
  }
});

// File filter to allow only PDFs
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// @route   POST /api/notes/upload
// @desc    Upload a new note
// @access  Private (Teachers only)
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    // Check if user is a teacher
    if (req.user.role !== 'teacher') {
      // Delete uploaded file if exists
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(403).json({ message: 'Only teachers can upload notes' });
    }

    const { title, subject, description, batch } = req.body;
    
    // Validate required fields
    if (!title || !subject || !batch || !req.file) {
      // Delete uploaded file if exists
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if batch exists
    const batchExists = await Batch.findById(batch);
    if (!batchExists) {
      // Delete uploaded file
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ message: 'Batch not found' });
    }

    // Get teacher information
    const teacher = await Teacher.findOne({ user: req.user.id });
    if (!teacher) {
      // Delete uploaded file
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ message: 'Teacher profile not found' });
    }

    // Create new note
    const newNote = new Note({
      title,
      subject,
      description,
      batch,
      filePath: req.file.path,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      teacher: teacher._id,
      teacherName: teacher.name
    });

    await newNote.save();

    res.json({
      message: 'Note uploaded successfully',
      note: {
        _id: newNote._id,
        title: newNote.title,
        subject: newNote.subject,
        fileName: newNote.fileName,
        uploadDate: newNote.uploadDate
      }
    });
  } catch (err) {
    // Delete uploaded file if exists
    if (req.file && req.file.path) {
      fs.unlinkSync(req.file.path);
    }
    
    console.error('Error uploading note:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// @route   GET /api/notes/teacher
// @desc    Get all notes uploaded by current teacher
// @access  Private (Teachers only)
router.get('/teacher', auth, async (req, res) => {
  try {
    // Check if user is a teacher
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get teacher information
    const teacher = await Teacher.findOne({ user: req.user.id });
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher profile not found' });
    }

    // Get notes
    const notes = await Note.find({ teacher: teacher._id })
      .sort({ uploadDate: -1 })
      .populate('batch', 'name');

    // Format response
    const formattedNotes = notes.map(note => ({
      _id: note._id,
      title: note.title,
      subject: note.subject,
      description: note.description,
      fileName: note.fileName,
      uploadDate: note.uploadDate,
      batchName: note.batch ? note.batch.name : 'Unknown'
    }));

    res.json(formattedNotes);
  } catch (err) {
    console.error('Error fetching teacher notes:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// @route   GET /api/notes/student
// @desc    Get all notes for current student's batch
// @access  Private (Students only)
router.get('/student', auth, async (req, res) => {
  try {
    // Check if user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get student's batch
    const student = await Student.findOne({ user: req.user.id });
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    // Get notes for student's batch
    const notes = await Note.find({ batch: student.batch })
      .sort({ uploadDate: -1 })
      .populate('teacher', 'name');

    // Format response
    const formattedNotes = notes.map(note => ({
      _id: note._id,
      title: note.title,
      subject: note.subject,
      description: note.description,
      fileName: note.fileName,
      uploadDate: note.uploadDate,
      teacherName: note.teacherName || (note.teacher ? note.teacher.name : 'Unknown')
    }));

    res.json(formattedNotes);
  } catch (err) {
    console.error('Error fetching student notes:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// @route   GET /api/notes/download/:id
// @desc    Download a note
// @access  Private (Teachers and Students)
router.get('/download/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Find the note
    const note = await Note.findById(id);
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Check authorization
    if (req.user.role === 'teacher') {
      // Teachers can download any note they uploaded
      const teacher = await Teacher.findOne({ user: req.user.id });
      if (!teacher || note.teacher.toString() !== teacher._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    } else if (req.user.role === 'student') {
      // Students can only download notes for their batch
      const student = await Student.findOne({ user: req.user.id });
      if (!student || note.batch.toString() !== student.batch.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if file exists
    if (!fs.existsSync(note.filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Send file
    res.download(note.filePath, note.fileName);
  } catch (err) {
    console.error('Error downloading note:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// @route   DELETE /api/notes/:id
// @desc    Delete a note
// @access  Private (Teachers only)
router.delete('/:id', auth, async (req, res) => {
  try {
    // Check if user is a teacher
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can delete notes' });
    }

    const { id } = req.params;

    // Find the note
    const note = await Note.findById(id);
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Check if user is the note's owner
    const teacher = await Teacher.findOne({ user: req.user.id });
    if (!teacher || note.teacher.toString() !== teacher._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Delete file
    if (fs.existsSync(note.filePath)) {
      fs.unlinkSync(note.filePath);
    }

    // Delete note from database
    await Note.findByIdAndDelete(id);

    res.json({ message: 'Note deleted successfully' });
  } catch (err) {
    console.error('Error deleting note:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router; 