const Notification = require('../models/Notification');

exports.getLatestNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(10);

    const unreadCount = await Notification.countDocuments({ user: req.user.id, isRead: false });

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

exports.markAsRead = async (req, res) => {
    try {
        const { notificationIds } = req.body;

        await Notification.updateMany(
            { _id: { $in: notificationIds }, user: req.user.id },
            { $set: { isRead: true } }
        );

        res.json({
            success: true,
            message: 'Notifications marked as read'
        });
    } catch (error) {
        console.error('Mark notifications as read error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};
