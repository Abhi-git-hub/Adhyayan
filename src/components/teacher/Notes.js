import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';
import { FaSearch, FaFilter, FaFilePdf, FaFileWord, FaFileExcel, FaFilePowerpoint, 
  FaFileAlt, FaFileImage, FaFile, FaDownload, FaTrashAlt, FaPlus, FaEye } from 'react-icons/fa';
import './Notes.css';

const Notes = () => {
  const { user, getAuthHeader } = useContext(AuthContext);
  const [notes, setNotes] = useState([]);
  const [filteredNotes, setFilteredNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [uploadFormVisible, setUploadFormVisible] = useState(false);
  const [uploadData, setUploadData] = useState({
    title: '',
    description: '',
    subject: '',
    batch: '',
    file: null
  });
  const [uploading, setUploading] = useState(false);
  const [viewNote, setViewNote] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [batches, setBatches] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('Fetching notes for teacher ID:', user.id);
        
        // First try the teacher-specific endpoint
        let response;
        const authHeaders = {
          ...getAuthHeader(),
          'Content-Type': 'application/json'
        };
        console.log('Using auth headers:', authHeaders);
        
        try {
          response = await axios.get('/api/notes/by-teacher', {
            headers: authHeaders
          });
          console.log('Teacher notes response from by-teacher endpoint:', response.data);
        } catch (endpointError) {
          console.log('Error with by-teacher endpoint, trying main notes endpoint:', endpointError);
          // If teacher-specific endpoint fails, try the main endpoint
          response = await axios.get('/api/notes', {
            headers: authHeaders
          });
          console.log('Teacher notes response from main endpoint:', response.data);
        }
        
        // Process notes data handling different response formats
        let notesData = [];
        
        if (Array.isArray(response.data)) {
          notesData = response.data;
        } else if (response.data && typeof response.data === 'object') {
          // Try to find the notes array in the response
          if (response.data.notes && Array.isArray(response.data.notes)) {
            notesData = response.data.notes;
          } else if (response.data.documents && Array.isArray(response.data.documents)) {
            notesData = response.data.documents;
          } else {
            // Loop through object properties looking for an array
            for (const key in response.data) {
              if (Array.isArray(response.data[key])) {
                notesData = response.data[key];
                console.log(`Found notes array in field: ${key}`);
                break;
              }
            }
          }
        }
        
        // Check if there might be a batch field with notes
        if (notesData.length === 0 && response.data) {
          const batches = user.batches || [];
          for (const batch of batches) {
            if (response.data[batch] && Array.isArray(response.data[batch])) {
              notesData = response.data[batch];
              console.log(`Found notes for batch: ${batch}`);
              break;
            }
          }
        }
        
        console.log('Processed notes data:', notesData);
        
        // Make sure notes have all required fields
        notesData = notesData.filter(note => note && typeof note === 'object').map(note => {
          // Handle date formatting
          let createdDate = note.createdAt || note.date || note.uploadDate || new Date().toISOString();
          let updatedDate = note.updatedAt || createdDate;
          
          try {
            const testCreatedDate = new Date(createdDate);
            if (isNaN(testCreatedDate.getTime())) {
              createdDate = new Date().toISOString();
            }
            
            const testUpdatedDate = new Date(updatedDate);
            if (isNaN(testUpdatedDate.getTime())) {
              updatedDate = new Date().toISOString();
            }
          } catch (e) {
            createdDate = new Date().toISOString();
            updatedDate = new Date().toISOString();
          }
          
          // Extract batch info
          let batchValue = note.batch;
          if (!batchValue && Array.isArray(note.targetBatches) && note.targetBatches.length > 0) {
            batchValue = note.targetBatches[0];
          } else if (!batchValue && note.target && typeof note.target === 'object') {
            if (note.target.batch) {
              batchValue = note.target.batch;
            } else if (Array.isArray(note.target.batches) && note.target.batches.length > 0) {
              batchValue = note.target.batches[0];
            }
          }
          
          return {
            ...note,
            _id: note._id || note.id || Math.random().toString(36).substring(7),
            title: note.title || note.name || 'Untitled Note',
            description: note.description || note.desc || '',
            subject: note.subject || 'General',
            batch: batchValue || 'All Batches',
            filename: note.filename || note.file || '',
            fileUrl: note.fileUrl || note.url || '',
            createdAt: createdDate,
            updatedAt: updatedDate
          };
        });
        
        setNotes(notesData);
        setFilteredNotes(notesData);
        
        // Extract unique subjects and batches for filtering
        const uniqueSubjects = [...new Set(notesData.map(note => note.subject))].filter(Boolean);
        setSubjects(uniqueSubjects);
        
        const uniqueBatches = [...new Set(notesData.flatMap(note => {
          if (Array.isArray(note.targetBatches)) return note.targetBatches;
          if (note.batch) return [note.batch];
          return [];
        }))].filter(Boolean);
        setBatches(uniqueBatches);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching notes:', err);
        console.error('Error details:', err.response ? err.response.data : 'No response data');
        setError('Failed to load notes. Please try again later.');
        setLoading(false);
        
        // Try to fetch from localStorage if available
        const cachedNotes = localStorage.getItem('teacherNotes');
        if (cachedNotes) {
          try {
            const parsedNotes = JSON.parse(cachedNotes);
            console.log('Using cached notes:', parsedNotes.length);
            setNotes(parsedNotes);
            setFilteredNotes(parsedNotes);
            
            // Extract subjects and batches from cached data
            const uniqueSubjects = [...new Set(parsedNotes.map(note => note.subject))].filter(Boolean);
            setSubjects(uniqueSubjects);
            
            const uniqueBatches = [...new Set(parsedNotes.flatMap(note => {
              if (Array.isArray(note.targetBatches)) return note.targetBatches;
              if (note.batch) return [note.batch];
              return [];
            }))].filter(Boolean);
            setBatches(uniqueBatches);
          } catch (cacheError) {
            console.error('Error parsing cached notes:', cacheError);
          }
        }
      }
    };

    if (user && user.id) {
      fetchNotes();
    }
  }, [user, getAuthHeader]);
  
  useEffect(() => {
    // Filter notes based on search term, subject, and batch
    let filtered = notes;
    
    if (searchTerm) {
      filtered = filtered.filter(note => 
        note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedSubject !== 'all') {
      filtered = filtered.filter(note => note.subject === selectedSubject);
    }
    
    if (selectedBatch !== 'all') {
      filtered = filtered.filter(note => note.batch === selectedBatch);
    }
    
    setFilteredNotes(filtered);
  }, [searchTerm, selectedSubject, selectedBatch, notes]);
  
  const handleFileChange = (e) => {
    setUploadData({
      ...uploadData,
      file: e.target.files[0]
    });
  };
  
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    
    if (!uploadData.title || !uploadData.subject || !uploadData.batch || !uploadData.file) {
      alert('Please fill all required fields and select a file');
      return;
    }
    
    try {
      setUploading(true);
      
      const formData = new FormData();
      formData.append('title', uploadData.title);
      formData.append('description', uploadData.description);
      formData.append('subject', uploadData.subject);
      formData.append('batch', uploadData.batch);
      formData.append('file', uploadData.file);
      
      console.log('Uploading note with data:', {
        title: uploadData.title,
        description: uploadData.description,
        subject: uploadData.subject,
        batch: uploadData.batch,
        fileName: uploadData.file.name,
        fileSize: uploadData.file.size,
        fileType: uploadData.file.type
      });
      
      // Get auth headers
      const authHeaders = getAuthHeader();
      console.log('Using auth headers:', authHeaders);
      
      const response = await axios.post('/api/notes/upload', formData, {
        headers: {
          ...authHeaders,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      console.log('Upload response:', response.data);
      
      // Refresh notes list
      const notesResponse = await axios.get('/api/notes/by-teacher', {
        headers: authHeaders
      });
      
      console.log('Notes refresh response:', notesResponse.data);
      
      setNotes(notesResponse.data);
      setFilteredNotes(notesResponse.data);
      
      // Reset form
      setUploadData({
        title: '',
        description: '',
        subject: '',
        batch: '',
        file: null
      });
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      setUploadFormVisible(false);
      setUploading(false);
      
      alert('Note uploaded successfully!');
    } catch (error) {
      console.error('Error uploading note:', error);
      console.error('Error details:', error.response ? error.response.data : 'No response data');
      alert('Failed to upload note. Please try again.');
      setUploading(false);
    }
  };
  
  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Are you sure you want to delete this note?')) {
      return;
    }
    
    try {
      console.log('Deleting note with ID:', noteId);
      
      // Get auth headers
      const authHeaders = getAuthHeader();
      console.log('Using auth headers for note deletion:', authHeaders);
      
      const response = await axios.delete(`/api/notes/${noteId}`, {
        headers: authHeaders
      });
      
      console.log('Delete response:', response.data);
      
      // Update notes list
      setNotes(notes.filter(note => note._id !== noteId));
      setFilteredNotes(filteredNotes.filter(note => note._id !== noteId));
      
      alert('Note deleted successfully!');
    } catch (error) {
      console.error('Error deleting note:', error);
      console.error('Error details:', error.response ? error.response.data : 'No response data');
      alert(error.response?.data?.message || 'Failed to delete note. Please try again.');
    }
  };
  
  const getFileIcon = (filename) => {
    if (!filename) return <FaFile />;
    
    const extension = filename.split('.').pop().toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return <FaFilePdf />;
      case 'doc':
      case 'docx':
        return <FaFileWord />;
      case 'xls':
      case 'xlsx':
        return <FaFileExcel />;
      case 'ppt':
      case 'pptx':
        return <FaFilePowerpoint />;
      case 'txt':
        return <FaFileAlt />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <FaFileImage />;
      default:
        return <FaFile />;
    }
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  if (loading) {
    return (
      <div className="notes-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading notes...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="notes-container">
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button onClick={() => window.location.reload()} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="notes-container">
      <div className="notes-header">
        <div>
          <h2>Study Materials</h2>
          <p>Upload and manage study materials for your students</p>
        </div>
        <button 
          className="upload-button"
          onClick={() => setUploadFormVisible(!uploadFormVisible)}
        >
          <FaPlus /> {uploadFormVisible ? 'Cancel Upload' : 'Upload New Material'}
        </button>
      </div>
      
      {notes.length === 0 && !uploadFormVisible ? (
        <div className="no-notes">
          <p>No study materials available.</p>
          <div className="empty-state-message">
            <p>Click the "Upload New Material" button to add your first study material.</p>
          </div>
        </div>
      ) : (
        <>
          {uploadFormVisible && (
            <div className="upload-form-container">
              <h3>Upload New Study Material</h3>
              <form onSubmit={handleUploadSubmit} className="upload-form">
                <div className="form-group">
                  <label htmlFor="title">Title *</label>
                  <input
                    type="text"
                    id="title"
                    value={uploadData.title}
                    onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    value={uploadData.description}
                    onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                  ></textarea>
                </div>
                
                <div className="form-group">
                  <label htmlFor="subject">Subject *</label>
                  <select
                    id="subject"
                    value={uploadData.subject}
                    onChange={(e) => setUploadData({ ...uploadData, subject: e.target.value })}
                    required
                  >
                    <option value="">Select Subject</option>
                    {user.subjects && user.subjects.map((subject, index) => (
                      <option key={index} value={subject}>{subject}</option>
                    ))}
                    {(!user.subjects || user.subjects.length === 0) && (
                      <>
                        <option value="Mathematics">Mathematics</option>
                        <option value="Physics">Physics</option>
                        <option value="Chemistry">Chemistry</option>
                        <option value="Biology">Biology</option>
                        <option value="English">English</option>
                        <option value="Social Studies">Social Studies</option>
                        <option value="Computer Science">Computer Science</option>
                      </>
                    )}
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="batch">Target Batch *</label>
                  <select
                    id="batch"
                    value={uploadData.batch}
                    onChange={(e) => setUploadData({ ...uploadData, batch: e.target.value })}
                    required
                  >
                    <option value="">Select Batch</option>
                    {user.batches && user.batches.map((batch, index) => (
                      <option key={index} value={batch}>{batch}</option>
                    ))}
                    {(!user.batches || user.batches.length === 0) && (
                      <>
                        <option value="Udbhav">Udbhav</option>
                        <option value="Maadhyam">Maadhyam</option>
                        <option value="Vedant">Vedant</option>
                      </>
                    )}
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="file">Upload File (PDF, DOC, PPT, etc.) *</label>
                  <input
                    type="file"
                    id="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
                    required
                  />
                  <small className="file-info">
                    Supported formats: PDF, Word, PowerPoint, Excel, Text, and Images. Max size: 10MB
                  </small>
                </div>
                
                <div className="form-actions">
                  <button 
                    type="button" 
                    className="cancel-button"
                    onClick={() => setUploadFormVisible(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="submit-button"
                    disabled={uploading}
                  >
                    {uploading ? 'Uploading...' : 'Upload Material'}
                  </button>
                </div>
              </form>
            </div>
          )}
          
          <div className="notes-filters">
            <div className="search-box">
              <FaSearch />
              <input
                type="text"
                placeholder="Search by title or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="filter-box">
              <FaFilter />
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
              >
                <option value="all">All Subjects</option>
                {subjects.map((subject, index) => (
                  <option key={index} value={subject}>{subject}</option>
                ))}
              </select>
            </div>
            
            <div className="filter-box">
              <FaFilter />
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
              >
                <option value="all">All Batches</option>
                {batches.map((batch, index) => (
                  <option key={index} value={batch}>{batch}</option>
                ))}
              </select>
            </div>
          </div>
          
          {filteredNotes.length > 0 ? (
            <div className="notes-grid">
              {filteredNotes.map(note => (
                <div key={note._id} className="note-card">
                  <div className="note-icon">
                    {getFileIcon(note.filename)}
                  </div>
                  <div className="note-content">
                    <h4>{note.title}</h4>
                    <p className="note-description">{note.description}</p>
                    <div className="note-details">
                      <span>Subject: {note.subject}</span>
                      <span>Batch: {note.batch}</span>
                      <span>Uploaded: {formatDate(note.createdAt)}</span>
                    </div>
                  </div>
                  <div className="note-actions">
                    <button 
                      className="view-button"
                      onClick={() => setViewNote(note)}
                      title="View Details"
                    >
                      <FaEye />
                    </button>
                    <button 
                      className="download-button"
                      onClick={() => {
                        const authHeaders = getAuthHeader();
                        console.log('Downloading note with ID:', note._id);
                        console.log('Using auth headers for download:', authHeaders);
                        
                        // Create a temporary anchor element
                        const downloadNote = async () => {
                          try {
                            const response = await axios.get(`/api/notes/download/${note._id}`, {
                              responseType: 'blob',
                              headers: authHeaders
                            });
                            
                            // Create a blob URL from the response data
                            const blob = new Blob([response.data], { type: 'application/pdf' });
                            const url = window.URL.createObjectURL(blob);
                            
                            // Create a download link and click it
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${note.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            
                            // Clean up
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                            
                          } catch (error) {
                            console.error('Error downloading note:', error);
                            alert('Failed to download the note. Please try again.');
                          }
                        };
                        
                        downloadNote();
                      }}
                      title="Download"
                    >
                      <FaDownload />
                    </button>
                    <button 
                      className="delete-button"
                      onClick={() => handleDeleteNote(note._id)}
                      title="Delete"
                    >
                      <FaTrashAlt />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-notes">
              <p>No study materials found matching your criteria.</p>
              <button 
                className="upload-button"
                onClick={() => setUploadFormVisible(true)}
              >
                <FaPlus /> Upload New Material
              </button>
            </div>
          )}
          
          {viewNote && (
            <div className="note-modal-overlay" onClick={() => setViewNote(null)}>
              <div className="note-modal" onClick={(e) => e.stopPropagation()}>
                <h3>{viewNote.title}</h3>
                <div className="note-modal-content">
                  <div className="note-modal-icon">
                    {getFileIcon(viewNote.filename)}
                  </div>
                  <div className="note-modal-details">
                    <p><strong>Description:</strong> {viewNote.description || 'No description provided'}</p>
                    <p><strong>Subject:</strong> {viewNote.subject}</p>
                    <p><strong>Batch:</strong> {viewNote.batch}</p>
                    <p><strong>Filename:</strong> {viewNote.filename}</p>
                    <p><strong>Uploaded:</strong> {formatDate(viewNote.createdAt)}</p>
                    <p><strong>Last Updated:</strong> {formatDate(viewNote.updatedAt)}</p>
                  </div>
                </div>
                <div className="note-modal-actions">
                  <button 
                    className="modal-close-button"
                    onClick={() => setViewNote(null)}
                  >
                    Close
                  </button>
                  <button 
                    className="modal-download-button"
                    onClick={() => {
                      const authHeaders = getAuthHeader();
                      console.log('Downloading note with ID:', viewNote._id);
                      console.log('Using auth headers for download:', authHeaders);
                      
                      // Create a temporary anchor element
                      const downloadNote = async () => {
                        try {
                          const response = await axios.get(`/api/notes/download/${viewNote._id}`, {
                            responseType: 'blob',
                            headers: authHeaders
                          });
                          
                          // Create a blob URL from the response data
                          const blob = new Blob([response.data], { type: 'application/pdf' });
                          const url = window.URL.createObjectURL(blob);
                          
                          // Create a download link and click it
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${viewNote.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
                          document.body.appendChild(a);
                          a.click();
                          
                          // Clean up
                          window.URL.revokeObjectURL(url);
                          document.body.removeChild(a);
                          
                        } catch (error) {
                          console.error('Error downloading note:', error);
                          alert('Failed to download the note. Please try again.');
                        }
                      };
                      
                      downloadNote();
                    }}
                  >
                    <FaDownload /> Download
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Notes; 