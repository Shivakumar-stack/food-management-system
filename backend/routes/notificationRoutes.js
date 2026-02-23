const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getLatestNotifications, markAsRead } = require('../controllers/notificationController');

router.get('/', authenticate, getLatestNotifications);
router.put('/read', authenticate, markAsRead);

module.exports = router;