import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { FaCalendarCheck, FaCalendarTimes, FaCalendarAlt, FaChartPie } from 'react-icons/fa';
import './Attendance.css';

const Attendance = () => {
  const { user, getAuthHeader } = useContext(AuthContext);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalClasses: 0,
    present: 0,
    absent: 0,
    attendancePercentage: 0
  });
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [subjects, setSubjects] = useState([]);
  const [months, setMonths] = useState([]);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        setLoading(true);
        console.log('Fetching attendance for student ID:', user.id);
        
        // Get auth header from context
        const authHeader = {
          ...getAuthHeader(),
          'Content-Type': 'application/json'
        };
        console.log('Using auth header:', authHeader);
        
        // Make the API request
        console.log(`Making request to /api/attendance/student/${user.id}`);
        const response = await axios.get(`/api/attendance/student/${user.id}`, {
          headers: authHeader
        });
        
        console.log('Attendance response data:', response.data);
        
        // Handle different response formats
        let attendanceData = [];
        
        if (response.data && Array.isArray(response.data.attendance)) {
          // If response has attendance array property
          attendanceData = response.data.attendance;
          console.log('Using attendance array from response data');
        } else if (Array.isArray(response.data)) {
          // If response is directly an array
          attendanceData = response.data;
          console.log('Using direct array response data');
        } else if (response.data && typeof response.data === 'object') {
          // Try to find an array in the response object
          for (const key in response.data) {
            if (Array.isArray(response.data[key])) {
              attendanceData = response.data[key];
              console.log(`Found attendance array in field: ${key}`);
              break;
            }
          }
        }
        
        // Filter out any records that don't have status
        attendanceData = attendanceData.filter(record => record && record.status);
        
        // Add default subject if not present
        attendanceData = attendanceData.map(record => {
          // Ensure date is in proper format
          let dateValue = record.date;
          if (dateValue) {
            try {
              // Try to ensure valid date format
              const attendanceDate = new Date(dateValue);
              if (isNaN(attendanceDate.getTime())) {
                dateValue = new Date().toISOString();
              }
            } catch (e) {
              dateValue = new Date().toISOString();
            }
          } else {
            dateValue = new Date().toISOString();
          }
          
          return {
            ...record,
            subject: record.subject || 'General',
            date: dateValue,
            status: record.status || 'unmarked',
            remarks: record.remarks || ''
          };
        });
        
        console.log('Processed attendance records:', attendanceData);
        
        // Extract unique subjects
        const uniqueSubjects = [...new Set(attendanceData.map(record => record.subject))];
        setSubjects(uniqueSubjects);
        
        // Extract unique months
        const uniqueMonths = [...new Set(attendanceData.map(record => {
          if (!record.date) return null;
          const date = new Date(record.date);
          if (isNaN(date.getTime())) return null;
          return `${date.getMonth() + 1}-${date.getFullYear()}`;
        }))].filter(Boolean);
        
        setMonths(uniqueMonths.map(monthYear => {
          const [month, year] = monthYear.split('-');
          return {
            value: monthYear,
            label: `${getMonthName(parseInt(month))} ${year}`
          };
        }));
        
        // Save the attendance records in state
        setAttendance(attendanceData);
        
        // Calculate initial stats for all records
        calculateStats(attendanceData);
        
        // Cache the attendance for future use
        if (attendanceData.length > 0) {
          localStorage.setItem('attendanceData', JSON.stringify(attendanceData));
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching attendance:', err);
        console.error('Error details:', err.response ? err.response.data : 'No response data');
        setError('Failed to load attendance data. Please try again later.');
        
        // Try to load cached data if available
        const cachedData = localStorage.getItem('attendanceData');
        if (cachedData) {
          try {
            const parsedData = JSON.parse(cachedData);
            console.log('Using cached attendance data:', parsedData.length, 'records');
            setAttendance(parsedData);
            
            // Extract unique subjects from cached data
            const uniqueSubjects = [...new Set(parsedData.map(record => record.subject || 'General'))];
            setSubjects(uniqueSubjects);
            
            // Extract unique months from cached data
            const uniqueMonths = [...new Set(parsedData.map(record => {
              if (!record.date) return null;
              const date = new Date(record.date);
              if (isNaN(date.getTime())) return null;
              return `${date.getMonth() + 1}-${date.getFullYear()}`;
            }))].filter(Boolean);
            
            setMonths(uniqueMonths.map(monthYear => {
              const [month, year] = monthYear.split('-');
              return {
                value: monthYear,
                label: `${getMonthName(parseInt(month))} ${year}`
              };
            }));
            
            // Calculate stats for cached data
            calculateStats(parsedData);
          } catch (cacheError) {
            console.error('Error parsing cached attendance data:', cacheError);
          }
        }
        
        setLoading(false);
      }
    };

    if (user && user.id) {
      fetchAttendance();
    }
  }, [user, getAuthHeader]);

  // Helper function to get month name
  const getMonthName = (monthNumber) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthNumber - 1];
  };

  // Calculate statistics based on filtered records
  const calculateStats = (records) => {
    if (records.length === 0) {
      setStats({
        totalClasses: 0,
        present: 0,
        absent: 0,
        attendancePercentage: 0
      });
      return;
    }

    const present = records.filter(record => record.status === 'present').length;
    const totalClasses = records.length;
    
    setStats({
      totalClasses,
      present,
      absent: totalClasses - present,
      attendancePercentage: ((present / totalClasses) * 100).toFixed(1)
    });
  };

  // Filter records by selected month and subject
  const filteredRecords = attendance.filter(record => {
    const date = new Date(record.date);
    const recordMonthYear = `${date.getMonth() + 1}-${date.getFullYear()}`;
    
    const monthMatch = selectedMonth === 'all' || recordMonthYear === selectedMonth;
    const subjectMatch = selectedSubject === 'all' || record.subject === selectedSubject;
    
    return monthMatch && subjectMatch;
  });

  // Update stats when filter changes
  useEffect(() => {
    calculateStats(filteredRecords);
  }, [selectedMonth, selectedSubject, attendance, filteredRecords]);

  // Format date to readable format
  const formatDate = (dateString) => {
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div className="attendance-container">
      <div className="attendance-header">
        <h2>Attendance Record</h2>
        <p>Track your class attendance and performance</p>
      </div>

      {loading ? (
        <div className="attendance-loading">Loading attendance data...</div>
      ) : error ? (
        <div className="attendance-error">{error}</div>
      ) : attendance.length === 0 ? (
        <div className="attendance-empty">
          <p>No attendance records available yet.</p>
          <div className="empty-state-message">
            <p>Your attendance records will appear here once they are marked by your teacher.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="attendance-stats">
            <div className="stat-card">
              <div className="stat-icon">
                <FaChartPie />
              </div>
              <div className="stat-content">
                <h3>Attendance Rate</h3>
                <div className="stat-value">{stats.attendancePercentage}%</div>
                <div className="stat-label">Overall attendance</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">
                <FaCalendarCheck />
              </div>
              <div className="stat-content">
                <h3>Present</h3>
                <div className="stat-value">{stats.present}</div>
                <div className="stat-label">Classes attended</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">
                <FaCalendarTimes />
              </div>
              <div className="stat-content">
                <h3>Absent</h3>
                <div className="stat-value">{stats.absent}</div>
                <div className="stat-label">Classes missed</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">
                <FaCalendarAlt />
              </div>
              <div className="stat-content">
                <h3>Total Classes</h3>
                <div className="stat-value">{stats.totalClasses}</div>
                <div className="stat-label">Classes scheduled</div>
              </div>
            </div>
          </div>

          <div className="attendance-filters">
            <div className="filter-group">
              <label htmlFor="month-filter">Filter by Month:</label>
              <select 
                id="month-filter"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                <option value="all">All Months</option>
                {months.map((month, index) => (
                  <option key={index} value={month.value}>{month.label}</option>
                ))}
              </select>
            </div>
            
            <div className="filter-group">
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
          </div>

          <div className="attendance-table-container">
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record, index) => (
                  <tr key={index} className={record.status === 'present' ? 'present-row' : 'absent-row'}>
                    <td>{formatDate(record.date)}</td>
                    <td>{record.subject}</td>
                    <td>
                      <span className={`status-badge ${record.status}`}>
                        {record.status === 'present' ? (
                          <>
                            <FaCalendarCheck className="status-icon" />
                            Present
                          </>
                        ) : (
                          <>
                            <FaCalendarTimes className="status-icon" />
                            Absent
                          </>
                        )}
                      </span>
                    </td>
                    <td>{record.remarks || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default Attendance; 