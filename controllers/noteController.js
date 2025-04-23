const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Teacher = require('../models/Teacher');
const Note = require('../models/Note');

// Configure multer for PDF uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'public/uploads/notes';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Get notes page with upload form
exports.getNotesPage = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user._id);
    const batches = teacher.batches;
    const subjects = teacher.subjects;
    
    // Get existing notes for the teacher's batches
    const notes = await Note.find({
      teacher: teacher._id,
      batch: { $in: batches }
    }).sort({ uploadDate: -1 });
    
    res.render('teacher/notes', {
      title: 'Notes & Tests',
      batches,
      subjects,
      notes
    });
  } catch (error) {
    console.error('Error in getNotesPage:', error);
    res.status(500).render('error', { message: 'Error loading notes page' });
  }
};

// Upload a new note or test
exports.uploadNote = [
  upload.single('pdfFile'),
  async (req, res) => {
    try {
      const { title, batch, subject, type, description } = req.body;
      const teacher = await Teacher.findById(req.user._id);
      
      if (!teacher.batches.includes(batch)) {
        return res.status(403).json({ error: 'Not authorized for this batch' });
      }
      
      if (!teacher.subjects.includes(subject)) {
        return res.status(403).json({ error: 'Not authorized for this subject' });
      }
      
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      const note = new Note({
        title,
        teacher: teacher._id,
        batch,
        subject,
        type,
        fileUrl: `/uploads/notes/${req.file.filename}`,
        description
      });
      
      await note.save();
      
      res.json({ success: true, message: 'File uploaded successfully' });
    } catch (error) {
      console.error('Error in uploadNote:', error);
      res.status(500).json({ error: 'Error uploading file' });
    }
  }
];

// Delete a note
exports.deleteNote = async (req, res) => {
  try {
    const { noteId } = req.params;
    const teacher = await Teacher.findById(req.user._id);
    
    const note = await Note.findById(noteId);
    if (!note || note.teacher.toString() !== teacher._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    // Delete file from storage
    const filePath = path.join('public', note.fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    await note.remove();
    
    res.json({ success: true, message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Error in deleteNote:', error);
    res.status(500).json({ error: 'Error deleting note' });
  }
}; 