const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const session = require('express-session');
const { initWatcher } = require('./utils/file-watcher');

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

// Request parsing with explicit size limits to reduce abuse and accidental oversized payloads.
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

const defaultOrigins = isProduction
  ? [process.env.FRONTEND_URL]
  : ['http://localhost:3000', 'http://localhost:3001'];

const allowedOrigins = new Set(defaultOrigins.filter(Boolean));

app.use(cors({
  origin(origin, callback) {
    // Non-browser/server-to-server requests do not send an Origin header.
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 204
}));

// Security headers without an external middleware dependency.
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

// Session middleware remains for the legacy server-rendered login flow.
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

// Create uploads directory when needed. Uploaded files are served through an authenticated route,
// not as a public static directory.
const uploadsDir = path.join(__dirname, 'uploads');
const notesUploadsDir = path.join(uploadsDir, 'notes');
fs.mkdirSync(notesUploadsDir, { recursive: true });

app.use(express.static(path.join(__dirname, 'public')));

// Serve the existing frontend build when it is present.
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
  res.json({
    message: 'API is working',
    timestamp: new Date().toISOString()
  });
});

const authRoutes = require('./routes/auth');
const teacherRoutes = require('./routes/teachers');
const studentRoutes = require('./routes/students');
const notesRoutes = require('./routes/notes');
const testScoresRoutes = require('./routes/test-scores');
const attendanceRoutes = require('./routes/attendance');

app.use('/api/auth', authRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/test-scores', testScoresRoutes);
app.use('/api/attendance', attendanceRoutes);

// Debug endpoints are development-only and are never exposed in production.
if (!isProduction) {
  const debugRoutes = require('./routes/debug');
  app.use('/api/debug', debugRoutes);
}

app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'API endpoint not found'
  });
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
