import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Table, Alert, Card } from 'react-bootstrap';
import axios from 'axios';
import { baseUrl } from '../../config';
import TeacherNavbar from '../../components/TeacherNavbar';
import Loader from '../../components/Loader';

const Attendance = () => {
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [date, setDate] = useState(new Date().toISOString().substr(0, 10));
  const [students, setStudents] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch batches on component mount
  useEffect(() => {
    const fetchBatches = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        if (!token) {
          throw new Error('Authentication token not found');
        }

        const response = await axios.get(`${baseUrl}/api/batches`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        setBatches(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching batches:', err);
        setError('Failed to load batches. Please try again later.');
        setLoading(false);
      }
    };

    fetchBatches();
  }, []);

  // Fetch students when batch is selected
  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedBatch) return;
      
      try {
        setLoadingStudents(true);
        const token = localStorage.getItem('token');
        
        if (!token) {
          throw new Error('Authentication token not found');
        }

        const response = await axios.get(`${baseUrl}/api/students/batch/${selectedBatch}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        setStudents(response.data);
        
        // Initialize attendance data for all students (default: present)
        const initialAttendance = {};
        response.data.forEach(student => {
          initialAttendance[student._id] = true;
        });
        
        setAttendanceData(initialAttendance);
        setLoadingStudents(false);
      } catch (err) {
        console.error('Error fetching students:', err);
        setError('Failed to load students from the selected batch.');
        setLoadingStudents(false);
      }
    };

    fetchStudents();
  }, [selectedBatch]);

  const handleAttendanceChange = (studentId, isPresent) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: isPresent
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Reset messages
    setError('');
    setSuccess('');
    
    // Format attendance data for API
    const attendanceRecords = Object.keys(attendanceData).map(studentId => ({
      student: studentId,
      date,
      present: attendanceData[studentId]
    }));
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }

      await axios.post(
        `${baseUrl}/api/attendance`, 
        { 
          batch: selectedBatch,
          date,
          attendanceRecords
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      setSuccess('Attendance recorded successfully!');
      setLoading(false);
    } catch (err) {
      console.error('Error submitting attendance:', err);
      setError('Failed to submit attendance. Please try again.');
      setLoading(false);
    }
  };

  if (loading && !loadingStudents) return <Loader />;

  return (
    <>
      <TeacherNavbar />
      <Container className="mt-4">
        <h2 className="mb-4">Take Attendance</h2>
        
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}
        
        <Card className="mb-4">
          <Card.Body>
            <Form onSubmit={handleSubmit}>
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
                <Form.Label>Date</Form.Label>
                <Form.Control
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </Form.Group>
              
              {loadingStudents ? (
                <div className="text-center py-3">
                  <Loader />
                  <p>Loading students...</p>
                </div>
              ) : (
                selectedBatch && students.length > 0 ? (
                  <>
                    <h5 className="mt-4 mb-3">Student Attendance</h5>
                    <Table striped bordered hover>
                      <thead>
                        <tr>
                          <th>Roll Number</th>
                          <th>Student Name</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map(student => (
                          <tr key={student._id}>
                            <td>{student.rollNumber}</td>
                            <td>{student.name}</td>
                            <td>
                              <Form.Check
                                type="switch"
                                id={`attendance-${student._id}`}
                                label={attendanceData[student._id] ? "Present" : "Absent"}
                                checked={attendanceData[student._id] || false}
                                onChange={(e) => handleAttendanceChange(student._id, e.target.checked)}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                    
                    <Button variant="primary" type="submit" disabled={loading}>
                      {loading ? 'Submitting...' : 'Submit Attendance'}
                    </Button>
                  </>
                ) : (
                  selectedBatch && (
                    <Alert variant="info">
                      No students found in this batch.
                    </Alert>
                  )
                )
              )}
            </Form>
          </Card.Body>
        </Card>
      </Container>
    </>
  );
};

export default Attendance; 