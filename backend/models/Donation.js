const mongoose = require('mongoose');

/**
 * Donation Schema - Tracks food donations from donors to NGOs
 */
const donationSchema = new mongoose.Schema({
  // Reference to the donor
  donor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  donorName: {
    type: String,
    required: true
  },
  // Reference to the approved claim
  claimedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Claim',
    default: null
  },
  // Food details
  items: [{
    itemName: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      enum: ['Cooked Food', 'Raw Ingredients', 'Packaged', 'Baked Goods', 'Beverages', 'Dairy', 'Fruits', 'Vegetables', 'Other'],
      required: true
    },
    quantity: {
      type: String,
      required: true
    },
    unit: {
      type: String,
      required: true
    },
    servings: {
      type: Number,
      default: 0
    },
    allergens: [String],
    specialNotes: String
  }],
  // Pickup location
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zip: { type: String, required: true },
  lat: { type: Number },
  lng: { type: Number },
  // Pickup schedule
  pickup_datetime: {
    type: Date,
    required: true
  },
  pickupWindow: {
    start: Date,
    end: Date
  },
  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'broadcasted', 'claimed', 'accepted', 'picked_up', 'in_transit', 'delivered', 'closed', 'completed', 'cancelled', 'Pending', 'Broadcasted', 'Accepted', 'PickedUp', 'Delivered', 'Completed'],
    default: 'pending'
  },
  assigned_volunteer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Volunteer',
    default: null
  },
  // Status history for tracking
  statusHistory: [{
    status: {
      type: String,
      enum: ['pending', 'broadcasted', 'claimed', 'accepted', 'picked_up', 'in_transit', 'delivered', 'closed', 'completed', 'cancelled', 'Pending', 'Broadcasted', 'Accepted', 'PickedUp', 'Delivered', 'Completed']
    },
    timestamp: { type: Date, default: Date.now },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String
  }],
  // Food safety information
  foodSafety: {
    preparedTime: Date,
    expiryTime: Date,
    storageType: {
      type: String,
      enum: ['room_temp', 'refrigerated', 'frozen', 'heated']
    },
    temperature: Number,
    packaging: String
  },
  // Impact metrics
  impact: {
    estimatedServings: Number,
    weightKg: Number,
    co2Saved: Number
  },
  // Smart prioritization score for volunteer pickup queues
  priorityScore: {
    type: Number,
    default: 0
  },
  // User-defined urgency level for the donation
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical', 'Fast Track (+2h)', 'Priority (+4h)', 'Tomorrow Morning'],
    default: 'medium'
  },
  // Additional information
  notes: String,
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringSchedule: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly']
    },
    daysOfWeek: [Number] // 0-6 for Sunday-Saturday
  },
  // Cancellation reason
  cancellationReason: String,
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Ratings and feedback
  ratings: {
    donorRating: { type: Number, min: 1, max: 5 },
    donorFeedback: String,
    volunteerRating: { type: Number, min: 1, max: 5 },
    volunteerFeedback: String,
    ngoRating: { type: Number, min: 1, max: 5 },
    ngoFeedback: String
  }
}, {
  timestamps: true
});

// Indexes
donationSchema.index({ donor_id: 1 });
donationSchema.index({ status: 1 });
donationSchema.index({ pickup_datetime: 1 });
donationSchema.index({ city: 1 });
donationSchema.index({ createdAt: -1 });

// Virtual for time remaining until pickup
donationSchema.virtual('timeUntilPickup').get(function () {
  return this.pickup_datetime - new Date();
});

// Method to check if donation is expired
donationSchema.methods.isExpired = function () {
  return new Date() > this.foodSafety.expiryTime;
};

// Static method to get donation statistics
donationSchema.statics.getStatistics = async function () {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalServings: { $sum: '$impact.estimatedServings' }
      }
    }
  ]);

  return stats;
};

module.exports = mongoose.model('Donation', donationSchema);
