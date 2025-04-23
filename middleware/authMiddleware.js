// Check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  res.redirect('/login');
};

// Check if user is a teacher
const isTeacher = (req, res, next) => {
  if (req.session.user && req.session.user.role === 'teacher') {
    req.user = req.session.user;
    return next();
  }
  res.status(403).render('error', { message: 'Access denied. Teachers only.' });
};

// Check if user is a student
const isStudent = (req, res, next) => {
  if (req.session.user && req.session.user.role === 'student') {
    req.user = req.session.user;
    return next();
  }
  res.status(403).render('error', { message: 'Access denied. Students only.' });
};

module.exports = {
  isAuthenticated,
  isTeacher,
  isStudent
}; 