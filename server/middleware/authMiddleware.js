const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Member = require('../models/Member');
const mockDb = require('../services/mockDbService');

const JWT_SECRET = process.env.JWT_SECRET || 'library_secret_key_university_2026';

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);

      if (mongoose.connection.readyState === 1) {
        req.user = await Member.findById(decoded.id).select('-password');
      } else {
        req.user = mockDb.getMemberById(decoded.id);
      }

      if (!req.user) {
        return res.status(401).json({ success: false, message: 'User not found.' });
      }
      return next();
    } catch (error) {
      console.error('[AuthMiddleware] Token verification failed:', error.message);
      return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }
  }

  // Allow optional token or reject if route strictly requires it
  if (!token) {
    return res.status(401).json({ success: false, message: 'Authorization token required.' });
  }
};

// Role-based authorization gate
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to [${roles.join(', ')}] role(s).`,
      });
    }
    next();
  };
};

module.exports = { protect, authorizeRoles, JWT_SECRET };
