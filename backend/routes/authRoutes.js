const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const {
  register,
  login,
  socialAuth,
  getProfile,
  updateProfile,
  changePassword,
  getDashboard,
  logout
} = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');

// Validation rules
const registerValidation = [
  body('firstName')
    .trim()
    .notEmpty().withMessage('First name is required')
    .isLength({ max: 50 }).withMessage('First name cannot exceed 50 characters'),
  body('lastName')
    .trim()
    .notEmpty().withMessage('Last name is required')
    .isLength({ max: 50 }).withMessage('Last name cannot exceed 50 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role')
    .notEmpty().withMessage('Role is required')
    .isIn(['donor', 'volunteer', 'ngo']).withMessage('Invalid role specified'),
  body('phone')
    .optional()
    .trim()
    .matches(/^\+?[\d\s-()]+$/).withMessage('Please enter a valid phone number')
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

const socialAuthValidation = [
  body('provider')
    .trim()
    .notEmpty().withMessage('Provider is required')
    .isIn(['google', 'facebook', 'apple']).withMessage('Unsupported social auth provider'),
  body('intent')
    .optional()
    .isIn(['login', 'signup']).withMessage('Invalid intent'),
  body('role')
    .optional()
    .isIn(['donor', 'volunteer', 'ngo']).withMessage('Invalid role specified'),
  body('profile.email')
    .optional({ nullable: true, checkFalsy: true })
    .isEmail().withMessage('Please enter a valid email')
];

const updateProfileValidation = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('First name cannot exceed 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Last name cannot exceed 50 characters'),
  body('phone')
    .optional()
    .trim()
    .matches(/^\+?[\d\s-()]+$/).withMessage('Please enter a valid phone number'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Bio cannot exceed 500 characters')
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
];

// Public routes
router.post('/register', registerValidation, register);
router.post('/signup', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/social', socialAuthValidation, socialAuth);

// Protected routes
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfileValidation, updateProfile);
router.put('/change-password', authenticate, changePasswordValidation, changePassword);
router.get('/dashboard', authenticate, getDashboard);
router.post('/logout', authenticate, logout);

// Admin only routes
router.get('/admin/users', authenticate, authorize('admin'), async (req, res) => {
  const User = require('../models/User');
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({
      success: true,
      count: users.length,
      data: { users }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
