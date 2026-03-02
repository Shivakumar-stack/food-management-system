const mongoose = require('mongoose');

/**
 * Contact Schema - Stores contact form submissions and complaints
 */
const contactSchema = new mongoose.Schema({
  // Contact type
  type: {
    type: String,
    enum: ['general', 'complaint', 'feedback', 'partnership', 'volunteer_inquiry', 'donation_inquiry', 'newsletter'],
    default: 'general',
    required: true
  },
  // Sender information
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
      'Please enter a valid email'
    ]
  },
  phone: {
    type: String,
    trim: true
  },
  // Subject and message
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
    maxlength: [200, 'Subject cannot exceed 200 characters']
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [2000, 'Message cannot exceed 2000 characters']
  },
  // For complaints - related entity
  relatedTo: {
    entityType: {
      type: String,
      enum: ['donation', 'volunteer', 'user', 'system'],
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'relatedTo.entityType'
    }
  },
  // Complaint specific fields
  complaintDetails: {
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    category: {
      type: String,
      enum: ['service_quality', 'safety_concern', 'technical_issue', 'behavior', 'other']
    },
    resolution: String,
    resolvedAt: Date,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  // Status tracking
  status: {
    type: String,
    enum: ['new', 'in_review', 'responded', 'resolved', 'closed', 'spam', 'subscribed'],
    default: 'new'
  },
  // Response from admin
  response: {
    message: String,
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    respondedAt: Date
  },
  // User agent and IP for tracking
  metadata: {
    ipAddress: String,
    userAgent: String,
    source: String // 'website', 'mobile_app', 'api'
  },
  // For logged-in users
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Newsletter subscription (if from newsletter form)
  newsletterSubscribed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
contactSchema.index({ type: 1 });
contactSchema.index({ status: 1 });
contactSchema.index({ email: 1 });
contactSchema.index({ createdAt: -1 });
contactSchema.index({ 'complaintDetails.priority': 1 });

// Static method to get contact statistics
contactSchema.statics.getStatistics = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 }
      }
    }
  ]);
  
  return stats;
};

module.exports = mongoose.model('Contact', contactSchema);
