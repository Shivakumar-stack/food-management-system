const mongoose = require('mongoose');

/**
 * Donation Schema - Tracks food donations from donors to NGOs
 */
const donationSchema = new mongoose.Schema({
  // Reference to the donor
  donor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Reference to the approved claim
  claimedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Claim',
    default: null
  },
  // Food details
  foodItems: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      enum: ['cooked', 'raw', 'packaged', 'baked', 'beverages', 'dairy', 'fruits', 'vegetables', 'other'],
      required: true
    },
    quantity: {
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
  pickupAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
      },
    },
  },
  // Pickup schedule
  pickupTime: {
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
    enum: ['pending', 'claimed', 'closed', 'cancelled'],
    default: 'pending'
  },
  // Status history for tracking
  statusHistory: [{
    status: {
      type: String,
      enum: ['pending', 'claimed', 'closed', 'cancelled']
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
donationSchema.index({ donor: 1 });
donationSchema.index({ status: 1 });
donationSchema.index({ pickupTime: 1 });
donationSchema.index({ 'pickupAddress.city': 1 });
donationSchema.index({ 'pickupAddress.location': '2dsphere' });
donationSchema.index({ createdAt: -1 });

// Virtual for time remaining until pickup
donationSchema.virtual('timeUntilPickup').get(function() {
  return this.pickupTime - new Date();
});

// Method to check if donation is expired
donationSchema.methods.isExpired = function() {
  return new Date() > this.foodSafety.expiryTime;
};

// Static method to get donation statistics
donationSchema.statics.getStatistics = async function() {
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
