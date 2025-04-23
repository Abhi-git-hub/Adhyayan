import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { FaUser, FaEnvelope, FaPhone, FaIdCard, FaCalendarAlt, FaBook, FaUserGraduate, FaMapMarkerAlt, FaBuilding, FaUserFriends, FaBirthdayCake, FaClock, FaGraduationCap } from 'react-icons/fa';
import './Profile.css';

const Profile = () => {
  const { user, getAuthHeader } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [formData, setFormData] = useState({
    phone: '',
    address: '',
    emergencyContact: {
      name: '',
      relation: '',
      phone: ''
    }
  });
  
  // Fetch profile function with better error handling and logging
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('Fetching profile for user ID:', user?.id);
        
        // Use the correct endpoint with auth headers
        const response = await axios.get('/api/auth/student', {
          headers: getAuthHeader()
        });
        
        console.log('Profile response:', response.data);
        
        if (!response.data) {
          throw new Error('No profile data returned from server');
        }
        
        setProfile(response.data);
        
        // Initialize form data with all available fields
        setFormData({
          phone: response.data.phoneNumber || '',
          address: response.data.address || '',
          emergencyContact: {
            name: response.data.emergencyContact?.name || '',
            relation: response.data.emergencyContact?.relation || '',
            phone: response.data.emergencyContact?.phone || ''
          }
        });
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching profile:', err);
        // Provide more specific error message based on the error type
        const errorMessage = err.response ? 
          `Server error: ${err.response.status} - ${err.response.data.message || 'Unknown error'}` : 
          `Network error: ${err.message}`;
        
        setError(`Failed to load profile data. ${errorMessage}`);
        setLoading(false);
        
        // Fallback to mock data in development environment for testing UI
        if (process.env.NODE_ENV === 'development') {
          const mockProfile = createMockProfile();
          setProfile(mockProfile);
          setFormData({
            phone: mockProfile.phoneNumber || '',
            address: mockProfile.address || '',
            emergencyContact: {
              name: mockProfile.emergencyContact?.name || '',
              relation: mockProfile.emergencyContact?.relation || '',
              phone: mockProfile.emergencyContact?.phone || ''
            }
          });
          setLoading(false);
          setError('Using mock data for development');
        }
      }
    };

    if (user && user.id) {
      fetchProfile();
    } else {
      setError('User not authenticated. Please log in to view your profile.');
      setLoading(false);
    }
  }, [user, getAuthHeader]);

  // Create mock profile for development/fallback
  const createMockProfile = () => {
    return {
      _id: 'mock123',
      name: 'Demo Student',
      username: 'demo.student',
      email: 'demo.student@adhyayan.edu',
      phoneNumber: '9876543210',
      batch: 'Udbhav',
      rollNumber: 'ADH2023001',
      guardianName: 'Parent Name',
      address: '123 Education Street, Knowledge City',
      dateOfBirth: new Date('2005-05-15'),
      dateOfAdmission: new Date('2023-04-10'),
      subjects: ['Mathematics', 'Science', 'English', 'Social Studies'],
      attendance: {
        present: 42,
        total: 45,
        percentage: 93.33
      },
      testScores: [
        { subject: 'Mathematics', score: 92, maxScore: 100 },
        { subject: 'Science', score: 88, maxScore: 100 },
        { subject: 'English', score: 95, maxScore: 100 }
      ],
      emergencyContact: {
        name: 'Parent Name',
        relation: 'Father',
        phone: '9876543211'
      },
      createdAt: new Date('2023-04-10')
    };
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent],
          [child]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      console.log('Updating profile with data:', formData);
      
      const response = await axios.put('/api/auth/student/update', formData, {
        headers: getAuthHeader()
      });
      
      console.log('Profile update response:', response.data);
      
      // Update the profile state with the new data
      setProfile({
        ...profile,
        phoneNumber: formData.phone,
        address: formData.address,
        emergencyContact: formData.emergencyContact
      });
      
      setIsEditing(false);
      setLoading(false);
      
      // Show success message
      const successEl = document.createElement('div');
      successEl.className = 'profile-success';
      successEl.textContent = 'Profile updated successfully!';
      document.querySelector('.profile-container').prepend(successEl);
      
      // Remove success message after 3 seconds
      setTimeout(() => {
        if (successEl.parentNode) {
          successEl.parentNode.removeChild(successEl);
        }
      }, 3000);
      
    } catch (err) {
      console.error('Error updating profile:', err);
      const errorMessage = err.response ? 
        `Server error: ${err.response.status} - ${err.response.data.message || 'Unknown error'}` : 
        `Network error: ${err.message}`;
      
      setError(`Failed to update profile. ${errorMessage}`);
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  const calculateAge = (birthDate) => {
    if (!birthDate) return 'N/A';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return `${age} years`;
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="loading-spinner"></div>
        <p>Loading your profile data...</p>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="profile-error">
        <FaUser className="error-icon" />
        <h3>Error Loading Profile</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()} className="retry-button">
          Try Again
        </button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-not-found">
        <FaUser className="not-found-icon" />
        <h3>Profile Not Found</h3>
        <p>We couldn't find your profile information.</p>
        <button onClick={() => window.location.reload()} className="retry-button">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="profile-container">
      {error && (
        <div className="profile-error-banner">
          <p>{error}</p>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}
      
      <div className="profile-header">
        <h2>Student Profile</h2>
        <p>View and manage your personal information</p>
      </div>

      <div className="profile-content">
        <div className="profile-card">
          <div className="profile-sidebar">
            <div className="profile-avatar">
              {profile.avatar ? (
                <img src={profile.avatar} alt={`${profile.name}'s avatar`} />
              ) : (
                <div className="default-avatar">
                  <FaUserGraduate />
                </div>
              )}
              <h3>{profile.name}</h3>
              <p className="student-batch">{profile.batch || 'Batch not assigned'}</p>
              <div className="student-id">
                <FaIdCard className="id-icon" />
                <span>{profile.rollNumber || profile.studentId || 'ID not assigned'}</span>
              </div>
            </div>
            
            <div className="profile-tabs">
              <button 
                className={activeTab === 'personal' ? 'active' : ''} 
                onClick={() => setActiveTab('personal')}
              >
                <FaUser className="tab-icon" />
                <span>Personal</span>
              </button>
              <button 
                className={activeTab === 'academic' ? 'active' : ''} 
                onClick={() => setActiveTab('academic')}
              >
                <FaGraduationCap className="tab-icon" />
                <span>Academic</span>
              </button>
              <button 
                className={activeTab === 'contact' ? 'active' : ''} 
                onClick={() => setActiveTab('contact')}
              >
                <FaPhone className="tab-icon" />
                <span>Contact</span>
              </button>
            </div>
            
            {!isEditing && (
              <button 
                className="edit-profile-btn"
                onClick={() => setIsEditing(true)}
              >
                Edit Profile
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="profile-edit-form">
              <h3>Edit Profile Information</h3>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="phone">Phone Number</label>
                  <div className="input-with-icon">
                    <FaPhone className="input-icon" />
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="Enter your phone number"
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="address">Address</label>
                  <div className="input-with-icon textarea">
                    <FaMapMarkerAlt className="input-icon" />
                    <textarea
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Enter your address"
                      rows="3"
                    ></textarea>
                  </div>
                </div>
                
                <h4>Emergency Contact</h4>
                
                <div className="form-group">
                  <label htmlFor="emergencyContact.name">Contact Name</label>
                  <div className="input-with-icon">
                    <FaUserFriends className="input-icon" />
                    <input
                      type="text"
                      id="emergencyContact.name"
                      name="emergencyContact.name"
                      value={formData.emergencyContact.name}
                      onChange={handleInputChange}
                      placeholder="Enter emergency contact name"
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="emergencyContact.phone">Contact Phone</label>
                  <div className="input-with-icon">
                    <FaPhone className="input-icon" />
                    <input
                      type="tel"
                      id="emergencyContact.phone"
                      name="emergencyContact.phone"
                      value={formData.emergencyContact.phone}
                      onChange={handleInputChange}
                      placeholder="Enter emergency contact phone"
                    />
                  </div>
                </div>
                
                <div className="form-actions">
                  <button type="submit" className="save-btn">Save Changes</button>
                  <button 
                    type="button" 
                    className="cancel-btn"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="profile-details">
              {activeTab === 'personal' && (
                <div className="details-section">
                  <h3>Personal Information</h3>
                  
                  <div className="detail-grid">
                    <div className="detail-item">
                      <div className="detail-icon">
                        <FaUser />
                      </div>
                      <div className="detail-content">
                        <div className="detail-label">Full Name</div>
                        <div className="detail-value">{profile.name || 'Not provided'}</div>
                      </div>
                    </div>
                    
                    <div className="detail-item">
                      <div className="detail-icon">
                        <FaIdCard />
                      </div>
                      <div className="detail-content">
                        <div className="detail-label">Roll Number</div>
                        <div className="detail-value">{profile.rollNumber || profile.studentId || 'Not assigned'}</div>
                      </div>
                    </div>
                    
                    <div className="detail-item">
                      <div className="detail-icon">
                        <FaBirthdayCake />
                      </div>
                      <div className="detail-content">
                        <div className="detail-label">Date of Birth</div>
                        <div className="detail-value">{formatDate(profile.dateOfBirth)}</div>
                      </div>
                    </div>
                    
                    <div className="detail-item">
                      <div className="detail-icon">
                        <FaCalendarAlt />
                      </div>
                      <div className="detail-content">
                        <div className="detail-label">Age</div>
                        <div className="detail-value">{calculateAge(profile.dateOfBirth)}</div>
                      </div>
                    </div>
                    
                    <div className="detail-item">
                      <div className="detail-icon">
                        <FaCalendarAlt />
                      </div>
                      <div className="detail-content">
                        <div className="detail-label">Date of Admission</div>
                        <div className="detail-value">{formatDate(profile.dateOfAdmission || profile.createdAt)}</div>
                      </div>
                    </div>
                    
                    <div className="detail-item">
                      <div className="detail-icon">
                        <FaClock />
                      </div>
                      <div className="detail-content">
                        <div className="detail-label">Account Created</div>
                        <div className="detail-value">{formatDate(profile.createdAt)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {activeTab === 'academic' && (
                <div className="details-section">
                  <h3>Academic Information</h3>
                  
                  <div className="detail-grid">
                    <div className="detail-item">
                      <div className="detail-icon">
                        <FaUserGraduate />
                      </div>
                      <div className="detail-content">
                        <div className="detail-label">Batch</div>
                        <div className="detail-value">{profile.batch || 'Not assigned'}</div>
                      </div>
                    </div>
                    
                    <div className="detail-item">
                      <div className="detail-icon">
                        <FaBook />
                      </div>
                      <div className="detail-content">
                        <div className="detail-label">Subjects</div>
                        <div className="detail-value">
                          {profile.subjects && profile.subjects.length > 0 
                            ? profile.subjects.join(', ') 
                            : profile.batch === 'Udbhav' 
                              ? 'Science, Maths, English' 
                              : profile.batch === 'Maadhyam' 
                                ? 'Science, Maths, Social Studies' 
                                : profile.batch === 'Vedant' 
                                  ? 'Physics, Chemistry, Maths' 
                                  : 'Not available'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="detail-item full-width">
                      <div className="detail-icon">
                        <FaCalendarAlt />
                      </div>
                      <div className="detail-content">
                        <div className="detail-label">Attendance</div>
                        <div className="detail-value attendance-bar">
                          <div className="attendance-label">
                            {profile.attendance?.percentage 
                              ? `${profile.attendance.percentage.toFixed(1)}% (${profile.attendance.present}/${profile.attendance.total})` 
                              : 'No attendance data available'}
                          </div>
                          {profile.attendance?.percentage && (
                            <div className="attendance-progress">
                              <div 
                                className="attendance-progress-bar" 
                                style={{
                                  width: `${profile.attendance.percentage}%`,
                                  backgroundColor: profile.attendance.percentage >= 75 
                                    ? '#4caf50' 
                                    : profile.attendance.percentage >= 60 
                                      ? '#ff9800' 
                                      : '#f44336'
                                }}
                              ></div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {profile.testScores && profile.testScores.length > 0 && (
                      <div className="detail-item full-width">
                        <div className="detail-icon">
                          <FaBook />
                        </div>
                        <div className="detail-content">
                          <div className="detail-label">Recent Test Scores</div>
                          <div className="detail-value">
                            <table className="scores-table">
                              <thead>
                                <tr>
                                  <th>Subject</th>
                                  <th>Score</th>
                                  <th>Percentage</th>
                                </tr>
                              </thead>
                              <tbody>
                                {profile.testScores.map((test, index) => (
                                  <tr key={index}>
                                    <td>{test.subject}</td>
                                    <td>{test.score}/{test.maxScore}</td>
                                    <td className={
                                      (test.score / test.maxScore) * 100 >= 90 ? 'excellent' :
                                      (test.score / test.maxScore) * 100 >= 75 ? 'good' :
                                      (test.score / test.maxScore) * 100 >= 60 ? 'average' : 'poor'
                                    }>
                                      {((test.score / test.maxScore) * 100).toFixed(1)}%
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {activeTab === 'contact' && (
                <div className="details-section">
                  <h3>Contact Information</h3>
                  
                  <div className="detail-grid">
                    <div className="detail-item">
                      <div className="detail-icon">
                        <FaEnvelope />
                      </div>
                      <div className="detail-content">
                        <div className="detail-label">Email</div>
                        <div className="detail-value">{profile.email || 'Not provided'}</div>
                      </div>
                    </div>
                    
                    <div className="detail-item">
                      <div className="detail-icon">
                        <FaPhone />
                      </div>
                      <div className="detail-content">
                        <div className="detail-label">Phone Number</div>
                        <div className="detail-value">{profile.phoneNumber || 'Not provided'}</div>
                      </div>
                    </div>
                    
                    <div className="detail-item full-width">
                      <div className="detail-icon">
                        <FaMapMarkerAlt />
                      </div>
                      <div className="detail-content">
                        <div className="detail-label">Address</div>
                        <div className="detail-value">{profile.address || 'Not provided'}</div>
                      </div>
                    </div>
                    
                    <div className="detail-item">
                      <div className="detail-icon">
                        <FaUserFriends />
                      </div>
                      <div className="detail-content">
                        <div className="detail-label">Guardian Name</div>
                        <div className="detail-value">{profile.guardianName || 'Not provided'}</div>
                      </div>
                    </div>
                    
                    <div className="detail-item full-width">
                      <div className="detail-icon">
                        <FaPhone />
                      </div>
                      <div className="detail-content">
                        <div className="detail-label">Emergency Contact</div>
                        <div className="detail-value">
                          {profile.emergencyContact ? (
                            <div className="emergency-contact">
                              <p><strong>Name:</strong> {profile.emergencyContact.name || 'Not provided'}</p>
                              <p><strong>Relation:</strong> {profile.emergencyContact.relation || 'Not provided'}</p>
                              <p><strong>Phone:</strong> {profile.emergencyContact.phone || 'Not provided'}</p>
                            </div>
                          ) : (
                            'No emergency contact provided'
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile; 