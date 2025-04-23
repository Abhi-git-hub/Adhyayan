import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';
import { FaCalendarAlt, FaFilter, FaUserCheck, FaUserTimes, FaUserClock, FaCheck, FaTimes, FaClock } from 'react-icons/fa';
import './Attendance.css';

const Attendance = () => {
  const { user, getAuthHeader } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceData, setAttendanceData] = useState({});
  const [attendanceStats, setAttendanceStats] = useState({
    present: 0,
    absent: 0,
    late: 0,
    unmarked: 0
  });
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [viewMode, setViewMode] = useState('mark'); // 'mark' or 'history'
  const [historyMonth, setHistoryMonth] = useState(new Date().toISOString().slice(0, 7));
  const [historyBatch, setHistoryBatch] = useState('all');
  
  useEffect(() => {
    const loadStudents = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch students in teacher's batches
        const response = await axios.get(`/api/students/by-batches`, {
          params: { batches: user.batches.join(',') },
          headers: getAuthHeader()
        });
        
        setStudents(response.data);
        setFilteredStudents(response.data);
        
        // Initialize attendance data
        const initialAttendance = {};
        response.data.forEach(student => {
          initialAttendance[student._id] = 'unmarked';
        });
        setAttendanceData(initialAttendance);
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading students:', error);
        setError('Failed to load students. Please try again.');
        setLoading(false);
      }
    };
    
    loadStudents();
  }, [user, getAuthHeader]);
  
  useEffect(() => {
    // Filter students based on selected batch
    if (selectedBatch === 'all') {
      setFilteredStudents(students);
    } else {
      setFilteredStudents(students.filter(student => student.batch === selectedBatch));
    }
  }, [selectedBatch, students]);
  
  useEffect(() => {
    // Load attendance when date or batch changes
    const loadAttendance = async () => {
      // Skip if no students loaded yet
      if (filteredStudents.length === 0) return;
      
      try {
        console.log(`Loading attendance for date: ${selectedDate}, batch: ${selectedBatch}`);
        
        const authHeaders = {
          ...getAuthHeader(),
          'Content-Type': 'application/json'
        };
        console.log('Using auth headers:', authHeaders);
        
        const response = await axios.get(`/api/attendance/by-date`, {
          params: { 
            date: selectedDate,
            batches: selectedBatch === 'all' ? user.batches.join(',') : selectedBatch
          },
          headers: authHeaders
        });
        
        console.log('Attendance by-date response:', response.data);
        
        // Map attendance data to student IDs
        const attendanceMap = {};
        filteredStudents.forEach(student => {
          attendanceMap[student._id] = 'unmarked';
        });
        
        // Handle different response formats
        let attendanceRecords = [];
        
        if (response.data && Array.isArray(response.data.records)) {
          // New format with records array
          attendanceRecords = response.data.records;
          console.log('Using records array from response data');
        } else if (Array.isArray(response.data)) {
          // Old format with direct array
          attendanceRecords = response.data;
          console.log('Using direct array response');
        } else if (response.data && typeof response.data === 'object') {
          // Try to find an array in the response
          for (const key in response.data) {
            if (Array.isArray(response.data[key])) {
              attendanceRecords = response.data[key];
              console.log(`Found attendance records in field: ${key}`);
              break;
            }
          }
        }
        
        console.log(`Processing ${attendanceRecords.length} attendance records`);
        
        // Update attendance map with records
        attendanceRecords.forEach(record => {
          if (attendanceMap.hasOwnProperty(record.studentId)) {
            attendanceMap[record.studentId] = record.status;
          }
        });
        
        console.log('Final attendance map has entries for', Object.keys(attendanceMap).length, 'students');
        
        setAttendanceData(attendanceMap);
        updateAttendanceStats(attendanceMap);
      } catch (error) {
        console.error('Error loading attendance data:', error);
        console.error('Error details:', error.response ? error.response.data : 'No response data');
      }
    };
    
    loadAttendance();
  }, [selectedDate, filteredStudents, selectedBatch, user.batches, getAuthHeader]);
  
  useEffect(() => {
    // Load attendance history
    if (viewMode !== 'history') return;
    
    const loadHistory = async () => {
      try {
        setLoading(true);
        
        const response = await axios.get(`/api/attendance/history`, {
          params: { 
            month: historyMonth,
            batches: historyBatch === 'all' ? user.batches.join(',') : historyBatch
          },
          headers: getAuthHeader()
        });
        
        setAttendanceHistory(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error loading attendance history:', error);
        setError('Failed to load attendance history');
        setLoading(false);
      }
    };
    
    loadHistory();
  }, [viewMode, historyMonth, historyBatch, user.batches, getAuthHeader]);
  
  const updateAttendanceStats = (data) => {
    const stats = {
      present: 0,
      absent: 0,
      late: 0,
      unmarked: 0
    };
    
    Object.values(data).forEach(status => {
      stats[status]++;
    });
    
    setAttendanceStats(stats);
  };
  
  const handleAttendanceChange = (studentId, status) => {
    const updatedAttendance = {
      ...attendanceData,
      [studentId]: status
    };
    
    setAttendanceData(updatedAttendance);
    updateAttendanceStats(updatedAttendance);
  };
  
  const handleMarkAll = (status) => {
    const updatedAttendance = { ...attendanceData };
    
    filteredStudents.forEach(student => {
      updatedAttendance[student._id] = status;
    });
    
    setAttendanceData(updatedAttendance);
    updateAttendanceStats(updatedAttendance);
  };
  
  const handleSaveAttendance = async () => {
    try {
      setSavingAttendance(true);
      console.log('Saving attendance for date:', selectedDate);
      
      // Prepare data for API
      const attendanceRecords = Object.entries(attendanceData)
        .filter(([studentId, status]) => status !== 'unmarked')
        .map(([studentId, status]) => {
          // Find the student to get their batch
          const student = filteredStudents.find(s => s._id === studentId);
          return {
            studentId,
            status,
            batch: student ? student.batch : null // Include student's batch
          };
        })
        .filter(record => record.batch !== null); // Remove any records without a batch
      
      if (attendanceRecords.length === 0) {
        alert('No attendance records to save.');
        setSavingAttendance(false);
        return;
      }
      
      console.log('Attendance records to save:', JSON.stringify(attendanceRecords, null, 2));
      
      // Group records by batch to save attendance for each batch
      const recordsByBatch = {};
      attendanceRecords.forEach(record => {
        if (!recordsByBatch[record.batch]) {
          recordsByBatch[record.batch] = [];
        }
        recordsByBatch[record.batch].push({
          studentId: record.studentId,
          status: record.status
        });
      });
      
      // Save attendance for each batch
      const savePromises = Object.entries(recordsByBatch).map(async ([batch, records]) => {
        const requestData = {
          batch: batch,
          date: selectedDate,
          attendanceData: records
        };
        
        console.log(`Saving attendance for batch ${batch}:`, JSON.stringify(requestData, null, 2));
        
        // Log the complete request details including headers
        const authHeaders = getAuthHeader();
        console.log('Request headers:', JSON.stringify(authHeaders, null, 2));
        
        // Make sure Content-Type is explicitly set
        const response = await axios.post(`/api/attendance/mark`, requestData, {
          headers: {
            ...authHeaders,
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`Attendance save response for batch ${batch}:`, response.data);
        return response.data;
      });
      
      const results = await Promise.all(savePromises);
      console.log('All attendance save results:', results);
      
      alert('Attendance saved successfully!');
      
      // Reload the attendance data for the selected date to reflect changes
      const reloadResponse = await axios.get(`/api/attendance/by-date`, {
        params: { 
          date: selectedDate,
          batches: selectedBatch === 'all' ? user.batches.join(',') : selectedBatch
        },
        headers: getAuthHeader()
      });
      
      // Update attendance data with reloaded data
      const attendanceMap = {};
      filteredStudents.forEach(student => {
        attendanceMap[student._id] = 'unmarked';
      });
      
      reloadResponse.data.forEach(record => {
        if (attendanceMap.hasOwnProperty(record.studentId)) {
          attendanceMap[record.studentId] = record.status;
        }
      });
      
      setAttendanceData(attendanceMap);
      updateAttendanceStats(attendanceMap);
      
      setSavingAttendance(false);
    } catch (error) {
      console.error('Error saving attendance:', error);
      console.error('Error details:', error.response ? JSON.stringify(error.response.data) : 'No response data');
      console.error('Error status:', error.response ? error.response.status : 'No status');
      console.error('Error headers:', error.response ? JSON.stringify(error.response.headers) : 'No headers');
      console.error('Error config:', error.config ? JSON.stringify({
        url: error.config.url,
        method: error.config.method,
        data: error.config.data,
        headers: error.config.headers
      }) : 'No config');
      
      alert('Failed to save attendance. Please try again.');
      setSavingAttendance(false);
    }
  };
  
  const getStatusIcon = (status) => {
    switch (status) {
      case 'present':
        return <FaUserCheck className="status-icon present" />;
      case 'absent':
        return <FaUserTimes className="status-icon absent" />;
      case 'late':
        return <FaUserClock className="status-icon late" />;
      default:
        return null;
    }
  };
  
  const formatDate = (dateString) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };
  
  if (loading) {
    return (
      <div className="attendance-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading attendance data...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="attendance-container">
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
    <div className="attendance-container">
      <div className="attendance-header">
        <div>
          <h2>Attendance Management</h2>
          <p>Mark and track student attendance</p>
        </div>
        <div className="view-mode-toggle">
          <button 
            className={viewMode === 'mark' ? 'active' : ''}
            onClick={() => setViewMode('mark')}
          >
            Mark Attendance
          </button>
          <button 
            className={viewMode === 'history' ? 'active' : ''}
            onClick={() => setViewMode('history')}
          >
            View History
          </button>
        </div>
      </div>
      
      {viewMode === 'mark' ? (
        <>
          <div className="attendance-filters">
            <div className="date-picker">
              <FaCalendarAlt />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
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
          
          <div className="attendance-stats">
            <div className="stat-card">
              <div className="stat-icon present">
                <FaUserCheck />
              </div>
              <div className="stat-content">
                <h3>{attendanceStats.present}</h3>
                <p>Present</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon absent">
                <FaUserTimes />
              </div>
              <div className="stat-content">
                <h3>{attendanceStats.absent}</h3>
                <p>Absent</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon late">
                <FaUserClock />
              </div>
              <div className="stat-content">
                <h3>{attendanceStats.late}</h3>
                <p>Late</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon unmarked">
                <FaCalendarAlt />
              </div>
              <div className="stat-content">
                <h3>{attendanceStats.unmarked}</h3>
                <p>Unmarked</p>
              </div>
            </div>
          </div>
          
          <div className="attendance-actions">
            <div className="mark-all-buttons">
              <button 
                className="mark-all-present"
                onClick={() => handleMarkAll('present')}
              >
                <FaCheck /> Mark All Present
              </button>
              <button 
                className="mark-all-absent"
                onClick={() => handleMarkAll('absent')}
              >
                <FaTimes /> Mark All Absent
              </button>
            </div>
            
            <button 
              className="save-attendance-button"
              onClick={handleSaveAttendance}
              disabled={savingAttendance}
            >
              {savingAttendance ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
          
          <div className="attendance-date-display">
            <FaCalendarAlt />
            <h3>{formatDate(selectedDate)}</h3>
          </div>
          
          {filteredStudents.length > 0 ? (
            <div className="attendance-table-container">
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Class</th>
                    <th>Batch</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map(student => (
                    <tr key={student._id}>
                      <td className="student-name-cell">
                        {getStatusIcon(attendanceData[student._id])}
                        <span>{student.name}</span>
                      </td>
                      <td>{student.class}</td>
                      <td>{student.batch}</td>
                      <td>
                        <span className={`status-badge ${attendanceData[student._id]}`}>
                          {attendanceData[student._id].charAt(0).toUpperCase() + attendanceData[student._id].slice(1)}
                        </span>
                      </td>
                      <td>
                        <div className="attendance-buttons">
                          <button 
                            className={`present-button ${attendanceData[student._id] === 'present' ? 'active' : ''}`}
                            onClick={() => handleAttendanceChange(student._id, 'present')}
                            title="Mark Present"
                          >
                            <FaCheck />
                          </button>
                          <button 
                            className={`absent-button ${attendanceData[student._id] === 'absent' ? 'active' : ''}`}
                            onClick={() => handleAttendanceChange(student._id, 'absent')}
                            title="Mark Absent"
                          >
                            <FaTimes />
                          </button>
                          <button 
                            className={`late-button ${attendanceData[student._id] === 'late' ? 'active' : ''}`}
                            onClick={() => handleAttendanceChange(student._id, 'late')}
                            title="Mark Late"
                          >
                            <FaClock />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="no-students">
              <p>No students found in the selected batch.</p>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="attendance-history-filters">
            <div className="month-picker">
              <FaCalendarAlt />
              <input
                type="month"
                value={historyMonth}
                onChange={(e) => setHistoryMonth(e.target.value)}
              />
            </div>
            
            <div className="filter-box">
              <FaFilter />
              <select
                value={historyBatch}
                onChange={(e) => setHistoryBatch(e.target.value)}
              >
                <option value="all">All Batches</option>
                {user.batches.map((batch, index) => (
                  <option key={index} value={batch}>{batch}</option>
                ))}
              </select>
            </div>
          </div>
          
          {attendanceHistory.length > 0 ? (
            <div className="attendance-history-table-container">
              <table className="attendance-history-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Student</th>
                    <th>Class</th>
                    <th>Batch</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceHistory.map((record, index) => (
                    <tr key={index}>
                      <td>{new Date(record.date).toLocaleDateString()}</td>
                      <td>{record.studentName}</td>
                      <td>{record.studentClass}</td>
                      <td>{record.batch}</td>
                      <td>
                        <span className={`status-badge ${record.status}`}>
                          {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="no-history">
              <p>No attendance records found for the selected month and batch.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Attendance; 