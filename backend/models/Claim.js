const mongoose = require('mongoose');

/**
 * Claim Schema
 * Represents an NGO's claim on a specific donation.
 */
const claimSchema = new mongoose.Schema(
  {
    donation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donation',
      required: true,
    },
    ngo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    claimedAt: {
      type: Date,
      default: Date.now,
    },
    // Reference to the admin who approved/rejected the claim
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

claimSchema.index({ donation: 1 });
claimSchema.index({ ngo: 1 });
claimSchema.index({ status: 1 });
// Compound index to prevent duplicate claims
claimSchema.index({ donation: 1, ngo: 1 }, { unique: true });

module.exports = mongoose.model('Claim', claimSchema);
