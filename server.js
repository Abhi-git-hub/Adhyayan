const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const session = require('express-session');
const { initWatcher } = require('./utils/file-watcher');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://adhyayan-website.vercel.app', 'https://adhyayan-website.onrender.com', process.env.FRONTEND_URL] 
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add Content Security Policy headers
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; " +
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; " +
    "img-src 'self' data: https: blob:; " +
    "font-src 'self' https://cdnjs.cloudflare.com data:; " +
    "connect-src 'self' http://localhost:3001 http://localhost:3000 ws://localhost:3001 ws://localhost:3000; " +
    "frame-src 'self'; " +
    "object-src 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self';"
  );
  next();
});

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
const notesUploadsDir = path.join(uploadsDir, 'notes');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory');
}
if (!fs.existsSync(notesUploadsDir)) {
  fs.mkdirSync(notesUploadsDir, { recursive: true });
  console.log('Created notes uploads directory');
}

// Serve uploads directory statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'adhyayanclassessecret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 } // 1 day
}));

// Set view engine for EJS templates
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files from the public directory
app.use(express.static('public'));
// Also serve media files from client/public for development
app.use(express.static(path.join(__dirname, 'client/public')));

// Serve React app build files if they exist
const buildPath = path.join(__dirname, 'client/build');
const buildExists = fs.existsSync(buildPath);
console.log('Build directory exists:', buildExists);

if (buildExists) {
  app.use(express.static(buildPath));
}

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/adhyayan', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  retryWrites: true,
  w: 'majority',
  dbName: 'adhyayan'
})
  .then(() => {
    console.log('Connected to MongoDB Atlas');
    // Initialize file watcher after DB connection
    initWatcher();
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Add MongoDB connection event handlers
mongoose.connection.on('connected', () => {
  console.log('MongoDB connection established successfully');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB connection disconnected');
});

// Handle application termination
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed due to app termination');
  process.exit(0);
});

// Add a test route
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API is working', 
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Add a health check route
app.get('/api/health', (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState;
    const dbStatusText = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    }[dbStatus] || 'unknown';
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      server: 'running',
      database: {
        status: dbStatusText,
        statusCode: dbStatus
      },
      uptime: process.uptime()
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Import routes
const authRoutes = require('./routes/auth');
const teacherRoutes = require('./routes/teachers');
const studentRoutes = require('./routes/students');
const notesRoutes = require('./routes/notes');
const testScoresRoutes = require('./routes/test-scores');
const attendanceRoutes = require('./routes/attendance');
const debugRoutes = require('./routes/debug');

// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/test-scores', testScoresRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/debug', debugRoutes);
console.log('Loaded API routes');

// Add a global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler caught:', err);
  console.error('Error stack:', err.stack);
  console.error('Request path:', req.path);
  console.error('Request method:', req.method);
  console.error('Request headers:', req.headers);
  
  res.status(500).json({
    error: 'Server error',
    message: err.message || 'An unexpected error occurred',
    path: req.path,
    method: req.method
  });
});

// Add a catch-all route for API 404s
app.use('/api/*', (req, res) => {
  console.log('API route not found:', req.originalUrl);
  res.status(404).json({
    error: 'Not Found',
    message: `API endpoint not found: ${req.originalUrl}`,
    availableEndpoints: [
      '/api/auth/*',
      '/api/teachers/*',
      '/api/students/*',
      '/api/notes/*',
      '/api/test-scores/*',
      '/api/attendance/*',
      '/api/debug/*'
    ]
  });
});

// Handle any other requests with our React app in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build/index.html'));
  });
}

// Setup server port
const PORT = process.env.PORT || 3001;

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`MongoDB connection: ${process.env.MONGODB_URI ? 'Atlas' : 'Local'}`);
});

module.exports = app; 