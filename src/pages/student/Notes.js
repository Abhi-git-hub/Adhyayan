import React, { useEffect, useState, useCallback } from 'react';
import { Container, Card, Button, Row, Col, Alert, Badge, Spinner } from 'react-bootstrap';
import axios from 'axios';
import { baseUrl } from '../../config';
import StudentNavbar from '../../components/student/NavBar';
import Loader from '../../components/Loader';
import { FaDownload, FaEye, FaBook, FaCalendarAlt, FaChalkboardTeacher } from 'react-icons/fa';

const StudentNotes = () => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewingNote, setViewingNote] = useState(null);

  // Debug state to track API calls
  const [debug] = useState({
    apiCalled: false,
    tokenFound: false,
    notesCount: 0
  });

  // Clear error after a timeout
  const clearErrorAfterTimeout = useCallback((message, timeout = 5000) => {
    setError(message);
    setTimeout(() => {
      setError('');
    }, timeout);
  }, []);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        // Update debug state
        setDebug(prev => ({ ...prev, apiCalled: true, tokenFound: !!token }));
        
        if (!token) {
          throw new Error('Authentication token not found');
        }

        console.log('Fetching notes with token:', token);
        console.log('API URL:', `${baseUrl}/api/notes`);

        const response = await axios.get(`${baseUrl}/api/notes`, {
          headers: {
            'x-auth-token': token
          }
        });

        console.log('Notes API response:', response.data);
        
        // Make sure we handle empty arrays and nulls
        if (response.data && Array.isArray(response.data)) {
          setNotes(response.data);
          // Update debug state with notes count
          setDebug(prev => ({ ...prev, notesCount: response.data.length }));
        } else {
          console.warn('Received invalid notes data:', response.data);
          setNotes([]);
          setDebug(prev => ({ ...prev, notesCount: 0 }));
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching notes:', err);
        setError(`Failed to load notes. ${err.message}`);
        setLoading(false);
      }
    };

    fetchNotes();
  }, []);

  const handleDownload = async (noteId, fileName) => {
    try {
      console.log(`Attempting to download note with ID: ${noteId}, fileName: ${fileName}`);
      
      // Set download status to show loading indicator
      setNotes(prevNotes => 
        prevNotes.map(note => 
          note._id === noteId ? { ...note, isDownloading: true } : note
        )
      );
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      // Use the correct PDF download endpoint
      const response = await axios({
        method: 'GET',
        url: `${baseUrl}/api/notes/download-pdf/${noteId}`,
        responseType: 'blob',
        headers: {
          'x-auth-token': token
        }
      });
      
      console.log('Download response received, type:', response.data.type, 'size:', response.data.size);
      
      // Check if the response is empty or too small (possibly an error)
      if (response.data.size < 100) {
        throw new Error('The downloaded file appears to be empty or corrupted');
      }
      
      // Create blob with the correct MIME type
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      
      // Ensure the filename ends with .pdf
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9_-]/g, '_');
      const finalFileName = sanitizedFileName.endsWith('.pdf') ? sanitizedFileName : `${sanitizedFileName}.pdf`;
      link.setAttribute('download', finalFileName);
      
      // Start download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      // Reset download status
      setNotes(prevNotes => 
        prevNotes.map(note => 
          note._id === noteId ? { ...note, isDownloading: false } : note
        )
      );
    } catch (err) {
      console.error('Error downloading note:', err);
      
      let errorMessage = 'Failed to download note';
      if (err.response) {
        errorMessage += `: ${err.response.status} - ${err.response.statusText}`;
      } else if (err.request) {
        errorMessage += ': No response received from server';
      } else {
        errorMessage += `: ${err.message}`;
      }
      
      clearErrorAfterTimeout(errorMessage, 8000);
      
      // Reset download status on error
      setNotes(prevNotes => 
        prevNotes.map(note => 
          note._id === noteId ? { ...note, isDownloading: false } : note
        )
      );
    }
  };

  const handleViewNote = (note) => {
    setViewingNote(note);
  };

  const closeNoteView = () => {
    setViewingNote(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <>
      <StudentNavbar />
      <Container className="mt-4">
        <h2 className="mb-4">Study Notes</h2>
        
        {/* Debug info in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-3">
            <small>
              <strong>Debug Info:</strong> 
              API Called: {debug.apiCalled ? 'Yes' : 'No'} | 
              Token Found: {debug.tokenFound ? 'Yes' : 'No'} |
              Notes Count: {debug.notesCount} |
              Base URL: {baseUrl}
            </small>
          </div>
        )}
        
        {error && <Alert variant="danger">{error}</Alert>}
        
        {loading ? (
          <div className="text-center">
            <Loader />
            <p>Loading notes...</p>
          </div>
        ) : (
          <>
            {notes.length === 0 ? (
              <Alert variant="info">No notes available for your batch yet.</Alert>
            ) : (
              <Row>
                {notes.map((note) => (
                  <Col md={4} key={note._id} className="mb-4">
                    <Card className="h-100 shadow-sm">
                      <Card.Header className="bg-primary text-white">
                        <Badge bg="light" text="dark" className="float-end">
                          {note.subject}
                        </Badge>
                        <h5 className="mb-0">{note.title}</h5>
                      </Card.Header>
                      <Card.Body>
                        <div className="mb-3 text-muted small">
                          <FaCalendarAlt className="me-1" />
                          <strong>Date:</strong> {formatDate(note.uploadDate || note.createdAt)}
                        </div>
                        <Card.Text className="mb-4" style={{ minHeight: '60px' }}>
                          {note.description || 'No description provided'}
                        </Card.Text>
                        <div className="d-flex justify-content-between">
                          <Button 
                            variant="outline-primary" 
                            onClick={() => handleViewNote(note)}
                            className="me-2"
                          >
                            <FaEye className="me-1" />
                            View Details
                          </Button>
                          <Button 
                            variant="primary" 
                            onClick={() => handleDownload(note._id, note.fileName || `${note.title}.pdf`)}
                            disabled={note.isDownloading}
                          >
                            <FaDownload className="me-1" />
                            {note.isDownloading ? 
                              <span><Spinner size="sm" animation="border" className="me-1" /> Downloading...</span> : 
                              'Download PDF'}
                          </Button>
                        </div>
                      </Card.Body>
                      <Card.Footer className="text-muted bg-light">
                        <FaChalkboardTeacher className="me-1" />
                        <strong>Teacher:</strong> {note.teacherName || (note.author && note.author.name) || 'Teacher'}
                      </Card.Footer>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
            
            {/* Note details modal */}
            {viewingNote && (
              <div className="position-fixed top-0 start-0 w-100 h-100" 
                   style={{
                     backgroundColor: 'rgba(0,0,0,0.5)', 
                     zIndex: 1050,
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center'
                   }}
                   onClick={closeNoteView}
              >
                <Card 
                  className="shadow" 
                  style={{width: '80%', maxWidth: '800px', maxHeight: '80vh', overflow: 'auto'}}
                  onClick={e => e.stopPropagation()}
                >
                  <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
                    <h4 className="mb-0">{viewingNote.title}</h4>
                    <Button variant="light" size="sm" onClick={closeNoteView}>×</Button>
                  </Card.Header>
                  <Card.Body>
                    <Row className="mb-4">
                      <Col md={6}>
                        <p><strong>Subject:</strong> {viewingNote.subject}</p>
                        <p><strong>Uploaded:</strong> {formatDate(viewingNote.uploadDate || viewingNote.createdAt)}</p>
                      </Col>
                      <Col md={6}>
                        <p><strong>Teacher:</strong> {viewingNote.teacherName || (viewingNote.author && viewingNote.author.name) || 'Teacher'}</p>
                        <p><strong>File Format:</strong> PDF</p>
                      </Col>
                    </Row>
                    <h5>Description</h5>
                    <p>{viewingNote.description || 'No description provided for this note.'}</p>
                    <div className="text-center mt-4">
                      <Button 
                        variant="primary"
                        onClick={() => {
                          handleDownload(viewingNote._id, viewingNote.fileName || `${viewingNote.title}.pdf`);
                          closeNoteView();
                        }}
                      >
                        <FaDownload className="me-1" />
                        Download as PDF
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </div>
            )}
          </>
        )}
      </Container>
    </>
  );
};

export default StudentNotes; 