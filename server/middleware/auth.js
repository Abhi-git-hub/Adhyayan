const jwt = require('jsonwebtoken');
const config = require('config');

module.exports = function(req, res, next) {
  // Get token from header
  const token = req.header('Authorization');

  // Check if no token
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    // Verify token
    // First check if token starts with "Bearer " and extract actual token
    const tokenValue = token.startsWith('Bearer ') ? token.split(' ')[1] : token;
    
    // Decode token
    const decoded = jwt.verify(tokenValue, config.get('jwtSecret'));

    // Add user from payload to request
    req.user = decoded.user;
    next();
  } catch (err) {
    console.error('Token verification error:', err.message);
    res.status(401).json({ message: 'Token is not valid' });
  }
}; 