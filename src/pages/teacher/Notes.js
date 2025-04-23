import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Card, Row, Col, Alert, Table } from 'react-bootstrap';
import axios from 'axios';
import { baseUrl } from '../../config';
import TeacherNavbar from '../../components/TeacherNavbar';
import Loader from '../../components/Loader';

const TeacherNotes = () => {
  const [batches, setBatches] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Debug state
  const [debug, setDebug] = useState({
    apiCalled: false,
    batchesFetched: false,
    notesFetched: false,
    tokenFound: false
  });
  
  // Form state
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [file, setFile] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Get token with fallback for testing
        let token = localStorage.getItem('token');
        
        if (!token) {
          console.warn('No token found in localStorage, setting a test token for development');
          // In development, create a test token
          if (process.env.NODE_ENV === 'development') {
            token = 'test-token-for-development-only';
            localStorage.setItem('token', token);
          } else {
            throw new Error('Authentication token not found');
          }
        }
        
        // Update debug state
        setDebug(prev => ({ ...prev, apiCalled: true, tokenFound: !!token }));
        
        console.log('Using token:', token);

        // Fetch batches
        try {
          console.log('Fetching batches...');
          const batchesResponse = await axios.get(`${baseUrl}/api/teachers/batches`, {
            headers: {
              'x-auth-token': token
            }
          });
          
          console.log('Batches response:', batchesResponse.data);
          setBatches(batchesResponse.data);
          setDebug(prev => ({ ...prev, batchesFetched: true }));
        } catch (batchError) {
          console.error('Error fetching batches:', batchError.message);
          // Continue to fetch notes even if batches fail
          // Use default batch data
          setBatches([
            { _id: 'Udbhav', name: 'Udbhav' },
            { _id: 'Maadhyam', name: 'Maadhyam' },
            { _id: 'Vedant', name: 'Vedant' }
          ]);
        }
        
        // Fetch teacher's notes
        try {
          console.log('About to fetch notes, sending token header:', token);
          console.log('Request URL:', `${baseUrl}/api/notes/by-teacher`);
          
          const notesResponse = await axios.get(`${baseUrl}/api/notes/by-teacher`, {
            headers: {
              'x-auth-token': token,
              'Content-Type': 'application/json'
            }
          });
          
          console.log('Notes response:', notesResponse.data);
          setNotes(notesResponse.data);
          setDebug(prev => ({ ...prev, notesFetched: true }));
        } catch (notesError) {
          console.error('Error fetching notes:', notesError.response ? notesError.response.data : notesError.message);
          setError(`Failed to load notes: ${notesError.response ? notesError.response.data.message : notesError.message}`);
          // Set empty notes array
          setNotes([]);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(`Failed to load data: ${err.message}`);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    
    if (!selectedFile) {
      return setFile(null);
    }
    
    // Check if file is PDF
    if (selectedFile.type !== 'application/pdf') {
      setError('Only PDF files are allowed.');
      return setFile(null);
    }
    
    // Check file size (limit to 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB limit.');
      return setFile(null);
    }
    
    console.log('File selected:', selectedFile.name, selectedFile.size, selectedFile.type);
    
    setError('');
    setFile(selectedFile);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Reset messages
    setError('');
    setSuccess('');
    
    if (!file) {
      return setError('Please select a PDF file to upload.');
    }
    
    try {
      setUploading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      console.log('Uploading note:', {
        title, subject, description, batch: selectedBatch, fileName: file.name
      });
      
      // Create form data
      const formData = new FormData();
      formData.append('title', title);
      formData.append('subject', subject);
      formData.append('description', description);
      formData.append('batch', selectedBatch);
      formData.append('file', file);
      
      // Add debug info
      console.log('Form data created with file:', file.name);
      
      const uploadResponse = await axios.post(`${baseUrl}/api/notes/upload`, formData, {
        headers: {
          'x-auth-token': token,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      console.log('Upload response:', uploadResponse.data);
      
      // Reset form
      setTitle('');
      setSubject('');
      setDescription('');
      setSelectedBatch('');
      setFile(null);
      document.getElementById('fileInput').value = '';
      
      // Refresh notes list
      const notesResponse = await axios.get(`${baseUrl}/api/notes/by-teacher`, {
        headers: {
          'x-auth-token': token
        }
      });
      
      setNotes(notesResponse.data);
      setSuccess('Note uploaded successfully!');
      setUploading(false);
    } catch (err) {
      console.error('Error uploading note:', err);
      setError(`Failed to upload note: ${err.message}`);
      setUploading(false);
    }
  };

  const handleDelete = async (noteId) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      console.log('Deleting note:', noteId);
      
      await axios.delete(`${baseUrl}/api/notes/${noteId}`, {
        headers: {
          'x-auth-token': token
        }
      });
      
      // Remove note from state
      setNotes(notes.filter(note => note._id !== noteId));
      setSuccess('Note deleted successfully!');
    } catch (err) {
      console.error('Error deleting note:', err);
      setError(`Failed to delete note: ${err.message}`);
    }
  };

  const handleDownload = async (noteId, fileName) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      console.log('Downloading note:', noteId, fileName);
      
      const response = await axios({
        method: 'GET',
        url: `${baseUrl}/api/notes/download-pdf/${noteId}`,
        responseType: 'blob',
        headers: {
          'x-auth-token': token
        }
      });
      
      // Create blob with the correct MIME type
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
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
    } catch (err) {
      console.error('Error downloading note:', err);
      setError(`Failed to download note: ${err.message}`);
    }
  };

  return (
    <>
      <TeacherNavbar />
      <Container className="mt-4">
        <h2 className="mb-4">Manage Study Notes</h2>
        
        {/* Debug info in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-3">
            <small>
              <strong>Debug Info:</strong> 
              API Called: {debug.apiCalled ? 'Yes' : 'No'} | 
              Token Found: {debug.tokenFound ? 'Yes' : 'No'} |
              Batches Fetched: {debug.batchesFetched ? 'Yes' : 'No'} |
              Notes Fetched: {debug.notesFetched ? 'Yes' : 'No'} |
              Base URL: {baseUrl}
            </small>
          </div>
        )}
        
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}
        
        {loading ? (
          <div className="text-center">
            <Loader />
            <p>Loading data...</p>
          </div>
        ) : (
          <Row>
            <Col md={5}>
              <Card className="mb-4">
                <Card.Header as="h5">Upload New Note</Card.Header>
                <Card.Body>
                  <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3">
                      <Form.Label>Title</Form.Label>
                      <Form.Control
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                      />
                    </Form.Group>
                    
                    <Form.Group className="mb-3">
                      <Form.Label>Subject</Form.Label>
                      <Form.Control
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        required
                      />
                    </Form.Group>
                    
                    <Form.Group className="mb-3">
                      <Form.Label>Description</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    </Form.Group>
                    
                    <Form.Group className="mb-3">
                      <Form.Label>Select Batch</Form.Label>
                      <Form.Control
                        as="select"
                        value={selectedBatch}
                        onChange={(e) => setSelectedBatch(e.target.value)}
                        required
                      >
                        <option value="">-- Select Batch --</option>
                        {batches.map(batch => (
                          <option key={batch._id} value={batch._id}>
                            {batch.name}
                          </option>
                        ))}
                      </Form.Control>
                    </Form.Group>
                    
                    <Form.Group className="mb-3">
                      <Form.Label>Upload PDF</Form.Label>
                      <Form.Control
                        type="file"
                        id="fileInput"
                        accept="application/pdf"
                        onChange={handleFileChange}
                        required
                      />
                      <Form.Text className="text-muted">
                        Only PDF files up to 10MB are allowed.
                      </Form.Text>
                    </Form.Group>
                    
                    <Button variant="primary" type="submit" disabled={uploading}>
                      {uploading ? 'Uploading...' : 'Upload Note'}
                    </Button>
                  </Form>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={7}>
              <Card>
                <Card.Header as="h5">My Uploaded Notes</Card.Header>
                <Card.Body>
                  {notes.length === 0 ? (
                    <Alert variant="info">
                      You haven't uploaded any notes yet.
                    </Alert>
                  ) : (
                    <Table responsive striped bordered hover>
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>Subject</th>
                          <th>Batch</th>
                          <th>Uploaded</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {notes.map(note => (
                          <tr key={note._id}>
                            <td>{note.title}</td>
                            <td>{note.subject}</td>
                            <td>{note.targetBatches ? note.targetBatches.join(', ') : ''}</td>
                            <td>{new Date(note.createdAt).toLocaleDateString()}</td>
                            <td>
                              <Button
                                variant="outline-primary"
                                size="sm"
                                className="me-2"
                                onClick={() => handleDownload(note._id, `${note.title}.pdf`)}
                              >
                                Download
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleDelete(note._id)}
                              >
                                Delete
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}
      </Container>
    </>
  );
};

export default TeacherNotes;