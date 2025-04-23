import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { baseUrl } from '../../config';
import StudentNavbar from '../../components/StudentNavbar';
import Loader from '../../components/Loader';

const StudentHome = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [studentInfo, setStudentInfo] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Authentication token not found');
        }

        const response = await axios.get(`${baseUrl}/api/students/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        setStudentInfo(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching student data:', error);
        setError('Failed to load student information. Please try again later.');
        setLoading(false);
      }
    };

    if (user) {
      fetchStudentData();
    }
  }, [user]);

  if (loading) return <Loader />;

  if (error) {
    return (
      <>
        <StudentNavbar />
        <Container className="mt-4">
          <div className="alert alert-danger">{error}</div>
        </Container>
      </>
    );
  }

  return (
    <>
      <StudentNavbar />
      <Container className="mt-4">
        <h2 className="mb-4">Student Dashboard</h2>
        {studentInfo && (
          <Row>
            <Col md={6} className="mb-4">
              <Card>
                <Card.Header as="h5">Personal Information</Card.Header>
                <Card.Body>
                  <Card.Title>{studentInfo.name}</Card.Title>
                  <Card.Text>
                    <strong>Email:</strong> {studentInfo.email}<br />
                    <strong>Roll Number:</strong> {studentInfo.rollNumber}<br />
                    <strong>Batch:</strong> {studentInfo.batch}
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6} className="mb-4">
              <Card>
                <Card.Header as="h5">Academic Information</Card.Header>
                <Card.Body>
                  <Card.Text>
                    <strong>Attendance:</strong> {studentInfo.attendance || '0'}%<br />
                    <strong>Recent Test Score:</strong> {studentInfo.recentTestScore || 'No recent tests'}<br />
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}
      </Container>
    </>
  );
};

export default StudentHome; 