const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const jwt = require('jsonwebtoken');
const { auth, isTeacher, isStudent, JWT_ISSUER, JWT_AUDIENCE } = require('../middleware/auth');

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 10;
const loginAttempts = new Map();

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters');
  }
  return secret;
}

function getClientKey(req) {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function checkLoginRateLimit(req, res) {
  const key = getClientKey(req);
  const now = Date.now();
  const current = loginAttempts.get(key);

  if (!current || now - current.windowStart >= LOGIN_WINDOW_MS) {
    loginAttempts.set(key, { count: 1, windowStart: now });
    return true;
  }

  current.count += 1;
  if (current.count > MAX_LOGIN_ATTEMPTS) {
    const retryAfter = Math.ceil((LOGIN_WINDOW_MS - (now - current.windowStart)) / 1000);
    res.set('Retry-After', String(retryAfter));
    res.status(429).json({ message: 'Too many login attempts. Try again later.', error: 'rate_limited' });
    return false;
  }

  return true;
}

function validateCredentials(username, password) {
  if (typeof username !== 'string' || typeof password !== 'string') return false;
  if (username.trim().length < 3 || username.trim().length > 32) return false;
  if (password.length < 8 || password.length > 256) return false;
  return true;
}

function signUserToken(user, role) {
  const payload = {
    id: String(user._id),
    name: user.name,
    role
  };

  if (role === 'student') {
    payload.batch = user.batch;
  } else {
    payload.batches = Array.isArray(user.batches) ? user.batches : [];
  }

  return jwt.sign(payload, getJwtSecret(), {
    algorithm: 'HS256',
    expiresIn: '1d',
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE
  });
}

async function authenticateUser(Model, username, password) {
  const normalizedUsername = username.trim().toLowerCase();
  const user = await Model.findOne({ username: normalizedUsername });

  if (!user) return null;

  const isHash = /^\$2[aby]\$\d{2}\$/.test(user.password);
  let isMatch = false;

  if (isHash) {
    isMatch = await user.comparePassword(password);
  } else {
    // One-time migration for legacy plaintext passwords.
    isMatch = user.password === password;
    if (isMatch) {
      user.password = password;
      await user.save();
    }
  }

  return isMatch ? user : null;
}

// Legacy browser login page.
router.get('/login', (req, res) => {
  res.render('login', { title: 'Login' });
});

router.post('/student-login', async (req, res) => {
  try {
    if (!checkLoginRateLimit(req, res)) return;

    const { username, password } = req.body;
    if (!validateCredentials(username, password)) {
      return res.status(400).json({ message: 'Invalid username or password format' });
    }

    const student = await authenticateUser(Student, username, password);
    if (!student) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signUserToken(student, 'student');
    return res.json({
      success: true,
      token,
      student: {
        id: student._id,
        name: student.name,
        username: student.username,
        class: student.class,
        batch: student.batch,
        phoneNumber: student.phoneNumber
      }
    });
  } catch (error) {
    console.error('Student login error:', error.message);
    return res.status(500).json({ message: 'Unable to complete login' });
  }
});

router.post('/teacher-login', async (req, res) => {
  try {
    if (!checkLoginRateLimit(req, res)) return;

    const { username, password } = req.body;
    if (!validateCredentials(username, password)) {
      return res.status(400).json({ message: 'Invalid username or password format' });
    }

    const teacher = await authenticateUser(Teacher, username, password);
    if (!teacher) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signUserToken(teacher, 'teacher');
    return res.json({
      success: true,
      token,
      teacher: {
        id: teacher._id,
        name: teacher.name,
        username: teacher.username,
        subjects: teacher.subjects,
        batches: teacher.batches,
        phoneNumber: teacher.phoneNumber,
        email: teacher.email
      }
    });
  } catch (error) {
    console.error('Teacher login error:', error.message);
    return res.status(500).json({ message: 'Unable to complete login' });
  }
});

// Legacy session login used by the server-rendered login page.
router.post('/login', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!['student', 'teacher'].includes(role) || !validateCredentials(username, password)) {
      return res.status(400).render('login', { title: 'Login', error: 'Invalid login details' });
    }

    const Model = role === 'student' ? Student : Teacher;
    const user = await authenticateUser(Model, username, password);

    if (!user) {
      return res.status(401).render('login', { title: 'Login', error: 'Invalid credentials' });
    }

    req.session.user = {
      id: String(user._id),
      name: user.name,
      username: user.username,
      role
    };

    return res.redirect(role === 'student' ? '/student/dashboard' : '/teacher/dashboard');
  } catch (error) {
    console.error('Session login error:', error.message);
    return res.status(500).render('login', { title: 'Login', error: 'Unable to complete login' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      console.error('Session logout error:', error.message);
      return res.status(500).json({ message: 'Unable to logout' });
    }
    res.clearCookie('connect.sid');
    return res.json({ success: true });
  });
});

router.get('/', (req, res) => {
  if (req.session.user?.role === 'student') return res.redirect('/student/dashboard');
  if (req.session.user?.role === 'teacher') return res.redirect('/teacher/dashboard');
  return res.redirect('/login');
});

router.get('/teacher', auth, isTeacher, async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user.id).select('-password');
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
    return res.json(teacher);
  } catch (error) {
    console.error('Error fetching teacher profile:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.put('/teacher/update', auth, isTeacher, async (req, res) => {
  try {
    const { name, email, phoneNumber } = req.body;
    const updateFields = {};

    if (typeof name === 'string' && name.trim()) updateFields.name = name.trim();
    if (typeof email === 'string' && email.trim()) updateFields.email = email.trim().toLowerCase();
    if (typeof phoneNumber === 'string' && phoneNumber.trim()) updateFields.phoneNumber = phoneNumber.trim();

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ message: 'No valid fields supplied' });
    }

    const teacher = await Teacher.findByIdAndUpdate(
      req.user.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-password');

    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
    return res.json(teacher);
  } catch (error) {
    console.error('Error updating teacher profile:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters' });
    }

    const Model = req.user.role === 'teacher' ? Teacher : Student;
    const user = await Model.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const currentValid = await user.comparePassword(currentPassword);
    if (!currentValid) return res.status(401).json({ message: 'Current password is incorrect' });

    user.password = newPassword;
    await user.save();

    return res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error changing password:', error.message);
    return res.status(500).json({ message: 'Unable to change password' });
  }
});

router.get('/student', auth, isStudent, async (req, res) => {
  try {
    const student = await Student.findById(req.user.id).select('-password');
    if (!student) return res.status(404).json({ message: 'Student not found' });
    return res.json(student);
  } catch (error) {
    console.error('Error fetching student profile:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.put('/student/update', auth, isStudent, async (req, res) => {
  try {
    const { phone, address, emergencyContact } = req.body;
    const updateFields = {};

    if (typeof phone === 'string' && phone.trim()) updateFields.phoneNumber = phone.trim();
    if (typeof address === 'string' && address.trim()) updateFields.address = address.trim();
    if (typeof emergencyContact === 'string' && emergencyContact.trim()) updateFields.emergencyContact = emergencyContact.trim();

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ message: 'No valid fields supplied' });
    }

    const student = await Student.findByIdAndUpdate(
      req.user.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-password');

    if (!student) return res.status(404).json({ message: 'Student not found' });
    return res.json(student);
  } catch (error) {
    console.error('Error updating student profile:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
