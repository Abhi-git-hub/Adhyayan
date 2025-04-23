import React, { useState, useEffect } from 'react';
import { Container, Card, Row, Col, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaEdit, FaCheckCircle, FaExclamationCircle, FaGraduationCap, FaIdCard, FaCalendarAlt, FaClock } from 'react-icons/fa';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { baseUrl } from '../../config';
import './Profile.css';

const StudentProfile = () => {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Debug state
  const [debug, setDebug] = useState({
    apiCalled: false,
    tokenFound: false,
    authState: null
  });
  
  // Form state
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfileData = async () => {
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

        console.log('Fetching student profile with token:', token);

        const response = await axios.get(`${baseUrl}/api/students/profile`, {
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
      setSaving(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      console.log('Updating profile with data:', { email, phone, address });
      
      const response = await axios.put(
        `${baseUrl}/api/students/profile`,
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
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setSuccess('');
      }, 5000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(`Failed to update profile: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (loading) {
    return (
      <div className="profile-loading-container">
        <Spinner animation="border" variant="primary" />
        <p>Loading your profile information...</p>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <Container fluid>
        {error && (
          <Alert 
            variant="danger" 
            dismissible 
            onClose={() => setError('')}
            className="profile-alert"
          >
            <FaExclamationCircle className="me-2" />
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert 
            variant="success" 
            dismissible 
            onClose={() => setSuccess('')}
            className="profile-alert"
          >
            <FaCheckCircle className="me-2" />
            {success}
          </Alert>
        )}
        
        {profileData ? (
          <div className="profile-content">
            <div className="profile-header">
              <h2>
                <FaUser className="header-icon" />
                Student Profile
              </h2>
              <p>View and manage your personal information</p>
            </div>
            
          <Row>
              <Col lg={4} md={5}>
                <Card className="profile-card mb-4">
                <Card.Body className="text-center">
                    <div className="profile-image-container mb-4">
                      {profileData.profilePicture ? (
                    <img
                          src={profileData.profilePicture}
                      alt="Profile"
                          className="profile-image"
                        />
                      ) : (
                        <div className="profile-image-placeholder">
                          <FaUser />
                        </div>
                      )}
                    </div>
                    
                    <h3 className="profile-name">{profileData.name}</h3>
                    
                    <div className="profile-badge">
                      <FaGraduationCap className="badge-icon" />
                      <span>{profileData.batch ? profileData.batch.name : 'Student'}</span>
                    </div>
                    
                    <div className="profile-info-item">
                      <FaIdCard className="info-icon" />
                      <span>Roll No: {profileData.rollNumber || 'N/A'}</span>
                    </div>
                    
                    <div className="profile-info-item">
                      <FaCalendarAlt className="info-icon" />
                      <span>Joined: {formatDate(profileData.createdAt)}</span>
                    </div>
                    
                    <div className="profile-info-item">
                      <FaClock className="info-icon" />
                      <span>Last Updated: {formatDate(profileData.updatedAt)}</span>
                    </div>
                  </Card.Body>
                </Card>
                
                <Card className="profile-card">
                  <Card.Header className="card-header">
                    <h5>Account Status</h5>
                  </Card.Header>
                  <Card.Body>
                    <div className="status-item">
                      <div className="status-label">Account Type</div>
                      <div className="status-value">Student</div>
                    </div>
                    
                    <div className="status-item">
                      <div className="status-label">Status</div>
                      <div className="status-value">
                        <span className="status-active">
                          <FaCheckCircle className="me-1" /> Active
                        </span>
                      </div>
                    </div>
                    
                    <div className="status-item">
                      <div className="status-label">Member Since</div>
                      <div className="status-value">{formatDate(profileData.createdAt)}</div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            
              <Col lg={8} md={7}>
                <Card className="profile-card mb-4">
                  <Card.Header className="card-header d-flex justify-content-between align-items-center">
                    <h5>
                      <FaUser className="me-2" />
                      Personal Information
                    </h5>
                  <Button 
                      variant={editing ? "outline-secondary" : "outline-primary"} 
                    size="sm"
                    onClick={() => setEditing(!editing)}
                      className="edit-button"
                    >
                      {editing ? (
                        <>Cancel</>
                      ) : (
                        <><FaEdit className="me-1" /> Edit Profile</>
                      )}
                  </Button>
                </Card.Header>
                  
                <Card.Body>
                  {!editing ? (
                      <div className="personal-info">
                        <Row>
                          <Col md={6}>
                            <div className="info-group">
                              <label>Full Name</label>
                              <div className="info-value">{profileData.name}</div>
                            </div>
                          </Col>
                          
                          <Col md={6}>
                            <div className="info-group">
                              <label>Student ID</label>
                              <div className="info-value">{profileData._id || 'N/A'}</div>
                            </div>
                          </Col>
                        </Row>
                        
                        <div className="info-group">
                          <label><FaEnvelope className="me-2" />Email Address</label>
                          <div className="info-value">{profileData.email || 'Not provided'}</div>
                        </div>
                        
                        <div className="info-group">
                          <label><FaPhone className="me-2" />Phone Number</label>
                          <div className="info-value">{profileData.phone || 'Not provided'}</div>
                        </div>
                        
                        <div className="info-group">
                          <label><FaMapMarkerAlt className="me-2" />Address</label>
                          <div className="info-value address-value">{profileData.address || 'Not provided'}</div>
                        </div>
                    </div>
                  ) : (
                      <Form onSubmit={handleSubmit} className="edit-form">
                      <Form.Group className="mb-3">
                          <Form.Label>Email Address</Form.Label>
                        <Form.Control
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                            className="form-input"
                        />
                          <Form.Text className="text-muted">
                            We'll never share your email with anyone else.
                          </Form.Text>
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                          <Form.Label>Phone Number</Form.Label>
                        <Form.Control
                          type="text"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                            className="form-input"
                        />
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>Address</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                            className="form-input"
                        />
                      </Form.Group>
                      
                        <div className="form-buttons">
                          <Button 
                            variant="secondary" 
                            onClick={() => setEditing(false)}
                            className="me-2"
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit" 
                            variant="primary"
                            disabled={saving}
                          >
                            {saving ? (
                              <>
                                <Spinner as="span" animation="border" size="sm" className="me-2" />
                                Saving...
                              </>
                            ) : (
                              <>Save Changes</>
                            )}
                      </Button>
                        </div>
                    </Form>
                  )}
                </Card.Body>
              </Card>
                
                <Card className="profile-card">
                  <Card.Header className="card-header">
                    <h5>
                      <FaGraduationCap className="me-2" />
                      Academic Information
                    </h5>
                  </Card.Header>
                  <Card.Body>
                    <Row>
                      <Col md={6}>
                        <div className="info-group">
                          <label>Batch</label>
                          <div className="info-value">{profileData.batch ? profileData.batch.name : 'Not assigned'}</div>
                        </div>
                      </Col>
                      
                      <Col md={6}>
                        <div className="info-group">
                          <label>Roll Number</label>
                          <div className="info-value">{profileData.rollNumber || 'Not assigned'}</div>
                        </div>
                      </Col>
                    </Row>
                    
                    <div className="info-group">
                      <label>Courses</label>
                      <div className="info-value">
                        {profileData.courses && profileData.courses.length > 0 ? (
                          <ul className="courses-list">
                            {profileData.courses.map((course, index) => (
                              <li key={index}>{course}</li>
                            ))}
                          </ul>
                        ) : (
                          'No courses assigned'
                        )}
                      </div>
                    </div>
                  </Card.Body>
                </Card>
            </Col>
          </Row>
          </div>
        ) : (
          <div className="profile-not-found">
            <div className="not-found-icon">
              <FaUser />
            </div>
            <h3>Profile Not Found</h3>
            <p>
              We couldn't find your profile information. Please make sure you are logged in as a student.
            </p>
          </div>
      )}
    </Container>
    </div>
  );
};

export default StudentProfile; 