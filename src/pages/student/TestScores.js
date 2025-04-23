import React, { useEffect, useState } from 'react';
import { Container, Table, Card, Row, Col, Alert, Badge } from 'react-bootstrap';
import axios from 'axios';
import { baseUrl } from '../../config';
import StudentNavbar from '../../components/StudentNavbar';
import Loader from '../../components/Loader';
import { FaTrophy, FaChartBar, FaGraduationCap, FaCalendarAlt, FaBook } from 'react-icons/fa';

const TestScores = () => {
  const [testScores, setTestScores] = useState([]);
  const [averageScore, setAverageScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [debug, setDebug] = useState({
    apiCalled: false,
    tokenFound: false,
    testScoresCount: 0
  });

  useEffect(() => {
    const fetchTestScores = async () => {
      try {
        setLoading(true);
        setError('');
        const token = localStorage.getItem('token');
        
        // Update debug state
        setDebug(prev => ({ ...prev, apiCalled: true, tokenFound: !!token }));
        
        if (!token) {
          throw new Error('Authentication token not found');
        }

        console.log('Fetching test scores with token:', token);

        // First get student ID
        let studentId;
        try {
          const meResponse = await axios.get(`${baseUrl}/api/students/me`, {
            headers: {
              'x-auth-token': token
            }
          });
          
          studentId = meResponse.data._id;
          console.log('Student ID retrieved:', studentId);
          
          // Add debug log to track request
          console.log(`Making request to: ${baseUrl}/api/test-scores/student/${studentId}`);
        } catch (err) {
          console.error('Error fetching student profile:', err);
          throw new Error(`Failed to fetch student profile: ${err.message}`);
        }

        // Fetch test scores
        const response = await axios.get(`${baseUrl}/api/test-scores/student/${studentId}`, {
          headers: {
            'x-auth-token': token
          }
        });

        console.log('Test scores response:', response.data);
        
        // Handle different response formats
        let scores = [];
        let averageStats = { average: 0, highest: 0, lowest: 0, totalTests: 0 };
        
        if (response.data) {
          if (Array.isArray(response.data)) {
            scores = response.data;
          } else if (response.data.scores) {
            scores = response.data.scores;
          } else if (response.data.testScores) {
            scores = response.data.testScores;
          }
          
          // Get average stats if available
          if (response.data.averageStats) {
            averageStats = response.data.averageStats;
          }
        }
        
        // If no scores found, try to fetch from student profile as fallback
        if (scores.length === 0) {
          try {
            console.log("No scores found, trying to fetch from student profile");
            const studentResponse = await axios.get(`${baseUrl}/api/students/${studentId}`, {
              headers: {
                'x-auth-token': token
              }
            });
            
            if (studentResponse.data && studentResponse.data.testScores && studentResponse.data.testScores.length > 0) {
              console.log("Found scores in student profile:", studentResponse.data.testScores);
              scores = studentResponse.data.testScores;
            }
          } catch (err) {
            console.error("Error fetching student profile for scores:", err);
          }
        }
        
        // Make sure we store the scores even if empty
        setTestScores(scores || []);
        setDebug(prev => ({ ...prev, testScoresCount: scores.length }));
        
        // Calculate average score if not provided in averageStats
        if (scores && scores.length > 0 && averageStats.average === 0) {
          const totalPercentage = scores.reduce((sum, test) => {
            const percentage = test.maxScore > 0 
              ? (test.score / test.maxScore) * 100 
              : 0;
            return sum + percentage;
          }, 0);
          setAverageScore((totalPercentage / scores.length).toFixed(2));
        } else if (averageStats.average > 0) {
          setAverageScore(averageStats.average);
        } else {
          setAverageScore(0);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching test scores:', err);
        console.error('Error details:', err.response ? err.response.data : 'No response data');
        setError(`Failed to load test scores: ${err.message}`);
        setLoading(false);
        
        // Try to load from local storage as a last resort
        const cachedScores = localStorage.getItem('cachedTestScores');
        if (cachedScores) {
          try {
            const parsed = JSON.parse(cachedScores);
            console.log('Using cached test scores:', parsed);
            setTestScores(parsed);
            setDebug(prev => ({ ...prev, testScoresCount: parsed.length, usingCache: true }));
          } catch (cacheErr) {
            console.error('Error parsing cached test scores:', cacheErr);
          }
        }
      }
    };

    fetchTestScores();
    
    // Cleanup function that caches test scores
    return () => {
      if (testScores.length > 0) {
        localStorage.setItem('cachedTestScores', JSON.stringify(testScores));
        console.log('Cached test scores for future use');
      }
    };
  }, []);

  const getGradeBadge = (percentage) => {
    if (percentage >= 90) {
      return <Badge bg="success">A</Badge>;
    } else if (percentage >= 80) {
      return <Badge bg="primary">B</Badge>;
    } else if (percentage >= 70) {
      return <Badge bg="info">C</Badge>;
    } else if (percentage >= 60) {
      return <Badge bg="warning">D</Badge>;
    } else {
      return <Badge bg="danger">F</Badge>;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <>
      <StudentNavbar />
      <Container className="mt-4">
        <h2 className="mb-4"><FaGraduationCap className="me-2" />My Test Scores</h2>
        
        {/* Debug info in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-3">
            <small>
              <strong>Debug Info:</strong> 
              API Called: {debug.apiCalled ? 'Yes' : 'No'} | 
              Token Found: {debug.tokenFound ? 'Yes' : 'No'} |
              Test Scores Count: {debug.testScoresCount} |
              Base URL: {baseUrl}
            </small>
          </div>
        )}
        
        {error && <Alert variant="danger">{error}</Alert>}
        
        {loading ? (
          <div className="text-center">
            <Loader />
            <p>Loading test scores...</p>
          </div>
        ) : (
          <>
            {testScores.length === 0 ? (
              <Alert variant="info">No test scores available yet.</Alert>
            ) : (
              <>
                <Row className="mb-4">
                  <Col md={6}>
                    <Card className="shadow-sm">
                      <Card.Header className="bg-primary text-white">
                        <h5 className="mb-0"><FaChartBar className="me-2" />Performance Summary</h5>
                      </Card.Header>
                      <Card.Body>
                        <div className="d-flex align-items-center">
                          <div className="display-4 me-3">{averageScore}%</div>
                          <div>
                            <h5>Average Score</h5>
                            <p className="mb-0">Based on {testScores.length} tests</p>
                          </div>
                        </div>
                        
                        <div className="progress mt-3">
                          <div 
                            className="progress-bar" 
                            role="progressbar" 
                            style={{ 
                              width: `${averageScore}%`,
                              backgroundColor: 
                                averageScore >= 90 ? '#28a745' : 
                                averageScore >= 80 ? '#007bff' :
                                averageScore >= 70 ? '#17a2b8' :
                                averageScore >= 60 ? '#ffc107' : '#dc3545'
                            }}
                            aria-valuenow={averageScore} 
                            aria-valuemin="0" 
                            aria-valuemax="100"
                          >
                            {averageScore}%
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                <Card className="shadow-sm">
                  <Card.Header className="bg-primary text-white">
                    <h5 className="mb-0"><FaTrophy className="me-2" />Test Scores</h5>
                  </Card.Header>
                  <Card.Body>
                    <Table striped bordered hover responsive>
                      <thead className="table-primary">
                        <tr>
                          <th>Subject</th>
                          <th>Test Name</th>
                          <th>Date</th>
                          <th>Score</th>
                          <th>Maximum</th>
                          <th>Percentage</th>
                          <th>Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {testScores.map((test, index) => {
                          const percentage = test.maxScore > 0 
                            ? ((test.score / test.maxScore) * 100).toFixed(2)
                            : 0;
                            
                          return (
                            <tr key={test._id || index}>
                              <td><FaBook className="me-1" />{test.subject}</td>
                              <td>{test.testName}</td>
                              <td><FaCalendarAlt className="me-1" />{formatDate(test.date)}</td>
                              <td>{test.score}</td>
                              <td>{test.maxScore}</td>
                              <td>{percentage}%</td>
                              <td>{getGradeBadge(percentage)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              </>
            )}
          </>
        )}
      </Container>
    </>
  );
};

export default TestScores; 