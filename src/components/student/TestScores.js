import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { FaChartLine, FaCalendarAlt, FaBook, FaChartBar } from 'react-icons/fa';
import './TestScores.css';

const TestScores = () => {
  const { user, getAuthHeader } = useContext(AuthContext);
  const [testScores, setTestScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    averageScore: 0,
    highestScore: 0,
    lowestScore: 0,
    totalTests: 0
  });
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    const fetchTestScores = async () => {
      try {
        setLoading(true);
        console.log('Fetching test scores for student ID:', user.id);
        
        // Get auth headers from context
        const authHeaders = {
          ...getAuthHeader(),
          'Content-Type': 'application/json'
        };
        console.log('Using auth headers for test scores:', authHeaders);
        
        // Make the API request with the correct endpoint
        const response = await axios.get(`/api/test-scores/student/${user.id}`, {
          headers: authHeaders
        });
        
        console.log('Test scores API response:', response.data);
        
        // Extract scores from the response
        let scores = [];
        if (response.data && response.data.scores) {
          scores = response.data.scores;
          console.log('Found scores array in response.data.scores');
        } else if (Array.isArray(response.data)) {
          scores = response.data;
          console.log('Using direct array response');
        } else if (response.data && typeof response.data === 'object') {
          // Try to find scores in the response object
          for (const key in response.data) {
            if (Array.isArray(response.data[key])) {
              scores = response.data[key];
              if (scores.length > 0) {
                console.log(`Found test scores in field: ${key}`);
                break;
              }
            }
          }
        }
        
        // Make sure all scores have required fields
        scores = scores.filter(score => score && typeof score === 'object')
          .map(score => {
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
            
            // Ensure score and maxScore are numbers
            const numScore = typeof score.score === 'number' ? score.score : 
                            (typeof score.score === 'string' ? parseFloat(score.score) : 0);
            const numMaxScore = typeof score.maxScore === 'number' ? score.maxScore : 
                               (typeof score.maxScore === 'string' ? parseFloat(score.maxScore) : 100);
            
            return {
              ...score,
              testName: score.testName || score.name || 'Unknown Test',
              subject: score.subject || 'General',
              score: numScore,
              maxScore: numMaxScore,
              date: dateValue,
              percentage: numMaxScore > 0 ? (numScore / numMaxScore) * 100 : 0
            };
          });
        
        console.log('Processed test scores:', scores);
        setTestScores(scores);
        
        // Extract stats from response if available, otherwise calculate
        if (response.data && response.data.averageStats) {
          console.log('Using stats from response:', response.data.averageStats);
          const apiStats = response.data.averageStats;
          setStats({
            averageScore: apiStats.average || 0,
            highestScore: apiStats.highest || 0,
            lowestScore: apiStats.lowest || 0,
            totalTests: apiStats.totalTests || 0
          });
        } else {
          console.log('Calculating stats from scores');
          calculateStats(scores);
        }
        
        // Extract unique subjects for filtering
        const uniqueSubjects = [...new Set(scores.map(score => score.subject))].filter(Boolean);
        setSubjects(uniqueSubjects);
        
        // Try to fetch recent tests if no scores were found
        if (scores.length === 0) {
          console.log('No scores found, trying recent test scores endpoint');
          try {
            const recentResponse = await axios.get(`/api/test-scores/recent/${user.id}`, {
              headers: authHeaders
            });
            
            console.log('Recent test scores response:', recentResponse.data);
            
            let recentScores = [];
            if (Array.isArray(recentResponse.data)) {
              recentScores = recentResponse.data;
            } else if (recentResponse.data && typeof recentResponse.data === 'object') {
              for (const key in recentResponse.data) {
                if (Array.isArray(recentResponse.data[key])) {
                  recentScores = recentResponse.data[key];
                  break;
                }
              }
            }
            
            // Process recent scores
            recentScores = recentScores.filter(score => score && typeof score === 'object')
              .map(score => ({
                ...score,
                testName: score.testName || 'Unknown Test',
                subject: score.subject || 'General',
                score: typeof score.score === 'number' ? score.score : 0,
                maxScore: typeof score.maxScore === 'number' ? score.maxScore : 100,
                date: score.date || new Date().toISOString(),
                percentage: score.maxScore ? (score.score / score.maxScore) * 100 : 0
              }));
            
            if (recentScores.length > 0) {
              console.log('Using recent scores:', recentScores);
              setTestScores(recentScores);
              calculateStats(recentScores);
              
              // Extract unique subjects for filtering
              const uniqueSubjects = [...new Set(recentScores.map(score => score.subject))].filter(Boolean);
              setSubjects(uniqueSubjects);
            }
          } catch (recentError) {
            console.error('Error fetching recent test scores:', recentError);
          }
        }
        
        // Save valid scores to localStorage for offline access
        if (scores.length > 0) {
          localStorage.setItem('studentTestScores', JSON.stringify(scores));
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching test scores:', err);
        console.error('Error details:', err.response ? err.response.data : 'No response data');
        setError('Failed to load test scores. Please try again later.');
        
        // Try to load from localStorage if available
        try {
          const cachedScores = localStorage.getItem('studentTestScores');
          if (cachedScores) {
            const parsedScores = JSON.parse(cachedScores);
            console.log('Using cached test scores:', parsedScores.length);
            setTestScores(parsedScores);
            calculateStats(parsedScores);
            
            // Extract unique subjects for filtering
            const uniqueSubjects = [...new Set(parsedScores.map(score => score.subject))].filter(Boolean);
            setSubjects(uniqueSubjects);
          }
        } catch (cacheError) {
          console.error('Error parsing cached scores:', cacheError);
        }
        
        setLoading(false);
      }
    };

    // Calculate statistics from a list of test scores
    const calculateStats = (scores) => {
      if (!scores || scores.length === 0) {
        setStats({
          averageScore: 0,
          highestScore: 0,
          lowestScore: 0,
          totalTests: 0
        });
        return;
      }

      // Calculate percentages for each test
      const percentages = scores
        .filter(score => score && typeof score.score === 'number' && typeof score.maxScore === 'number' && score.maxScore > 0)
        .map(score => (score.score / score.maxScore) * 100);
      
      if (percentages.length === 0) {
        setStats({
          averageScore: 0,
          highestScore: 0,
          lowestScore: 0,
          totalTests: scores.length
        });
        return;
      }

      // Calculate statistics
      const average = percentages.reduce((sum, p) => sum + p, 0) / percentages.length;
      const highest = Math.max(...percentages);
      const lowest = Math.min(...percentages);

      setStats({
        averageScore: parseFloat(average.toFixed(1)),
        highestScore: parseFloat(highest.toFixed(1)),
        lowestScore: parseFloat(lowest.toFixed(1)),
        totalTests: scores.length
      });
    };

    if (user && user.id) {
      fetchTestScores();
    }
  }, [user, getAuthHeader]);

  // Filter tests by selected subject
  const filteredTests = selectedSubject === 'all' 
    ? testScores 
    : testScores.filter(test => test.subject === selectedSubject);

  // Update stats when filter changes
  useEffect(() => {
    calculateStats(filteredTests);
  }, [selectedSubject, testScores, filteredTests]);

  // Get score color based on score value
  const getScoreColor = (score, maxScore) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 90) return '#4caf50'; // Green
    if (percentage >= 80) return '#8bc34a'; // Light Green
    if (percentage >= 70) return '#ffc107'; // Yellow
    if (percentage >= 60) return '#ff9800'; // Orange
    return '#f44336'; // Red
  };

  // Format date to readable format
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div className="test-scores-container">
      <div className="test-scores-header">
        <h2>Test Scores</h2>
        <p>Track your performance in tests and exams</p>
      </div>

      {loading ? (
        <div className="test-scores-loading">Loading test scores...</div>
      ) : error ? (
        <div className="test-scores-error">{error}</div>
      ) : testScores.length === 0 ? (
        <div className="test-scores-empty">
          <p>No test scores available yet.</p>
          <div className="empty-state-message">
            <p>Your test scores will appear here once they are added by your teacher.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="test-scores-stats">
            <div className="stat-card">
              <div className="stat-icon">
                <FaChartLine />
              </div>
              <div className="stat-content">
                <h3>Average Score</h3>
                <div className="stat-value">{stats.averageScore}%</div>
                <div className="stat-label">Across all tests</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">
                <FaChartBar />
              </div>
              <div className="stat-content">
                <h3>Highest Score</h3>
                <div className="stat-value">{stats.highestScore}%</div>
                <div className="stat-label">Your best performance</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">
                <FaCalendarAlt />
              </div>
              <div className="stat-content">
                <h3>Total Tests</h3>
                <div className="stat-value">{stats.totalTests}</div>
                <div className="stat-label">Tests taken so far</div>
              </div>
            </div>
          </div>

          <div className="test-scores-filter">
            <label htmlFor="subject-filter">Filter by Subject:</label>
            <select 
              id="subject-filter"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
            >
              <option value="all">All Subjects</option>
              {subjects.map((subject, index) => (
                <option key={index} value={subject}>{subject}</option>
              ))}
            </select>
          </div>

          <div className="test-scores-table-container">
            <table className="test-scores-table">
              <thead>
                <tr>
                  <th>Test Name</th>
                  <th>Subject</th>
                  <th>Date</th>
                  <th>Score</th>
                  <th>Max Score</th>
                  <th>Percentage</th>
                </tr>
              </thead>
              <tbody>
                {filteredTests.map((test, index) => {
                  const percentage = ((test.score / test.maxScore) * 100).toFixed(1);
                  return (
                    <tr key={index}>
                      <td>{test.testName}</td>
                      <td>
                        <span className="subject-badge">
                          <FaBook className="subject-icon" />
                          {test.subject}
                        </span>
                      </td>
                      <td>{formatDate(test.date)}</td>
                      <td>{test.score}</td>
                      <td>{test.maxScore}</td>
                      <td>
                        <div className="score-percentage">
                          <div 
                            className="score-bar"
                            style={{ 
                              width: `${percentage}%`,
                              backgroundColor: getScoreColor(test.score, test.maxScore)
                            }}
                          ></div>
                          <span className="score-value">{percentage}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default TestScores; 