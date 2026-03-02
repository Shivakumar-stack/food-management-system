const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');

const {
  submitContactForm,
  subscribeToNewsletter,
  getAllContactSubmissions,
  getContactById,
  respondToContactSubmission,
  resolveComplaint
} = require('../controllers/contactController');

const contactValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail(),
  body('subject')
    .trim()
    .notEmpty().withMessage('Subject is required')
    .isLength({ max: 200 }).withMessage('Subject cannot exceed 200 characters'),
  body('message')
    .trim()
    .notEmpty().withMessage('Message is required')
    .isLength({ max: 2000 }).withMessage('Message cannot exceed 2000 characters'),
  body('type')
    .optional()
    .isIn(['general', 'complaint', 'feedback', 'partnership', 'volunteer_inquiry', 'donation_inquiry'])
    .withMessage('Invalid contact type')
];

const newsletterValidation = [
    body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail()
];

const respondValidation = [
    body('message')
    .trim()
    .notEmpty().withMessage('Response message is required')
];

const resolveValidation = [
    body('resolution')
    .trim()
    .notEmpty().withMessage('Resolution details are required')
];

router.post('/', contactValidation, submitContactForm);
router.post('/newsletter', newsletterValidation, subscribeToNewsletter);
router.get('/', authenticate, authorize('admin'), getAllContactSubmissions);
router.get('/:id', authenticate, authorize('admin'), getContactById);
router.put('/:id/respond', authenticate, authorize('admin'), respondValidation, respondToContactSubmission);
router.put('/:id/resolve', authenticate, authorize('admin'), resolveValidation, resolveComplaint);

module.exports = router;