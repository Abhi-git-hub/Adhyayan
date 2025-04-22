import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { FaDownload, FaEye, FaSearch, FaFilter } from 'react-icons/fa';
import './Notes.css';

const Notes = () => {
  const { user, getAuthHeader } = useContext(AuthContext);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        // Log user info for debugging
        console.log('Current user accessing notes:', user?.name);
        setLoading(true);
        console.log('Fetching notes for student batch...');
        
        // Get auth headers
        const token = localStorage.getItem('token');
        const authHeaders = token ? { 'x-auth-token': token } : {};
        console.log('Using auth headers:', authHeaders);
        
        // Use the correct endpoint for students to fetch notes
        const response = await axios.get('/api/notes', {
          headers: authHeaders
        });
        
        console.log('Notes response:', response.data);
        
        // Ensure we have an array of notes
        const notesData = Array.isArray(response.data) ? response.data : [];
        setNotes(notesData);
        
        // Extract unique subjects for filter
        const uniqueSubjects = [...new Set(notesData.map(note => note.subject))];
        setSubjects(uniqueSubjects);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching notes:', err);
        console.error('Error details:', err.response ? err.response.data : 'No response data');
        setError('Failed to fetch notes. Please try again later.');
        setLoading(false);
      }
    };

    fetchNotes();
  }, []);

  const handleDownload = async (noteId, fileName) => {
    try {
      // Get auth headers
      const token = localStorage.getItem('token');
      const authHeaders = token ? { 'x-auth-token': token } : {};
      console.log('Using auth headers for download:', authHeaders);
      
      const response = await axios.get(`/api/notes/download/${noteId}`, {
        responseType: 'blob',
        headers: authHeaders
      });
      
      // Create a URL for the blob
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName || 'note-file');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error downloading note:', err);
      console.error('Error details:', err.response ? err.response.data : 'No response data');
      alert('Failed to download the note. Please try again.');
    }
  };

  const handleView = (note) => {
    setSelectedNote(note);
    setViewModalOpen(true);
  };

  const closeViewModal = () => {
    setViewModalOpen(false);
    setSelectedNote(null);
  };

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (note.description && note.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSubject = filterSubject === '' || note.subject === filterSubject;
    return matchesSearch && matchesSubject;
  });

  return (
    <div className="notes-container">
      <div className="notes-header">
        <h2>Study Materials</h2>
        <p>Access all your class notes and study materials</p>
      </div>

      <div className="notes-filters">
        <div className="search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="filter-box">
          <FaFilter className="filter-icon" />
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
          >
            <option value="">All Subjects</option>
            {subjects.map((subject, index) => (
              <option key={index} value={subject}>{subject}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="notes-loading">Loading study materials...</div>
      ) : error ? (
        <div className="notes-error">{error}</div>
      ) : filteredNotes.length === 0 ? (
        <div className="notes-empty">
          <p>No study materials found. {searchTerm || filterSubject ? 'Try adjusting your filters.' : ''}</p>
        </div>
      ) : (
        <div className="notes-grid">
          {filteredNotes.map((note) => (
            <div className="note-card" key={note._id}>
              <div className="note-card-header">
                <span className="note-subject">{note.subject}</span>
                <span className="note-date">{new Date(note.createdAt).toLocaleDateString()}</span>
              </div>
              <h3 className="note-title">{note.title}</h3>
              <p className="note-description">{note.description}</p>
              <div className="note-actions">
                <button 
                  className="view-button"
                  onClick={() => handleView(note)}
                >
                  <FaEye /> View
                </button>
                {note.fileUrl && (
                  <button 
                    className="download-button"
                    onClick={() => handleDownload(note._id, note.title)}
                  >
                    <FaDownload /> Download
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewModalOpen && selectedNote && (
        <div className="note-view-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{selectedNote.title}</h3>
              <button className="close-button" onClick={closeViewModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="note-details">
                <p><strong>Subject:</strong> {selectedNote.subject}</p>
                <p><strong>Uploaded:</strong> {new Date(selectedNote.createdAt).toLocaleDateString()}</p>
                <p><strong>Description:</strong> {selectedNote.description}</p>
                {selectedNote.content && (
                  <div className="note-content">
                    <h4>Content:</h4>
                    <div dangerouslySetInnerHTML={{ __html: selectedNote.content }} />
                  </div>
                )}
              </div>
              {selectedNote.fileUrl && (
                <div className="note-preview">
                  <div className="no-preview">
                    <p>File is available for download.</p>
                    <button 
                      className="download-button"
                      onClick={() => handleDownload(selectedNote._id, selectedNote.title)}
                    >
                      <FaDownload /> Download
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notes; 