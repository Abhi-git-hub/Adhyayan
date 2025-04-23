const express = require('express');
const router = express.Router();
const noteController = require('../controllers/noteController');
const { isTeacher } = require('../middleware/auth');

// All routes require teacher authentication
router.use(isTeacher);

// Get notes page
router.get('/', noteController.getNotesPage);

// Upload note
router.post('/upload', noteController.uploadNote);

// Delete note
router.delete('/:noteId', async (req, res) => {
  try {
    // Check if noteId is a valid ObjectId
    if (!req.params.noteId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid note ID format' });
    }
    
    await noteController.deleteNote(req, res);
  } catch (error) {
    console.error('Error in deleteNote route:', error);
    res.status(500).json({ error: 'Error deleting note' });
  }
});

module.exports = router; 