const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');

const {
  createDonation,
  getDonations,
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
  body('foodItems')
    .isArray({ min: 1 })
    .withMessage('At least one food item is required'),
  body('foodItems.*.name')
    .trim()
    .notEmpty()
    .withMessage('Food item name is required'),
  body('foodItems.*.category')
    .isIn([
      'cooked',
      'raw',
      'packaged',
      'baked',
      'beverages',
      'dairy',
      'fruits',
      'vegetables',
      'other'
    ])
    .withMessage('Invalid food category'),
  body('foodItems.*.quantity')
    .trim()
    .notEmpty()
    .withMessage('Quantity is required'),
  body('pickupAddress.street')
    .trim()
    .notEmpty()
    .withMessage('Street address is required'),
  body('pickupAddress.city')
    .trim()
    .notEmpty()
    .withMessage('City is required'),
  body('pickupAddress.state')
    .trim()
    .notEmpty()
    .withMessage('State is required'),
  body('pickupAddress.zipCode')
    .trim()
    .notEmpty()
    .withMessage('ZIP Code is required'),
  body('pickupTime')
    .notEmpty()
    .isISO8601()
    .withMessage('Invalid pickup time format')
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
router.put('/:id/claim', authenticate, authorize('ngo'), claimDonation);

module.exports = router;
