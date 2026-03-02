const mongoose = require('mongoose');

/**
 * Pickup Schema
 * Manages the logistics of a donation pickup.
 */
const pickupSchema = new mongoose.Schema(
  {
    donation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donation',
      required: true,
    },
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    volunteer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    ngo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // The admin who assigned the pickup
    assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    status: {
      type: String,
      enum: ['pending_assignment', 'assigned', 'in_progress', 'completed', 'cancelled'],
      default: 'pending_assignment',
    },
    pickupTime: {
      type: Date,
    },
    completionTime: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

pickupSchema.index({ donation: 1 });
pickupSchema.index({ donor: 1 });
pickupSchema.index({ volunteer: 1 });
pickupSchema.index({ ngo: 1 });
pickupSchema.index({ status: 1 });

module.exports = mongoose.model('Pickup', pickupSchema);
