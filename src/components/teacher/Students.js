import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';
import { FaSearch, FaFilter, FaUserGraduate, FaCalendarAlt, FaClipboardList, FaCheckCircle, FaTimesCircle, FaExclamationCircle } from 'react-icons/fa';
import './Students.css';

const Students = () => {
  const { user, getAuthHeader } = useContext(AuthContext);
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceStatus, setAttendanceStatus] = useState('present');
  const [testData, setTestData] = useState({
    testName: '',
    subject: '',
    maxScore: 100,
    date: new Date().toISOString().split('T')[0],
    scores: {}
  });
  const [activeTab, setActiveTab] = useState('info');
  const [studentDetails, setStudentDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch students in teacher's batches
        const response = await axios.get('/api/students/by-batches', {
          params: { batches: user.batches.join(',') },
          headers: getAuthHeader()
        });
        
        setStudents(response.data);
        setFilteredStudents(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching students:', error);
        setError('Failed to load students. Please try again later.');
        setLoading(false);
      }
    };
    
    if (user && user.batches) {
      fetchStudents();
    }
  }, [user, getAuthHeader]);
  
  useEffect(() => {
    // Filter students based on search term and selected batch
    let filtered = students;
    
    if (searchTerm) {
      filtered = filtered.filter(student => 
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.class.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedBatch !== 'all') {
      filtered = filtered.filter(student => student.batch === selectedBatch);
    }
    
    setFilteredStudents(filtered);
  }, [searchTerm, selectedBatch, students]);
  
  const handleStudentClick = (student) => {
    setSelectedStudent(student);
    setActiveTab('info');
    
    // Initialize test scores for this student
    const updatedTestData = { ...testData };
    updatedTestData.scores = { [student._id]: '' };
    setTestData(updatedTestData);
  };
  
  const handleMarkAttendance = async () => {
    if (!selectedStudent) return;
    
    try {
      console.log('Marking attendance for student:', selectedStudent.name);
      
      // Format the attendance data as expected by the API
      const requestData = {
        batch: selectedStudent.batch,
        date: attendanceDate,
        attendanceData: [
          {
            studentId: selectedStudent._id,
            status: attendanceStatus
          }
        ]
      };
      
      console.log('Attendance request data:', JSON.stringify(requestData, null, 2));
      const headers = {
        ...getAuthHeader(),
        'Content-Type': 'application/json'
      };
      console.log('Request headers:', JSON.stringify(headers, null, 2));
      
      // Make sure to use absolute path for the API endpoint
      const response = await axios.post('/api/attendance/mark', requestData, {
        headers: headers
      });
      
      console.log('Attendance mark response:', JSON.stringify(response.data, null, 2));
      alert(`Attendance marked as ${attendanceStatus} for ${selectedStudent.name}`);
      
      // Success indicator to UI
      const statusIndicator = document.createElement('div');
      statusIndicator.className = 'success-indicator';
      statusIndicator.textContent = '✓ Saved';
      document.querySelector('.mark-attendance-button').appendChild(statusIndicator);
      setTimeout(() => statusIndicator.remove(), 3000);
      
    } catch (error) {
      console.error('Error marking attendance:', error);
      console.error('Error details:', error.response ? JSON.stringify(error.response.data, null, 2) : 'No response data');
      console.error('Error status:', error.response ? error.response.status : 'No status');
      console.error('Error headers:', error.response ? JSON.stringify(error.response.headers) : 'No headers');
      console.error('Error config:', error.config ? JSON.stringify({
        url: error.config.url,
        method: error.config.method,
        data: error.config.data,
        headers: error.config.headers
      }, null, 2) : 'No config');
      
      alert('Failed to mark attendance. Please try again.');
    }
  };
  
  const handleAddTestScore = async () => {
    if (!selectedStudent || !testData.testName || !testData.subject || !testData.scores[selectedStudent._id]) return;
    
    try {
      console.log('Adding test score for student:', selectedStudent.name);
      console.log('Test data:', {
        studentId: selectedStudent._id,
        testName: testData.testName,
        subject: testData.subject,
        score: parseInt(testData.scores[selectedStudent._id], 10),
        maxScore: parseInt(testData.maxScore, 10),
        date: testData.date
      });
      
      const response = await axios.post('/api/test-scores/add', {
        studentId: selectedStudent._id,
        testName: testData.testName,
        subject: testData.subject,
        score: parseInt(testData.scores[selectedStudent._id], 10),
        maxScore: parseInt(testData.maxScore, 10),
        date: testData.date
      }, {
        headers: getAuthHeader()
      });
      
      console.log('Add test score response:', response.data);
      alert(`Test score added for ${selectedStudent.name}`);
      
      // Reset form
      setTestData({
        testName: '',
        subject: '',
        maxScore: 100,
        date: new Date().toISOString().split('T')[0],
        scores: { [selectedStudent._id]: '' }
      });
    } catch (error) {
      console.error('Error adding test score:', error);
      console.error('Error details:', error.response ? error.response.data : 'No response data');
      alert('Failed to add test score. Please try again.');
    }
  };
  
  const handleBatchTestScore = async () => {
    if (!testData.testName || !testData.subject) return;
    
    // Validate all scores
    const studentsWithScores = Object.keys(testData.scores).filter(id => 
      testData.scores[id] && !isNaN(parseInt(testData.scores[id], 10))
    );
    
    if (studentsWithScores.length === 0) {
      alert('Please enter at least one valid score');
      return;
    }
    
    try {
      console.log('Adding batch test scores for students:', studentsWithScores.length);
      
      const promises = studentsWithScores.map(studentId => {
        const scoreData = {
          studentId,
          testName: testData.testName,
          subject: testData.subject,
          score: parseInt(testData.scores[studentId], 10),
          maxScore: parseInt(testData.maxScore, 10),
          date: testData.date
        };
        
        console.log('Adding score for student ID:', studentId, scoreData);
        
        return axios.post('/api/test-scores/add', scoreData, {
          headers: getAuthHeader()
        });
      });
      
      const results = await Promise.all(promises);
      console.log('Batch test score results:', results);
      
      alert(`Test scores added for ${studentsWithScores.length} students`);
      
      // Reset form
      setTestData({
        testName: '',
        subject: '',
        maxScore: 100,
        date: new Date().toISOString().split('T')[0],
        scores: {}
      });
    } catch (error) {
      console.error('Error adding batch test scores:', error);
      console.error('Error details:', error.response ? error.response.data : 'No response data');
      alert('Failed to add test scores. Please try again.');
    }
  };
  
  const handleScoreChange = (studentId, value) => {
    setTestData(prev => ({
      ...prev,
      scores: {
        ...prev.scores,
        [studentId]: value
      }
    }));
  };
  
  if (loading) {
    return (
      <div className="students-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading students...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="students-container">
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button onClick={() => window.location.reload()} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="students-container">
      <div className="students-header">
        <h2>Students</h2>
        <p>Manage students in your batches</p>
      </div>
      
      <div className="students-filters">
        <div className="search-box">
          <FaSearch />
          <input
            type="text"
            placeholder="Search by name or class..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="filter-box">
          <FaFilter />
          <select
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
          >
            <option value="all">All Batches</option>
            {user.batches.map((batch, index) => (
              <option key={index} value={batch}>{batch}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="students-content">
        <div className="students-list">
          <h3>Students ({filteredStudents.length})</h3>
          {filteredStudents.length > 0 ? (
            <div className="student-cards">
              {filteredStudents.map(student => (
                <div 
                  key={student._id} 
                  className={`student-card ${selectedStudent && selectedStudent._id === student._id ? 'selected' : ''}`}
                  onClick={() => handleStudentClick(student)}
                >
                  <div className="student-icon">
                    <FaUserGraduate />
                  </div>
                  <div className="student-info">
                    <h4>{student.name}</h4>
                    <p>Class: {student.class}</p>
                    <p>Batch: {student.batch}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-students">No students found matching your criteria.</p>
          )}
        </div>
        
        <div className="student-details">
          {selectedStudent ? (
            <>
              <div className="student-details-header">
                <h3>{selectedStudent.name}</h3>
                <div className="student-tabs">
                  <button 
                    className={activeTab === 'info' ? 'active' : ''}
                    onClick={() => setActiveTab('info')}
                  >
                    Info
                  </button>
                  <button 
                    className={activeTab === 'attendance' ? 'active' : ''}
                    onClick={() => setActiveTab('attendance')}
                  >
                    Attendance
                  </button>
                  <button 
                    className={activeTab === 'test-scores' ? 'active' : ''}
                    onClick={() => setActiveTab('test-scores')}
                  >
                    Test Scores
                  </button>
                </div>
              </div>
              
              <div className="student-details-content">
                {activeTab === 'info' && (
                  <div className="student-info-tab">
                    <div className="info-grid">
                      <div className="info-item">
                        <span className="info-label">Name:</span>
                        <span className="info-value">{selectedStudent.name}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Class:</span>
                        <span className="info-value">{selectedStudent.class}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Batch:</span>
                        <span className="info-value">{selectedStudent.batch}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Email:</span>
                        <span className="info-value">{selectedStudent.email || 'N/A'}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Phone:</span>
                        <span className="info-value">{selectedStudent.phoneNumber || 'N/A'}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Admission Date:</span>
                        <span className="info-value">
                          {selectedStudent.dateOfAdmission 
                            ? new Date(selectedStudent.dateOfAdmission).toLocaleDateString() 
                            : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                {activeTab === 'attendance' && (
                  <div className="student-attendance-tab">
                    <h4>Mark Attendance</h4>
                    <div className="attendance-form">
                      <div className="form-group">
                        <label>Date:</label>
                        <input
                          type="date"
                          value={attendanceDate}
                          onChange={(e) => setAttendanceDate(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Status:</label>
                        <select
                          value={attendanceStatus}
                          onChange={(e) => setAttendanceStatus(e.target.value)}
                        >
                          <option value="present">Present</option>
                          <option value="absent">Absent</option>
                          <option value="late">Late</option>
                        </select>
                      </div>
                      <button 
                        className="mark-attendance-button"
                        onClick={handleMarkAttendance}
                      >
                        <FaCalendarAlt /> Mark Attendance
                      </button>
                    </div>
                  </div>
                )}
                
                {activeTab === 'test-scores' && (
                  <div className="student-test-scores-tab">
                    <h4>Add Test Score</h4>
                    <div className="test-score-form">
                      <div className="form-group">
                        <label>Test Name:</label>
                        <input
                          type="text"
                          placeholder="e.g. Midterm Exam"
                          value={testData.testName}
                          onChange={(e) => setTestData({...testData, testName: e.target.value})}
                        />
                      </div>
                      <div className="form-group">
                        <label>Subject:</label>
                        <select
                          value={testData.subject}
                          onChange={(e) => setTestData({...testData, subject: e.target.value})}
                        >
                          <option value="">Select Subject</option>
                          {user.subjects.map((subject, index) => (
                            <option key={index} value={subject}>{subject}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Score:</label>
                          <input
                            type="number"
                            min="0"
                            max={testData.maxScore}
                            placeholder="Score"
                            value={testData.scores[selectedStudent._id] || ''}
                            onChange={(e) => handleScoreChange(selectedStudent._id, e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label>Max Score:</label>
                          <input
                            type="number"
                            min="1"
                            placeholder="Max Score"
                            value={testData.maxScore}
                            onChange={(e) => setTestData({...testData, maxScore: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Date:</label>
                        <input
                          type="date"
                          value={testData.date}
                          onChange={(e) => setTestData({...testData, date: e.target.value})}
                        />
                      </div>
                      <button 
                        className="add-score-button"
                        onClick={handleAddTestScore}
                      >
                        <FaClipboardList /> Add Test Score
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="no-student-selected">
              <FaUserGraduate />
              <p>Select a student to view details</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="batch-test-scores">
        <h3>Add Test Scores for Multiple Students</h3>
        <div className="batch-test-form">
          <div className="form-row">
            <div className="form-group">
              <label>Test Name:</label>
              <input
                type="text"
                placeholder="e.g. Midterm Exam"
                value={testData.testName}
                onChange={(e) => setTestData({...testData, testName: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Subject:</label>
              <select
                value={testData.subject}
                onChange={(e) => setTestData({...testData, subject: e.target.value})}
              >
                <option value="">Select Subject</option>
                {user.subjects.map((subject, index) => (
                  <option key={index} value={subject}>{subject}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Max Score:</label>
              <input
                type="number"
                min="1"
                placeholder="Max Score"
                value={testData.maxScore}
                onChange={(e) => setTestData({...testData, maxScore: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Date:</label>
              <input
                type="date"
                value={testData.date}
                onChange={(e) => setTestData({...testData, date: e.target.value})}
              />
            </div>
          </div>
          
          <div className="batch-scores-table">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Class</th>
                  <th>Batch</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(student => (
                  <tr key={student._id}>
                    <td>{student.name}</td>
                    <td>{student.class}</td>
                    <td>{student.batch}</td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        max={testData.maxScore}
                        placeholder="Score"
                        value={testData.scores[student._id] || ''}
                        onChange={(e) => handleScoreChange(student._id, e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <button 
            className="add-batch-scores-button"
            onClick={handleBatchTestScore}
          >
            <FaClipboardList /> Add Test Scores for Selected Students
          </button>
        </div>
      </div>
    </div>
  );
};

export default Students; 