import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';
import { FaFilter, FaChartBar, FaTrophy, FaClipboardList, FaUserGraduate, FaSort, FaSortUp, FaSortDown, FaPlus } from 'react-icons/fa';
import AddTestScore from './AddTestScore';
import './TestScores.css';

const TestScores = () => {
  const { user, getAuthHeader } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allTestScores, setAllTestScores] = useState([]);
  const [filteredTestScores, setFilteredTestScores] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [selectedTest, setSelectedTest] = useState('all');
  const [tests, setTests] = useState([]);
  const [stats, setStats] = useState({
    averageScore: 0,
    highestScore: 0,
    lowestScore: 0,
    passRate: 0,
    totalStudents: 0
  });
  const [sortConfig, setSortConfig] = useState({
    key: 'date',
    direction: 'desc'
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [batches, setBatches] = useState([]);
  const [subjects, setSubjects] = useState([]);
  
  // Create fetchTestScores as a useCallback to prevent recreation on each render
  const fetchTestScores = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Fetching test scores for teacher ID:', user.id);
      
      // Ensure we have correct auth headers with Content-Type
      const authHeaders = {
        ...getAuthHeader(),
        'Content-Type': 'application/json'
      };
      console.log('Using auth headers:', authHeaders);
      
      // Try specific teacher endpoint first
      try {
        console.log('Attempting to fetch from /api/test-scores/by-teacher endpoint');
        const response = await axios.get('/api/test-scores/by-teacher', {
          headers: authHeaders
        });
        
        console.log('Test scores response data:', response.data);
        if (response.data && (Array.isArray(response.data) || typeof response.data === 'object')) {
          processTestScoresData(response.data);
          return;
        }
      } catch (primaryError) {
        console.error('Error with primary endpoint:', primaryError);
        console.log('Falling back to alternative endpoint...');
      }
      
      // Fallback to recent test scores endpoint
      try {
        console.log('Attempting to fetch from /api/test-scores/by-teacher/recent endpoint');
        const fallbackResponse = await axios.get('/api/test-scores/by-teacher/recent', {
          headers: authHeaders
        });
        
        console.log('Fallback test scores response:', fallbackResponse.data);
        if (fallbackResponse.data && (Array.isArray(fallbackResponse.data) || typeof fallbackResponse.data === 'object')) {
          processTestScoresData(fallbackResponse.data);
          return;
        }
      } catch (fallbackError) {
        console.error('Error with fallback endpoint:', fallbackError);
        throw new Error('Failed to fetch test scores from both primary and fallback endpoints');
      }
    } catch (error) {
      console.error('Error fetching test scores:', error);
      const errorMessage = error.response && error.response.data 
        ? error.response.data.message || 'Server error'
        : 'Failed to connect to server';
      setError(`Failed to load test scores: ${errorMessage}`);
      
      // Try to use cached data if available
      const cachedData = localStorage.getItem('teacherTestScores');
      if (cachedData) {
        try {
          const parsedData = JSON.parse(cachedData);
          console.log('Using cached test scores data:', parsedData.length, 'records');
          processTestScoresData(parsedData);
        } catch (cacheError) {
          console.error('Error parsing cached test scores:', cacheError);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [user, getAuthHeader]);
  
  // Process the fetched test scores data
  const processTestScoresData = useCallback((data) => {
    console.log('Processing test scores data:', data);
    
    // Handle different response formats
    let processedScores = [];
    
    if (Array.isArray(data)) {
      processedScores = data;
    } else if (data && typeof data === 'object') {
      // Try to find an array in the response object
      for (const key in data) {
        if (Array.isArray(data[key])) {
          processedScores = data[key];
          console.log(`Found scores array in field: ${key}`);
          break;
        }
      }
    }
    
    console.log(`Processing ${processedScores.length} test scores records`);
    
    // Make sure each score has the required fields
    processedScores = processedScores.map(score => {
      // Ensure date is in proper format
      let dateValue = score.date;
      if (dateValue) {
        try {
          // Try to ensure valid date format
          const testDate = new Date(dateValue);
          if (isNaN(testDate.getTime())) {
            dateValue = new Date().toISOString();
          }
        } catch (e) {
          dateValue = new Date().toISOString();
        }
      } else {
        dateValue = new Date().toISOString();
      }
      
      // Extract student data from nested objects if needed
      let studentName = score.studentName;
      let studentId = score.studentId;
      
      // Handle nested student object
      if (!studentName && score.student) {
        if (typeof score.student === 'object') {
          studentName = score.student.name || score.student.fullName || 'Unknown Student';
          studentId = studentId || score.student._id || score.student.id;
        } else if (typeof score.student === 'string') {
          studentId = score.student;
        }
      }
      
      // Handle scores field if it's an array with student scores
      if (!studentName && Array.isArray(score.scores)) {
        // This is a test score document with multiple student scores
        // We'll process this differently in a separate function
        return null;
      }
      
      // Ensure score and maxScore are numbers
      const numScore = typeof score.score === 'number' ? score.score : 
                      (typeof score.score === 'string' ? parseFloat(score.score) : 0);
      const numMaxScore = typeof score.maxScore === 'number' ? score.maxScore : 
                        (typeof score.maxScore === 'string' ? parseFloat(score.maxScore) : 100);
      
      return {
        ...score,
        testName: score.testName || score.name || 'Unknown Test',
        subject: score.subject || 'General',
        studentName: studentName || `Student (ID: ${studentId || 'Unknown'})`,
        studentId: studentId || score._id,
        batch: score.batch || 'Unknown Batch',
        date: dateValue,
        score: numScore, 
        maxScore: numMaxScore
      };
    }).filter(Boolean); // Remove null items
    
    // Process test scores that have nested student scores
    const scoresWithNestedStudents = data.filter(item => 
      item && typeof item === 'object' && Array.isArray(item.scores) && item.scores.length > 0
    );
    
    // Extract student scores from test documents
    if (scoresWithNestedStudents.length > 0) {
      console.log(`Found ${scoresWithNestedStudents.length} test documents with nested student scores`);
      
      const extractedStudentScores = [];
      
      scoresWithNestedStudents.forEach(testDoc => {
        const testName = testDoc.testName || testDoc.name || 'Unknown Test';
        const subject = testDoc.subject || 'General';
        const date = testDoc.date || new Date().toISOString();
        const maxScore = testDoc.maxScore || 100;
        
        // Process each student's score
        testDoc.scores.forEach(studentScore => {
          if (!studentScore || typeof studentScore !== 'object') return;
          
          let studentName = studentScore.studentName;
          let studentId = studentScore.studentId;
          
          // Handle nested student object
          if (!studentName && studentScore.student) {
            if (typeof studentScore.student === 'object') {
              studentName = studentScore.student.name || studentScore.student.fullName || 'Unknown Student';
              studentId = studentId || studentScore.student._id || studentScore.student.id;
            } else if (typeof studentScore.student === 'string') {
              studentId = studentScore.student;
            }
          }
          
          const numScore = typeof studentScore.score === 'number' ? studentScore.score : 
                          (typeof studentScore.score === 'string' ? parseFloat(studentScore.score) : 0);
          
          extractedStudentScores.push({
            testName,
            subject,
            date,
            maxScore,
            score: numScore,
            studentName: studentName || `Student (ID: ${studentId || 'Unknown'})`,
            studentId: studentId || studentScore._id,
            batch: studentScore.batch || testDoc.batch || 'Unknown Batch'
          });
        });
      });
      
      console.log(`Extracted ${extractedStudentScores.length} individual student scores from test documents`);
      
      // Add the extracted scores to the processed scores
      processedScores = [...processedScores, ...extractedStudentScores];
    }
    
    // Cache the processed scores
    if (processedScores.length > 0) {
      localStorage.setItem('teacherTestScores', JSON.stringify(processedScores));
    }
    
    // Extract unique subjects, batches, and tests for filtering
    const uniqueSubjects = [...new Set(processedScores.map(score => score.subject))].filter(Boolean);
    const uniqueBatches = [...new Set(processedScores.map(score => score.batch))].filter(Boolean);
    const uniqueTests = [...new Set(processedScores.map(score => score.testName))].filter(Boolean);
    
    setSubjects(uniqueSubjects);
    setBatches(uniqueBatches);
    setTests(uniqueTests);
    setAllTestScores(processedScores);
    setFilteredTestScores(processedScores);
    calculateStats(processedScores);
  }, []);
  
  // Fetch test scores when component mounts
  useEffect(() => {
    fetchTestScores();
  }, [fetchTestScores]);
  
  useEffect(() => {
    // Filter test scores based on selected filters
    let filtered = allTestScores;
    
    if (selectedSubject !== 'all') {
      filtered = filtered.filter(score => score.subject === selectedSubject);
    }
    
    if (selectedBatch !== 'all') {
      filtered = filtered.filter(score => score.batch === selectedBatch);
    }
    
    if (selectedTest !== 'all') {
      filtered = filtered.filter(score => score.testName === selectedTest);
    }
    
    // Apply sorting
    const sortedScores = [...filtered].sort((a, b) => {
      if (sortConfig.key === 'date') {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
      } else if (sortConfig.key === 'score') {
        const scoreA = (a.score / a.maxScore) * 100;
        const scoreB = (b.score / b.maxScore) * 100;
        return sortConfig.direction === 'asc' ? scoreA - scoreB : scoreB - scoreA;
      } else if (sortConfig.key === 'name') {
        return sortConfig.direction === 'asc' 
          ? a.studentName.localeCompare(b.studentName)
          : b.studentName.localeCompare(a.studentName);
      }
      return 0;
    });
    
    setFilteredTestScores(sortedScores);
    calculateStats(sortedScores);
  }, [selectedSubject, selectedBatch, selectedTest, allTestScores, sortConfig]);
  
  const calculateStats = (scores) => {
    if (scores.length === 0) {
      setStats({
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        passRate: 0,
        totalStudents: 0
      });
      return;
    }
    
    // Calculate percentage scores
    const percentageScores = scores.map(score => (score.score / score.maxScore) * 100);
    
    // Calculate average score
    const average = percentageScores.reduce((sum, score) => sum + score, 0) / percentageScores.length;
    
    // Calculate highest and lowest scores
    const highest = Math.max(...percentageScores);
    const lowest = Math.min(...percentageScores);
    
    // Calculate pass rate (scores >= 40%)
    const passCount = percentageScores.filter(score => score >= 40).length;
    const passRate = (passCount / percentageScores.length) * 100;
    
    // Count unique students
    const uniqueStudents = new Set(scores.map(score => score.studentId)).size;
    
    setStats({
      averageScore: average.toFixed(2),
      highestScore: highest.toFixed(2),
      lowestScore: lowest.toFixed(2),
      passRate: passRate.toFixed(2),
      totalStudents: uniqueStudents
    });
  };
  
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <FaSort />;
    return sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />;
  };
  
  const getScoreColor = (score, maxScore) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 75) return 'excellent';
    if (percentage >= 60) return 'good';
    if (percentage >= 40) return 'average';
    return 'poor';
  };
  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const handleTestScoreAdded = useCallback(() => {
    fetchTestScores();
    setShowAddForm(false);
  }, [fetchTestScores]);
  
  if (loading && allTestScores.length === 0) {
    return (
      <div className="test-scores-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading test scores...</p>
        </div>
      </div>
    );
  }
  
  if (error && allTestScores.length === 0) {
    return (
      <div className="test-scores-container">
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
    <div className="test-scores-container">
      {showAddForm ? (
        <AddTestScore 
          onTestScoreAdded={handleTestScoreAdded} 
          onCancel={() => setShowAddForm(false)} 
        />
      ) : (
        <>
          <div className="test-scores-header">
            <div>
              <h2>Test Scores</h2>
              <p>View and analyze student test performance</p>
            </div>
            <button 
              className="add-test-score-button"
              onClick={() => setShowAddForm(true)}
            >
              <FaPlus /> Add Test Scores
            </button>
          </div>
          
          <div className="test-scores-filters">
            <div className="filter-box">
              <FaFilter />
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
              >
                <option value="all">All Subjects</option>
                {subjects.map((subject, index) => (
                  <option key={index} value={subject}>{subject}</option>
                ))}
              </select>
            </div>
            
            <div className="filter-box">
              <FaFilter />
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
              >
                <option value="all">All Batches</option>
                {batches.map((batch, index) => (
                  <option key={index} value={batch}>{batch}</option>
                ))}
              </select>
            </div>
            
            <div className="filter-box">
              <FaFilter />
              <select
                value={selectedTest}
                onChange={(e) => setSelectedTest(e.target.value)}
              >
                <option value="all">All Tests</option>
                {tests.map((test, index) => (
                  <option key={index} value={test}>{test}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="test-scores-stats">
            <div className="stat-card">
              <div className="stat-icon">
                <FaChartBar />
              </div>
              <div className="stat-content">
                <h3>{stats.averageScore}%</h3>
                <p>Average Score</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">
                <FaTrophy />
              </div>
              <div className="stat-content">
                <h3>{stats.highestScore}%</h3>
                <p>Highest Score</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">
                <FaClipboardList />
              </div>
              <div className="stat-content">
                <h3>{stats.passRate}%</h3>
                <p>Pass Rate</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">
                <FaUserGraduate />
              </div>
              <div className="stat-content">
                <h3>{stats.totalStudents}</h3>
                <p>Students</p>
              </div>
            </div>
          </div>
          
          {filteredTestScores.length > 0 ? (
            <div className="test-scores-table-container">
              <table className="test-scores-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('name')} className="sortable-header">
                      Student {getSortIcon('name')}
                    </th>
                    <th>Batch</th>
                    <th>Test Name</th>
                    <th>Subject</th>
                    <th onClick={() => handleSort('date')} className="sortable-header">
                      Date {getSortIcon('date')}
                    </th>
                    <th onClick={() => handleSort('score')} className="sortable-header">
                      Score {getSortIcon('score')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTestScores.map((score, index) => (
                    <tr key={index}>
                      <td>{score.studentName}</td>
                      <td>{score.batch}</td>
                      <td>{score.testName}</td>
                      <td>{score.subject}</td>
                      <td>{formatDate(score.date)}</td>
                      <td>
                        <div className="score-display">
                          <div className="score-text">
                            {score.score}/{score.maxScore} ({((score.score / score.maxScore) * 100).toFixed(2)}%)
                          </div>
                          <div className="score-bar-container">
                            <div 
                              className={`score-bar ${getScoreColor(score.score, score.maxScore)}`}
                              style={{ width: `${(score.score / score.maxScore) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="no-scores">
              <p>No test scores found matching your criteria.</p>
            </div>
          )}
          
          {selectedTest !== 'all' && filteredTestScores.length > 0 && (
            <div className="test-analysis">
              <h3>Test Analysis: {selectedTest}</h3>
              
              <div className="test-summary">
                <div className="summary-item">
                  <span className="summary-label">Subject:</span>
                  <span className="summary-value">{filteredTestScores[0].subject}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Date:</span>
                  <span className="summary-value">{formatDate(filteredTestScores[0].date)}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Max Score:</span>
                  <span className="summary-value">{filteredTestScores[0].maxScore}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Students:</span>
                  <span className="summary-value">{filteredTestScores.length}</span>
                </div>
              </div>
              
              <div className="score-distribution">
                <h4>Score Distribution</h4>
                <div className="distribution-bars">
                  <div className="distribution-group">
                    <div className="distribution-label">Excellent (75-100%)</div>
                    <div className="distribution-bar-container">
                      <div 
                        className="distribution-bar excellent"
                        style={{ 
                          width: `${(filteredTestScores.filter(score => (score.score / score.maxScore) * 100 >= 75).length / filteredTestScores.length) * 100}%` 
                        }}
                      ></div>
                      <span className="distribution-count">
                        {filteredTestScores.filter(score => (score.score / score.maxScore) * 100 >= 75).length}
                      </span>
                    </div>
                  </div>
                  
                  <div className="distribution-group">
                    <div className="distribution-label">Good (60-74%)</div>
                    <div className="distribution-bar-container">
                      <div 
                        className="distribution-bar good"
                        style={{ 
                          width: `${(filteredTestScores.filter(score => 
                            (score.score / score.maxScore) * 100 >= 60 && 
                            (score.score / score.maxScore) * 100 < 75
                          ).length / filteredTestScores.length) * 100}%` 
                        }}
                      ></div>
                      <span className="distribution-count">
                        {filteredTestScores.filter(score => 
                          (score.score / score.maxScore) * 100 >= 60 && 
                          (score.score / score.maxScore) * 100 < 75
                        ).length}
                      </span>
                    </div>
                  </div>
                  
                  <div className="distribution-group">
                    <div className="distribution-label">Average (40-59%)</div>
                    <div className="distribution-bar-container">
                      <div 
                        className="distribution-bar average"
                        style={{ 
                          width: `${(filteredTestScores.filter(score => 
                            (score.score / score.maxScore) * 100 >= 40 && 
                            (score.score / score.maxScore) * 100 < 60
                          ).length / filteredTestScores.length) * 100}%` 
                        }}
                      ></div>
                      <span className="distribution-count">
                        {filteredTestScores.filter(score => 
                          (score.score / score.maxScore) * 100 >= 40 && 
                          (score.score / score.maxScore) * 100 < 60
                        ).length}
                      </span>
                    </div>
                  </div>
                  
                  <div className="distribution-group">
                    <div className="distribution-label">Poor (0-39%)</div>
                    <div className="distribution-bar-container">
                      <div 
                        className="distribution-bar poor"
                        style={{ 
                          width: `${(filteredTestScores.filter(score => (score.score / score.maxScore) * 100 < 40).length / filteredTestScores.length) * 100}%` 
                        }}
                      ></div>
                      <span className="distribution-count">
                        {filteredTestScores.filter(score => (score.score / score.maxScore) * 100 < 40).length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TestScores; 