const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const session = require('express-session');
const { initWatcher } = require('./utils/file-watcher');
const Student = require('./models/Student');
const Teacher = require('./models/Teacher');
const Note = require('./models/Note');
const { auth, isTeacher, isStudent } = require('./middleware/auth');

dotenv.config();

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

function validateEnvironment() {
  if (!isProduction) return;

  const required = ['MONGODB_URI', 'JWT_SECRET', 'SESSION_SECRET', 'FRONTEND_URL'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length) {
    throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
  }

  if (process.env.JWT_SECRET.length < 32 || process.env.SESSION_SECRET.length < 32) {
    throw new Error('JWT_SECRET and SESSION_SECRET must each be at least 32 characters long');
  }
}

validateEnvironment();

if (isProduction) {
  app.set('trust proxy', 1);
}

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

const allowedOrigins = new Set(
  (isProduction ? [process.env.FRONTEND_URL] : ['http://localhost:3000', 'http://localhost:3001'])
    .filter(Boolean)
);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 204
}));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
      "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
      "img-src 'self' data: https: blob:",
      "font-src 'self' https://cdnjs.cloudflare.com data:",
      "connect-src 'self' https:",
      "frame-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'"
    ].join('; ')
  );
  if (isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Session middleware is retained for the legacy server-rendered login flow.
app.use(session({
  name: 'adhyayan.sid',
  secret: process.env.SESSION_SECRET || 'dev-only-session-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const uploadsDir = path.join(__dirname, 'uploads');
const notesUploadsDir = path.join(uploadsDir, 'notes');
fs.mkdirSync(notesUploadsDir, { recursive: true });

app.use(express.static(path.join(__dirname, 'public')));

const buildPath = path.join(__dirname, 'build');
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
}

async function connectDatabase() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/adhyayan';
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    retryWrites: true,
    w: 'majority'
  });
  console.log('MongoDB connection established');
}

mongoose.connection.on('error', (error) => {
  console.error('MongoDB connection error:', error.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB connection disconnected');
});

app.get('/api/health', (req, res) => {
  const dbStatus = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  }[mongoose.connection.readyState] || 'unknown';

  const healthy = mongoose.connection.readyState === 1;
  return res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    server: 'running',
    database: dbStatus,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working', timestamp: new Date().toISOString() });
});

// Uploaded notes are private application data. Access is checked before the file is sent.
app.get('/uploads/notes/:filename', auth, async (req, res, next) => {
  try {
    const filename = path.basename(req.params.filename);
    const relativeUrl = `/uploads/notes/${filename}`;
    const note = await Note.findOne({ fileUrl: relativeUrl }).select('author targetBatches title fileUrl');

    if (!note) return res.status(404).json({ message: 'File not found' });

    if (req.user.role === 'teacher') {
      if (String(note.author) !== req.user.id) {
        return res.status(403).json({ message: 'You do not have access to this note' });
      }
    } else if (req.user.role === 'student') {
      const student = await Student.findById(req.user.id).select('batch');
      if (!student || !note.targetBatches.includes(student.batch)) {
        return res.status(403).json({ message: 'You do not have access to this note' });
      }
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }

    const filePath = path.join(notesUploadsDir, filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File not found' });

    return res.sendFile(filePath);
  } catch (error) {
    return next(error);
  }
});

const authRoutes = require('./routes/auth');
const teacherRoutes = require('./routes/teachers');
const studentRoutes = require('./routes/students');
const notesRoutes = require('./routes/notes');
const testScoresRoutes = require('./routes/test-scores');
const attendanceRoutes = require('./routes/attendance');

app.use('/api/auth', authRoutes);

// The legacy teacher router declares /:id before several named routes. These explicit
// application-level routes guarantee the intended dashboard endpoints are reachable.
app.get('/api/teachers', auth, isTeacher, async (req, res, next) => {
  try {
    const teachers = await Teacher.find().select('-password').sort({ name: 1 });
    return res.json(teachers);
  } catch (error) {
    return next(error);
  }
});

app.get('/api/teachers/me', auth, isTeacher, async (req, res, next) => {
  try {
    const teacher = await Teacher.findById(req.user.id).select('-password');
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
    return res.json(teacher);
  } catch (error) {
    return next(error);
  }
});

app.get('/api/teachers/profile', auth, isTeacher, async (req, res, next) => {
  try {
    const teacher = await Teacher.findById(req.user.id).select('-password');
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
    return res.json(teacher);
  } catch (error) {
    return next(error);
  }
});

app.get('/api/teachers/students', auth, isTeacher, async (req, res, next) => {
  try {
    const teacher = await Teacher.findById(req.user.id).select('batches');
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

    const students = await Student.find({ batch: { $in: teacher.batches || [] } })
      .select('name username class batch phoneNumber dateOfAdmission')
      .sort({ name: 1 });

    return res.json(students);
  } catch (error) {
    return next(error);
  }
});

app.get('/api/teachers/batches', auth, isTeacher, async (req, res, next) => {
  try {
    const teacher = await Teacher.findById(req.user.id).select('batches subjects');
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

    const batches = await Promise.all((teacher.batches || []).map(async (batch) => ({
      _id: batch,
      name: batch,
      studentCount: await Student.countDocuments({ batch })
    })));

    return res.json(batches);
  } catch (error) {
    return next(error);
  }
});

// All remaining teacher endpoints require teacher authentication.
app.use('/api/teachers', auth, isTeacher, teacherRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/test-scores', testScoresRoutes);
app.use('/api/attendance', attendanceRoutes);

if (!isProduction) {
  const debugRoutes = require('./routes/debug');
  app.use('/api/debug', debugRoutes);
}

app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Not Found', message: 'API endpoint not found' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled request error:', err.message);

  if (res.headersSent) return next(err);
  if (err.message === 'Origin is not allowed by CORS') {
    return res.status(403).json({ message: 'Origin is not allowed' });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ message: 'Uploaded file exceeds the size limit' });
  }
  if (err.name === 'MulterError') {
    return res.status(400).json({ message: 'Invalid file upload request' });
  }

  return res.status(500).json({ message: 'Internal server error' });
});

if (isProduction && fs.existsSync(path.join(buildPath, 'index.html'))) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

const PORT = Number(process.env.PORT) || 3001;

async function startServer() {
  try {
    await connectDatabase();
    initWatcher();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Adhyayan API listening on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await mongoose.connection.close();
  process.exit(0);
});

if (require.main === module) {
  startServer();
}

module.exports = app;
