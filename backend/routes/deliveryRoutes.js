const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth');
const { updatePickupStatus } = require('../controllers/pickupController');

// @route   POST /api/delivery/complete
// @desc    Complete a delivery
// @access  Private (Volunteer)
router.post('/complete', authenticate, authorize('volunteer'), (req, res, next) => {
    // Map to the existing logic in pickupController
    req.params.id = req.body.pickupId || req.body.pickup_id;
    req.body.status = 'completed';
    updatePickupStatus(req, res, next);
});

module.exports = router;
