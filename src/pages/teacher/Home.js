import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Alert } from 'react-bootstrap';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { baseUrl } from '../../config';
import TeacherNavbar from '../../components/TeacherNavbar';
import Loader from '../../components/Loader';

const TeacherHome = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [teacherInfo, setTeacherInfo] = useState(null);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalBatches: 0,
    totalNotes: 0,
    totalTests: 0
  });
  const [error, setError] = useState('');
  
  // Debug state
  const [debug, setDebug] = useState({
    apiCalled: false,
    tokenFound: false,
    teacherFetched: false,
    statsFetched: false,
    authState: null
  });

  // Track page view
  useEffect(() => {
    const trackPageView = async () => {
      try {
        await axios.post(`${baseUrl}/api/analytics/track`, {
          event: 'page_view',
          page: 'teacher_home',
          timestamp: new Date().toISOString(),
          authState: user ? 'logged_in' : 'logged_out'
        });
      } catch (error) {
        console.error('Failed to track page view:', error);
      }
    };
    
    trackPageView();
  }, []);

  // Load teacher dashboard data
  useEffect(() => {
    const fetchTeacherData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }
        
        const response = await axios.get(`${baseUrl}/api/teachers/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setTeacherInfo(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching teacher data:', err);
        setError('Failed to load dashboard data. Please try again later.');
        setLoading(false);
      }
    };

    if (user) {
      fetchTeacherData();
    }
  }, [user]);

  useEffect(() => {
    const fetchTeacherData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        // Update debug information
        setDebug(prev => ({ 
          ...prev, 
          apiCalled: true, 
          tokenFound: !!token,
          authState: user ? 'logged_in' : 'logged_out'
        }));
        
        if (!token) {
          throw new Error('Authentication token not found');
        }

        console.log('Fetching teacher data with token:', token);

        // Fetch teacher information
        try {
          const teacherResponse = await axios.get(`${baseUrl}/api/teachers/me`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          console.log('Teacher data response:', teacherResponse.data);
          setTeacherInfo(teacherResponse.data);
          setDebug(prev => ({ ...prev, teacherFetched: true }));
        } catch (err) {
          console.error('Error fetching teacher info:', err);
          throw new Error(`Failed to fetch teacher information: ${err.message}`);
        }
        
        // Fetch statistics
        try {
          const statsResponse = await axios.get(`${baseUrl}/api/teachers/stats`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          console.log('Stats response:', statsResponse.data);
          setStats(statsResponse.data);
          setDebug(prev => ({ ...prev, statsFetched: true }));
        } catch (err) {
          console.error('Error fetching teacher stats:', err);
          // Don't throw error here, continue with partial data
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching teacher data:', err);
        setError(`Failed to load teacher information: ${err.message}`);
        setLoading(false);
      }
    };

    if (user) {
      fetchTeacherData();
    } else {
      setLoading(false);
      setError('You must be logged in to view the teacher dashboard');
      console.log('No current user found, not fetching teacher data');
    }
  }, [user]);

  return (
    <>
      <TeacherNavbar />
      <Container className="mt-4">
        <h2 className="mb-4">Teacher Dashboard</h2>
        
        {/* Debug info in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-3">
            <small>
              <strong>Debug Info:</strong> 
              API Called: {debug.apiCalled ? 'Yes' : 'No'} | 
              Token Found: {debug.tokenFound ? 'Yes' : 'No'} |
              Teacher Fetched: {debug.teacherFetched ? 'Yes' : 'No'} |
              Stats Fetched: {debug.statsFetched ? 'Yes' : 'No'} |
              Auth State: {debug.authState} |
              Base URL: {baseUrl}
            </small>
          </div>
        )}
        
        {error && <Alert variant="danger">{error}</Alert>}
        
        {loading ? (
          <div className="text-center">
            <Loader />
            <p>Loading teacher dashboard...</p>
          </div>
        ) : (
          teacherInfo ? (
            <>
              <Row className="mb-4">
                <Col md={6}>
                  <Card>
                    <Card.Header as="h5">Personal Information</Card.Header>
                    <Card.Body>
                      <Card.Title>{teacherInfo.name}</Card.Title>
                      <Card.Text>
                        <strong>Email:</strong> {teacherInfo.email}<br />
                        <strong>Subject:</strong> {teacherInfo.subject || 'Not specified'}<br />
                        <strong>ID:</strong> {teacherInfo.teacherId || 'Not assigned'}
                      </Card.Text>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6}>
                  <Card>
                    <Card.Header as="h5">Quick Links</Card.Header>
                    <Card.Body>
                      <ul className="list-unstyled">
                        <li className="mb-2">
                          <a href="/teacher/attendance" className="text-decoration-none">
                            Take Attendance
                          </a>
                        </li>
                        <li className="mb-2">
                          <a href="/teacher/notes" className="text-decoration-none">
                            Upload Study Notes
                          </a>
                        </li>
                        <li className="mb-2">
                          <a href="/teacher/test-scores" className="text-decoration-none">
                            Manage Test Scores
                          </a>
                        </li>
                      </ul>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
              
              <h4 className="mb-3">Statistics</h4>
              <Row>
                <Col md={3} sm={6} className="mb-4">
                  <Card className="text-center">
                    <Card.Body>
                      <h3>{stats.totalStudents}</h3>
                      <Card.Text>Total Students</Card.Text>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3} sm={6} className="mb-4">
                  <Card className="text-center">
                    <Card.Body>
                      <h3>{stats.totalBatches}</h3>
                      <Card.Text>Batches</Card.Text>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3} sm={6} className="mb-4">
                  <Card className="text-center">
                    <Card.Body>
                      <h3>{stats.totalNotes}</h3>
                      <Card.Text>Notes Uploaded</Card.Text>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3} sm={6} className="mb-4">
                  <Card className="text-center">
                    <Card.Body>
                      <h3>{stats.totalTests}</h3>
                      <Card.Text>Tests Created</Card.Text>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </>
          ) : (
            <Alert variant="warning">
              Teacher profile data not available. Please make sure you are logged in as a teacher.
            </Alert>
          )
        )}
      </Container>
    </>
  );
};

export default TeacherHome; 