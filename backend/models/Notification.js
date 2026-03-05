const mongoose = require('mongoose');

/**
 * Notification Schema
 * Stores lightweight in-app notifications for users.
 */
const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },
    type: {
      type: String,
      enum: ['info', 'success', 'warning', 'error'],
      default: 'info'
    },
    isRead: {
      type: Boolean,
      default: false
    },
    meta: {
      donationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Donation'
      },
      status: String
    }
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
