import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './components/auth/Login';
import PrivateRoute from './components/common/PrivateRoute';
import Debug from './pages/Debug';

// Student components
import StudentDashboard from './components/student/Dashboard';
import StudentNotes from './components/student/Notes';
import StudentAttendance from './components/student/Attendance';
import StudentTestScores from './components/student/TestScores';
import StudentHome from './components/student/Home';
import StudentProfile from './components/student/Profile';

// Teacher components
import TeacherDashboard from './components/teacher/Dashboard';
import TeacherNotes from './components/teacher/Notes';
import TeacherAttendance from './components/teacher/Attendance';
import TeacherStudents from './components/teacher/Students';
import TeacherTestScores from './components/teacher/TestScores';
import TeacherProfile from './components/teacher/Profile';
import TeacherHome from './components/teacher/Home';

const App = () => {
  console.log('App component rendering, React version:', React.version);
  
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/debug" element={<Debug />} />
          
          {/* Student Routes */}
          <Route path="/student-dashboard/*" element={
            <PrivateRoute allowedRoles={['student']}>
              <StudentDashboard />
            </PrivateRoute>
          } />
          
          {/* Teacher Routes */}
          <Route path="/teacher-dashboard/*" element={
            <PrivateRoute allowedRoles={['teacher']}>
              <TeacherDashboard />
            </PrivateRoute>
          } />
          
          {/* Catch All */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
