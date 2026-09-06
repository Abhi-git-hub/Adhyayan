const jwt = require('jsonwebtoken');

const JWT_ISSUER = 'adhyayan-api';
const JWT_AUDIENCE = 'adhyayan-client';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters');
  }
  return secret;
}

function extractBearerToken(req) {
  const header = req.get('authorization');
  if (!header) return null;

  const [scheme, token] = header.trim().split(/\s+/);
  if (scheme !== 'Bearer' || !token) return null;

  return token;
}

exports.auth = (req, res, next) => {
  try {
    const token = extractBearerToken(req);

    if (!token) {
      return res.status(401).json({
        message: 'Authentication required',
        error: 'missing_token'
      });
    }

    const decoded = jwt.verify(token, getJwtSecret(), {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      clockTolerance: 5
    });

    if (!decoded || typeof decoded !== 'object' || !decoded.id || !decoded.role) {
      return res.status(401).json({
        message: 'Invalid authentication token',
        error: 'invalid_token'
      });
    }

    if (!['student', 'teacher'].includes(decoded.role)) {
      return res.status(403).json({
        message: 'Unsupported user role',
        error: 'invalid_role'
      });
    }

    req.user = {
      id: String(decoded.id),
      name: decoded.name || '',
      role: decoded.role,
      batch: decoded.batch,
      batches: Array.isArray(decoded.batches) ? decoded.batches : []
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Authentication token has expired',
        error: 'token_expired'
      });
    }

    if (error.name === 'JsonWebTokenError' || error.name === 'NotBeforeError') {
      return res.status(401).json({
        message: 'Invalid authentication token',
        error: 'invalid_token'
      });
    }

    console.error('Authentication middleware error:', error.message);
    return res.status(500).json({ message: 'Authentication service unavailable' });
  }
};

exports.isTeacher = (req, res, next) => {
  if (req.user?.role !== 'teacher') {
    return res.status(403).json({
      message: 'Teacher access required',
      error: 'forbidden'
    });
  }
  next();
};

exports.isStudent = (req, res, next) => {
  if (req.user?.role !== 'student') {
    return res.status(403).json({
      message: 'Student access required',
      error: 'forbidden'
    });
  }
  next();
};

exports.JWT_ISSUER = JWT_ISSUER;
exports.JWT_AUDIENCE = JWT_AUDIENCE;
