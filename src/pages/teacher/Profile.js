import React, { useState, useEffect } from 'react';
import { Container, Card, Row, Col, Form, Button, Alert } from 'react-bootstrap';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { baseUrl } from '../../config';

const TeacherProfile = () => {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form state
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        if (!token) {
          throw new Error('Authentication token not found');
        }

        console.log('Fetching teacher profile with token:', token);

        const response = await axios.get(`${baseUrl}/api/teachers/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        console.log('Profile data response:', response.data);
        setProfileData(response.data);
        // Initialize form fields
        setEmail(response.data.email || '');
        setPhone(response.data.phone || '');
        setAddress(response.data.address || '');
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching profile data:', err);
        setError(`Failed to load profile information: ${err.message}`);
        setLoading(false);
      }
    };

    if (user) {
      fetchProfileData();
    } else {
      setLoading(false);
      setError('You must be logged in to view your profile');
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      console.log('Updating profile with data:', { email, phone, address });
      
      const response = await axios.put(
        `${baseUrl}/api/teachers/profile`,
        { email, phone, address },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      console.log('Profile update response:', response.data);
      setProfileData(response.data);
      setSuccess('Profile updated successfully!');
      setEditing(false);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(`Failed to update profile: ${err.message}`);
    }
  };

  return (
    <Container className="mt-4">
      <h2 className="mb-4">Teacher Profile</h2>
      
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}
      
      {loading ? (
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p>Loading profile data...</p>
        </div>
      ) : (
        profileData ? (
          <Row>
            <Col md={4}>
              <Card className="mb-4">
                <Card.Body className="text-center">
                  <div className="mb-3">
                    <img
                      src={profileData.profilePicture || 'https://via.placeholder.com/150'}
                      alt="Profile"
                      className="rounded-circle img-fluid"
                      style={{ width: '150px', height: '150px', objectFit: 'cover' }}
                    />
                  </div>
                  <Card.Title>{profileData.name}</Card.Title>
                  <Card.Subtitle className="mb-2 text-muted">
                    Teacher ID: {profileData.teacherId || 'Not assigned'}
                  </Card.Subtitle>
                  <Card.Text>
                    Subject: {profileData.subject || 'Not specified'}<br />
                    Joined: {new Date(profileData.createdAt).toLocaleDateString()}
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={8}>
              <Card>
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Personal Information</h5>
                  <Button 
                    variant={editing ? "secondary" : "primary"} 
                    size="sm"
                    onClick={() => setEditing(!editing)}
                  >
                    {editing ? "Cancel" : "Edit Profile"}
                  </Button>
                </Card.Header>
                <Card.Body>
                  {!editing ? (
                    <div>
                      <p><strong>Email:</strong> {profileData.email}</p>
                      <p><strong>Phone:</strong> {profileData.phone || 'Not provided'}</p>
                      <p><strong>Address:</strong> {profileData.address || 'Not provided'}</p>
                    </div>
                  ) : (
                    <Form onSubmit={handleSubmit}>
                      <Form.Group className="mb-3">
                        <Form.Label>Email</Form.Label>
                        <Form.Control
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>Phone</Form.Label>
                        <Form.Control
                          type="text"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                        />
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>Address</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                        />
                      </Form.Group>
                      
                      <Button type="submit" variant="success">
                        Save Changes
                      </Button>
                    </Form>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        ) : (
          <Alert variant="warning">
            Profile data not available. Please make sure you are logged in as a teacher.
          </Alert>
        )
      )}
    </Container>
  );
};

export default TeacherProfile; 