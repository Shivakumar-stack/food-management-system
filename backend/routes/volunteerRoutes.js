const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth');
const { updateDonationStatus } = require('../controllers/donationController');

// @route   POST /api/volunteer/accept
// @desc    Accept a donation pickup
// @access  Private (Volunteer)
router.post('/accept', authenticate, authorize('volunteer'), (req, res, next) => {
    // Map to the existing logic in donationController
    req.params.id = req.body.donationId || req.body.donation_id;
    req.body.status = 'claimed';
    updateDonationStatus(req, res, next);
});

module.exports = router;
