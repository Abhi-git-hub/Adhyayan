import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';
import { FaPlus, FaUserGraduate, FaBook, FaCalendarAlt, FaClipboardList } from 'react-icons/fa';
import './AddTestScore.css';

const AddTestScore = ({ onTestScoreAdded, onCancel }) => {
  const { user, getAuthHeader } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [students, setStudents] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [formData, setFormData] = useState({
    testName: '',
    subject: '',
    date: new Date().toISOString().split('T')[0],
    maxScore: 100,
    scores: []
  });

  useEffect(() => {
    if (selectedBatch) {
      fetchStudents(selectedBatch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBatch]);

  const fetchStudents = async (batch) => {
    try {
      setLoading(true);
      console.log('Fetching students for batch:', batch);
      
      // Get auth headers
      const authHeaders = getAuthHeader();
      console.log('Using auth headers for student fetch:', authHeaders);
      
      const response = await axios.get(`/api/test-scores/students/${batch}`, {
        headers: authHeaders
      });
      
      console.log('Students fetch response:', response.data);
      
      setStudents(response.data);
      
      // Initialize scores array with student IDs
      const initialScores = response.data.map(student => ({
        student: student._id,
        studentName: student.name,
        score: '',
        remarks: ''
      }));
      
      setFormData(prev => ({
        ...prev,
        scores: initialScores
      }));
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching students:', error);
      console.error('Error details:', error.response ? error.response.data : 'No response data');
      setError(error.response?.data?.message || 'Failed to load students. Please try again.');
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleScoreChange = (studentId, field, value) => {
    setFormData(prev => ({
      ...prev,
      scores: prev.scores.map(score => 
        score.student === studentId 
          ? { ...score, [field]: field === 'score' ? Number(value) : value }
          : score
      )
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      // Validate form data
      if (!formData.testName || !formData.subject || !selectedBatch || !formData.date) {
        setError('Please fill in all required fields');
        setLoading(false);
        return;
      }
      
      // Filter out empty scores
      const validScores = formData.scores.filter(score => score.score !== '');
      
      if (validScores.length === 0) {
        setError('Please enter at least one student score');
        setLoading(false);
        return;
      }
      
      // Prepare data for API
      const testScoreData = {
        testName: formData.testName,
        subject: formData.subject,
        batch: selectedBatch,
        date: formData.date,
        maxScore: Number(formData.maxScore),
        scores: validScores
      };
      
      console.log('Submitting test score data:', testScoreData);
      
      // Get auth headers
      const authHeaders = getAuthHeader();
      console.log('Using auth headers for test score submission:', authHeaders);
      
      // Submit to API
      const response = await axios.post('/api/test-scores', testScoreData, {
        headers: authHeaders
      });
      
      console.log('Test scores submission response:', response.data);
      
      setSuccess(true);
      setLoading(false);
      
      // Notify parent component
      if (onTestScoreAdded) {
        onTestScoreAdded();
      }
      
      // Reset form after 2 seconds
      setTimeout(() => {
        setSuccess(false);
        setFormData({
          testName: '',
          subject: '',
          date: new Date().toISOString().split('T')[0],
          maxScore: 100,
          scores: []
        });
        setSelectedBatch('');
      }, 2000);
      
    } catch (error) {
      console.error('Error adding test scores:', error);
      console.error('Error details:', error.response ? error.response.data : 'No response data');
      setError(error.response?.data?.message || 'Failed to add test scores. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="add-test-score-container">
      <div className="add-test-score-header">
        <h2><FaPlus /> Add Test Scores</h2>
        <p>Enter test scores for a batch of students</p>
      </div>
      
      {success && (
        <div className="success-message">
          Test scores added successfully!
        </div>
      )}
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="add-test-score-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="testName">
              <FaClipboardList /> Test Name*
            </label>
            <input
              type="text"
              id="testName"
              name="testName"
              value={formData.testName}
              onChange={handleInputChange}
              placeholder="e.g. Midterm Exam"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="subject">
              <FaBook /> Subject*
            </label>
            <select
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleInputChange}
              required
            >
              <option value="">Select Subject</option>
              {user.subjects && user.subjects.map((subject, index) => (
                <option key={index} value={subject}>{subject}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="batch">
              <FaUserGraduate /> Batch*
            </label>
            <select
              id="batch"
              name="batch"
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              required
            >
              <option value="">Select Batch</option>
              {user.batches && user.batches.map((batch, index) => (
                <option key={index} value={batch}>{batch}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="date">
              <FaCalendarAlt /> Test Date*
            </label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="maxScore">Maximum Score*</label>
            <input
              type="number"
              id="maxScore"
              name="maxScore"
              value={formData.maxScore}
              onChange={handleInputChange}
              min="1"
              required
            />
          </div>
        </div>
        
        {selectedBatch && (
          <>
            <h3 className="students-heading">Student Scores</h3>
            
            {loading ? (
              <div className="loading-message">Loading students...</div>
            ) : students.length === 0 ? (
              <div className="no-students-message">No students found in this batch</div>
            ) : (
              <div className="students-table-container">
                <table className="students-table">
                  <thead>
                    <tr>
                      <th>Student Name</th>
                      <th>Score</th>
                      <th>Remarks (Optional)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.scores.map((score, index) => (
                      <tr key={index}>
                        <td>{score.studentName}</td>
                        <td>
                          <input
                            type="number"
                            value={score.score}
                            onChange={(e) => handleScoreChange(score.student, 'score', e.target.value)}
                            min="0"
                            max={formData.maxScore}
                            placeholder={`Out of ${formData.maxScore}`}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={score.remarks}
                            onChange={(e) => handleScoreChange(score.student, 'remarks', e.target.value)}
                            placeholder="Optional remarks"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
        
        <div className="form-actions">
          <button 
            type="button" 
            className="cancel-button"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="submit-button"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Test Scores'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddTestScore; 