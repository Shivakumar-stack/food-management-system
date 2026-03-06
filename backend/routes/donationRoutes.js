const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth');

const {
  createDonation,
  getDonations,
  getDonationById,
  getPublicMapDonations,
  getDonationStats,
  getWeeklyTrends,
  updateDonationStatus,
  getAvailableDonationsForVolunteer,
  getAvailableDonationsForNgo,
  claimDonation,
  getAdminStats
} = require('../controllers/donationController');

const donationValidation = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one food item is required'),
  body('items.*.itemName')
    .trim()
    .notEmpty()
    .withMessage('Food item name is required'),
  body('items.*.category')
    .isIn([
      'Cooked Food',
      'Raw Ingredients',
      'Packaged',
      'Baked Goods',
      'Beverages',
      'Dairy',
      'Fruits',
      'Vegetables',
      'Other'
    ])
    .withMessage('Invalid food category'),
  body('items.*.quantity')
    .trim()
    .notEmpty()
    .withMessage('Quantity is required'),
  body('items.*.unit')
    .trim()
    .notEmpty()
    .withMessage('Unit is required'),
  body('address')
    .trim()
    .notEmpty()
    .withMessage('Street address is required'),
  body('city')
    .trim()
    .notEmpty()
    .withMessage('City is required'),
  body('state')
    .trim()
    .notEmpty()
    .withMessage('State is required'),
  body('zip')
    .trim()
    .notEmpty()
    .withMessage('ZIP Code is required'),
  body('pickup_datetime')
    .notEmpty()
    .isISO8601()
    .withMessage('Invalid pickup time format'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical', 'Fast Track (+2h)', 'Priority (+4h)', 'Tomorrow Morning'])
    .withMessage('Invalid priority level'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

router.post('/', authenticate, authorize('donor', 'admin'), donationValidation, createDonation);
router.get('/', authenticate, getDonations);
router.get('/public-map', getPublicMapDonations);
router.get('/stats/overview', authenticate, getDonationStats);
router.get('/stats/weekly', authenticate, getWeeklyTrends);
router.get('/stats/admin', authenticate, authorize('admin'), getAdminStats);
router.put('/:id/status', authenticate, authorize('donor', 'volunteer', 'ngo', 'admin'), updateDonationStatus);
router.get('/volunteer/available', authenticate, authorize('volunteer'), getAvailableDonationsForVolunteer);
router.get('/ngo/available', authenticate, authorize('ngo'), getAvailableDonationsForNgo);
router.get('/:id', authenticate, getDonationById);
router.put('/:id/claim', authenticate, authorize('ngo'), claimDonation);

module.exports = router;
