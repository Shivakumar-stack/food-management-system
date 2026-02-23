const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
    assignVolunteerToPickup,
    updatePickupStatus,
    getMyPickups,
    getAllPickups
} = require('../controllers/pickupController');

// Routes for pickups
router.put('/:id/assign', authenticate, authorize('admin'), assignVolunteerToPickup);
router.put('/:id/status', authenticate, authorize('volunteer'), updatePickupStatus);
router.get('/my-pickups', authenticate, authorize('volunteer'), getMyPickups);
router.get('/', authenticate, authorize('admin'), getAllPickups);

module.exports = router;
