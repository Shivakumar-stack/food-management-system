const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../config/logger');
const { AppError } = require('./errorHandler');

const authenticate = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return next(new AppError('Access denied. No token provided.', 401));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return next(new AppError('User not found. Token may be invalid.', 401));
      }

      if (user.status !== 'active') {
        return next(new AppError('Account is not active. Please contact support.', 403));
      }

      req.user = user;
      next();
    } catch (jwtError) {
      logger.warn(`JWT verification failed: ${jwtError.message}`);
      return next(new AppError('Invalid token. Please log in again.', 401));
    }
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return next(new AppError('Server error during authentication', 500));
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError(`Access denied. Required role: ${roles.join(' or ')}`, 403));
    }

    next();
  };
};

const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        if (user && user.status === 'active') {
          req.user = user;
        }
      } catch (error) {
        // Invalid token, continue without user
        logger.debug(`Optional auth failed: ${error.message}`);
      }
    }

    next();
  } catch (error) {
    next();
  }
};

const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    logger.error('JWT_SECRET is not defined in environment variables');
    throw new AppError('JWT configuration error', 500);
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

module.exports = {
  authenticate,
  authorize,
  optionalAuth,
  generateToken
};
