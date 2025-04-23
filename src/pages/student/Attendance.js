import React, { useEffect, useState } from 'react';
import { Container, Card, Table, Row, Col, Alert, Badge } from 'react-bootstrap';
import axios from 'axios';
import { baseUrl } from '../../config';
import StudentNavbar from '../../components/StudentNavbar';
import Loader from '../../components/Loader';
import { FaCalendarCheck, FaCheckCircle, FaExclamationTriangle, FaUserClock, FaCalendarAlt, FaUserGraduate } from 'react-icons/fa';

const StudentAttendance = () => {
  const [attendance, setAttendance] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Debug state
  const [debug, setDebug] = useState({
    apiCalled: false,
    tokenFound: false,
    attendanceFetched: false,
    summaryFetched: false
  });

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        // Update debug state
        setDebug(prev => ({ ...prev, apiCalled: true, tokenFound: !!token }));
        
        if (!token) {
          throw new Error('Authentication token not found');
        }

        console.log('Fetching attendance data with token:', token);
        
        // Fetch student ID first
        let studentId;
        try {
          const meResponse = await axios.get(`${baseUrl}/api/students/me`, {
            headers: {
              'x-auth-token': token
            }
          });
          
          studentId = meResponse.data._id;
          console.log('Student ID retrieved:', studentId);
        } catch (err) {
          console.error('Error fetching student profile:', err);
          throw new Error(`Failed to fetch student profile: ${err.message}`);
        }

        // Fetch attendance records
        try {
          const attendanceResponse = await axios.get(`${baseUrl}/api/attendance/student/${studentId}`, {
            headers: {
              'x-auth-token': token
            }
          });
          
          console.log('Attendance data response:', attendanceResponse.data);
          
          // Ensure we handle the response correctly whether it's an array or has an attendance property
          const attendanceData = Array.isArray(attendanceResponse.data) 
            ? attendanceResponse.data 
            : (attendanceResponse.data.attendance || []);
          
          setAttendance(attendanceData);
          setDebug(prev => ({ ...prev, attendanceFetched: true }));
          
          // Calculate summary if not provided by API
          if (!attendanceResponse.data.summary) {
            const present = attendanceData.filter(record => 
              record.status === 'present').length;
            const total = attendanceData.length;
            const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
            
            setSummary({
              present,
              total,
              percentage
            });
          } else {
            setSummary(attendanceResponse.data.summary);
          }
          
          setDebug(prev => ({ ...prev, summaryFetched: true }));
        } catch (err) {
          console.error('Error fetching attendance:', err);
          throw new Error(`Failed to fetch attendance records: ${err.message}`);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading attendance data:', err);
        setError(`Failed to load attendance data: ${err.message}`);
        setLoading(false);
      }
    };

    fetchAttendance();
  }, []);

  // Function to format date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getStatusBadge = (status) => {
    if (!status) return <Badge bg="secondary">Unknown</Badge>;
    
    switch(status.toLowerCase()) {
      case 'present':
        return <Badge bg="success"><FaCheckCircle className="me-1" />Present</Badge>;
      case 'absent':
        return <Badge bg="danger"><FaExclamationTriangle className="me-1" />Absent</Badge>;
      case 'late':
        return <Badge bg="warning"><FaUserClock className="me-1" />Late</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  return (
    <>
      <StudentNavbar />
      <Container className="mt-4">
        <h2 className="mb-4"><FaCalendarCheck className="me-2" />My Attendance</h2>
        
        {/* Debug info in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-3">
            <small>
              <strong>Debug Info:</strong> 
              API Called: {debug.apiCalled ? 'Yes' : 'No'} | 
              Token Found: {debug.tokenFound ? 'Yes' : 'No'} |
              Attendance Fetched: {debug.attendanceFetched ? 'Yes' : 'No'} |
              Summary Fetched: {debug.summaryFetched ? 'Yes' : 'No'} |
              Base URL: {baseUrl}
            </small>
          </div>
        )}
        
        {error && <Alert variant="danger">{error}</Alert>}
        
        {loading ? (
          <div className="text-center">
            <Loader />
            <p>Loading attendance data...</p>
          </div>
        ) : (
          <>
            {/* Attendance Summary */}
            <Row className="mb-4">
              <Col md={6}>
                <Card className="h-100 shadow-sm">
                  <Card.Header as="h5" className="bg-primary text-white">
                    <FaCalendarCheck className="me-2" />Attendance Summary
                  </Card.Header>
                  <Card.Body>
                    {summary ? (
                      <div>
                        <h3 className="mb-3">{summary.percentage}%</h3>
                        <p>
                          <strong>Present:</strong> {summary.present} days<br />
                          <strong>Total Classes:</strong> {summary.total} days
                        </p>
                        <div className="progress">
                          <div 
                            className="progress-bar" 
                            role="progressbar" 
                            style={{ 
                              width: `${summary.percentage}%`,
                              backgroundColor: summary.percentage >= 75 ? '#28a745' : 
                                             summary.percentage >= 60 ? '#ffc107' : '#dc3545'
                            }}
                            aria-valuenow={summary.percentage} 
                            aria-valuemin="0" 
                            aria-valuemax="100"
                          >
                            {summary.percentage}%
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p>No attendance summary available.</p>
                    )}
                  </Card.Body>
                </Card>
              </Col>
              
              <Col md={6}>
                <Card className="h-100 shadow-sm">
                  <Card.Header as="h5" className="bg-primary text-white">
                    <FaUserGraduate className="me-2" />Attendance Status
                  </Card.Header>
                  <Card.Body>
                    {summary ? (
                      <div>
                        {Number(summary.percentage) >= 75 ? (
                          <Alert variant="success">
                            <FaCheckCircle className="me-1" />
                            <strong>Good Standing!</strong> Your attendance is above the required minimum.
                          </Alert>
                        ) : Number(summary.percentage) >= 60 ? (
                          <Alert variant="warning">
                            <FaExclamationTriangle className="me-1" />
                            <strong>Warning!</strong> Your attendance is below 75%. Please improve your attendance.
                          </Alert>
                        ) : (
                          <Alert variant="danger">
                            <FaExclamationTriangle className="me-1" />
                            <strong>Critical!</strong> Your attendance is severely low. Please contact your advisor.
                          </Alert>
                        )}
                      </div>
                    ) : (
                      <Alert variant="info">
                        No attendance data available to evaluate your status.
                      </Alert>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
            
            {/* Attendance Records */}
            <Card className="shadow-sm">
              <Card.Header as="h5" className="bg-primary text-white">
                <FaCalendarAlt className="me-2" />Attendance Records
              </Card.Header>
              <Card.Body>
                {attendance.length === 0 ? (
                  <Alert variant="info">No attendance records found.</Alert>
                ) : (
                  <Table striped bordered hover responsive>
                    <thead className="table-primary">
                      <tr>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Subject</th>
                        <th>Marked By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendance.map((record, index) => (
                        <tr key={record._id || index}>
                          <td><FaCalendarAlt className="me-1" />{formatDate(record.date)}</td>
                          <td>{getStatusBadge(record.status)}</td>
                          <td>{record.subject || 'General'}</td>
                          <td>{record.markedBy && record.markedBy.name ? record.markedBy.name : 'Teacher'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          </>
        )}
      </Container>
    </>
  );
};

export default StudentAttendance; 