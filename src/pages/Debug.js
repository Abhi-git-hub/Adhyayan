import React, { useState, useEffect } from 'react';
import { Container, Card, Button, Alert, Table, Row, Col } from 'react-bootstrap';
import axios from 'axios';
import jwt_decode from 'jwt-decode';
import { baseUrl } from '../config';
import { useAuth } from '../context/AuthContext';

const DebugPage = () => {
  const { user, loading: authLoading, error: authError } = useAuth();
  const [showToken, setShowToken] = useState(false);
  const [apiStatus, setApiStatus] = useState(null);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [testResults, setTestResults] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Get token and decoded info
  const token = localStorage.getItem('token');
  const studentData = localStorage.getItem('studentData');
  const teacherData = localStorage.getItem('teacherData');
  
  let decodedToken = null;
  try {
    if (token) {
      decodedToken = jwt_decode(token);
    }
  } catch (err) {
    console.error('Error decoding token:', err);
  }
  
  const clearStorage = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('studentData');
    localStorage.removeItem('teacherData');
    window.location.reload();
  };

  const setRoleOverride = (role) => {
    // Get current token
    const token = localStorage.getItem('token');
    if (!token) {
      alert('No token found. Please log in first.');
      return;
    }

    try {
      // Decode token
      const decoded = jwt_decode(token);
      
      // Override the role
      if (role === 'student') {
        console.log('Setting role override to student');
        localStorage.setItem('roleOverride', 'student');
      } else if (role === 'teacher') {
        console.log('Setting role override to teacher');
        localStorage.setItem('roleOverride', 'teacher');
      }
      
      // Reload to apply changes
      window.location.reload();
    } catch (err) {
      console.error('Error decoding token:', err);
      alert('Error setting role override: ' + err.message);
    }
  };

  const clearRoleOverride = () => {
    localStorage.removeItem('roleOverride');
    window.location.reload();
  };

  const checkServerStatus = async () => {
    setLoading(true);
    setError('');
    const results = [];
    
    try {
      // 1. Check if server is running
      const serverCheckStart = Date.now();
      let serverResponse;
      
      try {
        serverResponse = await axios.get(`${baseUrl}/api/auth/status`);
        results.push({
          test: 'Server Status',
          status: 'Success',
          time: `${Date.now() - serverCheckStart}ms`,
          details: `Server is running. Response: ${JSON.stringify(serverResponse.data)}`
        });
      } catch (err) {
        results.push({
          test: 'Server Status',
          status: 'Failed',
          time: `${Date.now() - serverCheckStart}ms`,
          details: `Server might be down: ${err.message}`
        });
        throw new Error('Server connection failed');
      }
      
      // 2. Check if auth is working
      if (token) {
        const authCheckStart = Date.now();
        try {
          const authResponse = await axios.get(`${baseUrl}/api/auth/user`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          results.push({
            test: 'Authentication',
            status: 'Success',
            time: `${Date.now() - authCheckStart}ms`,
            details: `Auth working. User: ${JSON.stringify(authResponse.data)}`
          });
          
          // 3. Check student/teacher-specific endpoints
          if (user && user.role === 'student') {
            await checkStudentEndpoints(results, token);
          } else if (user && user.role === 'teacher') {
            await checkTeacherEndpoints(results, token);
          }
          
        } catch (err) {
          results.push({
            test: 'Authentication',
            status: 'Failed',
            time: `${Date.now() - authCheckStart}ms`,
            details: `Auth failed: ${err.message}`
          });
        }
      } else {
        results.push({
          test: 'Authentication',
          status: 'Skipped',
          time: '0ms',
          details: 'No token found'
        });
      }
      
      setApiStatus('OK');
    } catch (err) {
      setApiStatus('ERROR');
      setError(err.message);
    } finally {
      setTestResults(results);
      setLoading(false);
    }
  };
  
  const checkStudentEndpoints = async (results, token) => {
    // Check profile
    const profileCheckStart = Date.now();
    try {
      const profileResponse = await axios.get(`${baseUrl}/api/students/profile`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      results.push({
        test: 'Student Profile',
        status: 'Success',
        time: `${Date.now() - profileCheckStart}ms`,
        details: `Profile loaded: ${profileResponse.data.name}`
      });
    } catch (err) {
      results.push({
        test: 'Student Profile',
        status: 'Failed',
        time: `${Date.now() - profileCheckStart}ms`,
        details: `Profile error: ${err.message}`
      });
    }
    
    // Check notes
    const notesCheckStart = Date.now();
    try {
      const notesResponse = await axios.get(`${baseUrl}/api/notes/student`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      results.push({
        test: 'Student Notes',
        status: 'Success',
        time: `${Date.now() - notesCheckStart}ms`,
        details: `Notes loaded: ${notesResponse.data.length} notes found`
      });
    } catch (err) {
      results.push({
        test: 'Student Notes',
        status: 'Failed',
        time: `${Date.now() - notesCheckStart}ms`,
        details: `Notes error: ${err.message}`
      });
    }
    
    // Check attendance
    const attendanceCheckStart = Date.now();
    try {
      const attendanceResponse = await axios.get(`${baseUrl}/api/attendance/student`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      results.push({
        test: 'Student Attendance',
        status: 'Success',
        time: `${Date.now() - attendanceCheckStart}ms`,
        details: `Attendance loaded: ${attendanceResponse.data.length} records found`
      });
    } catch (err) {
      results.push({
        test: 'Student Attendance',
        status: 'Failed',
        time: `${Date.now() - attendanceCheckStart}ms`,
        details: `Attendance error: ${err.message}`
      });
    }
  };
  
  const checkTeacherEndpoints = async (results, token) => {
    // Check profile
    const profileCheckStart = Date.now();
    try {
      const profileResponse = await axios.get(`${baseUrl}/api/teachers/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      results.push({
        test: 'Teacher Profile',
        status: 'Success',
        time: `${Date.now() - profileCheckStart}ms`,
        details: `Profile loaded: ${profileResponse.data.name}`
      });
    } catch (err) {
      results.push({
        test: 'Teacher Profile',
        status: 'Failed',
        time: `${Date.now() - profileCheckStart}ms`,
        details: `Profile error: ${err.message}`
      });
    }
    
    // Check notes
    const notesCheckStart = Date.now();
    try {
      const notesResponse = await axios.get(`${baseUrl}/api/notes/teacher`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      results.push({
        test: 'Teacher Notes',
        status: 'Success',
        time: `${Date.now() - notesCheckStart}ms`,
        details: `Notes loaded: ${notesResponse.data.length} notes found`
      });
    } catch (err) {
      results.push({
        test: 'Teacher Notes',
        status: 'Failed',
        time: `${Date.now() - notesCheckStart}ms`,
        details: `Notes error: ${err.message}`
      });
    }
    
    // Check batches
    const batchesCheckStart = Date.now();
    try {
      const batchesResponse = await axios.get(`${baseUrl}/api/batches`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      results.push({
        test: 'Batches',
        status: 'Success',
        time: `${Date.now() - batchesCheckStart}ms`,
        details: `Batches loaded: ${batchesResponse.data.length} batches found`
      });
    } catch (err) {
      results.push({
        test: 'Batches',
        status: 'Failed',
        time: `${Date.now() - batchesCheckStart}ms`,
        details: `Batches error: ${err.message}`
      });
    }
  };

  return (
    <Container className="mt-5">
      <h1>Debug Page</h1>
      <p className="text-muted">Use this page to diagnose API connectivity issues</p>
      
      <Row className="mb-4">
        <Col md={6}>
          <Card>
            <Card.Header as="h5">API Status</Card.Header>
            <Card.Body>
              <div className="mb-3">
                <strong>API Base URL:</strong> {baseUrl}
              </div>
              
              <div className="mb-3">
                <strong>Status:</strong>{' '}
                {apiStatus === 'OK' && <span className="text-success">Connected</span>}
                {apiStatus === 'ERROR' && <span className="text-danger">Error</span>}
                {apiStatus === null && <span className="text-secondary">Not checked</span>}
              </div>
              
              <Button 
                onClick={checkServerStatus} 
                disabled={loading}
                variant="primary"
              >
                {loading ? 'Checking...' : 'Check API Status'}
              </Button>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={6}>
          <Card>
            <Card.Header as="h5">Authentication Info</Card.Header>
            <Card.Body>
              {user ? (
                <div>
                  <p><strong>Logged in as:</strong> {user.name}</p>
                  <p><strong>Role:</strong> {user.role}</p>
                  <p><strong>Email:</strong> {user.email}</p>
                </div>
              ) : (
                <Alert variant="warning">Not logged in</Alert>
              )}
              
              <hr />
              
              <h6>Token Information</h6>
              {tokenInfo ? (
                tokenInfo.error ? (
                  <Alert variant="danger">{tokenInfo.error}</Alert>
                ) : (
                  <div>
                    <p><strong>Token:</strong> {tokenInfo.token}</p>
                    <p>
                      <strong>Expires:</strong> {tokenInfo.expires}{' '}
                      {tokenInfo.isExpired && <span className="text-danger">(EXPIRED)</span>}
                    </p>
                    <p><strong>User ID:</strong> {tokenInfo.user && tokenInfo.user.id}</p>
                    <p><strong>Role:</strong> {tokenInfo.user && tokenInfo.user.role}</p>
                  </div>
                )
              ) : (
                <p>Loading token info...</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      {testResults.length > 0 && (
        <Card className="mb-4">
          <Card.Header as="h5">API Test Results</Card.Header>
          <Card.Body>
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>Test</th>
                  <th>Status</th>
                  <th>Time</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {testResults.map((result, index) => (
                  <tr key={index}>
                    <td>{result.test}</td>
                    <td>
                      <span className={
                        result.status === 'Success' ? 'text-success' : 
                        result.status === 'Failed' ? 'text-danger' : 'text-warning'
                      }>
                        {result.status}
                      </span>
                    </td>
                    <td>{result.time}</td>
                    <td><small>{result.details}</small></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}
      
      <div className="mb-5">
        <h5>Common Issues</h5>
        <ul>
          <li><strong>Server not running:</strong> Make sure the server is started on port 5001</li>
          <li><strong>Expired token:</strong> If your token is expired, try logging out and back in</li>
          <li><strong>CORS issues:</strong> Ensure server has proper CORS headers enabled</li>
          <li><strong>Database connection:</strong> Check if MongoDB is running and accessible</li>
        </ul>
      </div>

      <Card className="mt-4">
        <Card.Header className="bg-primary text-white">
          <h2>Auth Debug Information</h2>
        </Card.Header>
        <Card.Body>
          <h3>Current Auth State</h3>
          <Table striped bordered hover>
            <tbody>
              <tr>
                <td><strong>Loading:</strong></td>
                <td>{authLoading ? 'True' : 'False'}</td>
              </tr>
              <tr>
                <td><strong>Error:</strong></td>
                <td>{authError || 'None'}</td>
              </tr>
              <tr>
                <td><strong>User:</strong></td>
                <td>
                  {user ? (
                    <pre>{JSON.stringify(user, null, 2)}</pre>
                  ) : (
                    'No user logged in'
                  )}
                </td>
              </tr>
              <tr>
                <td><strong>Role:</strong></td>
                <td>{user?.role || 'None'}</td>
              </tr>
            </tbody>
          </Table>
          
          <h3>Local Storage</h3>
          <Table striped bordered hover>
            <tbody>
              <tr>
                <td><strong>Token:</strong></td>
                <td>
                  {token ? (
                    <>
                      <span>{showToken ? token : '********'}</span>
                      <Button 
                        variant="link" 
                        size="sm"
                        onClick={() => setShowToken(!showToken)}
                      >
                        {showToken ? 'Hide' : 'Show'}
                      </Button>
                    </>
                  ) : (
                    'No token found'
                  )}
                </td>
              </tr>
              <tr>
                <td><strong>Decoded Token:</strong></td>
                <td>
                  {decodedToken ? (
                    <pre>{JSON.stringify(decodedToken, null, 2)}</pre>
                  ) : (
                    'No token or invalid token'
                  )}
                </td>
              </tr>
              <tr>
                <td><strong>Student Data:</strong></td>
                <td>
                  {studentData ? (
                    <pre>{JSON.stringify(JSON.parse(studentData), null, 2)}</pre>
                  ) : (
                    'No student data found'
                  )}
                </td>
              </tr>
              <tr>
                <td><strong>Teacher Data:</strong></td>
                <td>
                  {teacherData ? (
                    <pre>{JSON.stringify(JSON.parse(teacherData), null, 2)}</pre>
                  ) : (
                    'No teacher data found'
                  )}
                </td>
              </tr>
            </tbody>
          </Table>
          
          <Row className="mt-3">
            <Col>
              <Button variant="danger" onClick={clearStorage}>
                Clear Storage & Reset
              </Button>
              
              <div className="mt-4">
                <h4>Role Override</h4>
                <p>Use these buttons to override your role for testing purposes:</p>
                <Button variant="primary" onClick={() => setRoleOverride('student')} className="me-2">
                  Set as Student
                </Button>
                <Button variant="success" onClick={() => setRoleOverride('teacher')} className="me-2">
                  Set as Teacher
                </Button>
                <Button variant="secondary" onClick={clearRoleOverride}>
                  Clear Override
                </Button>
                
                <p className="mt-2">
                  Current override: <strong>{localStorage.getItem('roleOverride') || 'None'}</strong>
                </p>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default DebugPage; 