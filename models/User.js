const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Schema - Defines the structure for user documents
 * Supports multiple roles: donor, volunteer, ngo, admin
 */
const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    index: true, // Index for faster email lookups
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
      'Please enter a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  phone: {
    type: String,
    trim: true,
    match: [/^\+?[\d\s-()]+$/, 'Please enter a valid phone number']
  },
  role: {
    type: String,
    enum: ['donor', 'volunteer', 'ngo', 'admin'],
    default: 'donor',
    required: true
  },
  // Organization details (for NGOs and corporate donors)
  organization: {
    name: {
      type: String,
      trim: true
    },
    type: {
      type: String,
      enum: ['restaurant', 'hotel', 'corporate', 'ngo', 'other'],
      default: 'other'
    },
    registrationNumber: String,
    website: String
  },
  // Address information
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'India' },
    // GeoJSON Point for geospatial queries
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
  // Profile information
  avatar: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters']
  },
  // Volunteer specific fields
  volunteerInfo: {
    isAvailable: { type: Boolean, default: true },
    vehicleType: {
      type: String,
      enum: ['none', 'bicycle', 'motorcycle', 'car', 'van', 'truck'],
      default: 'none'
    },
    serviceArea: [String], // List of areas/cities
    completedPickups: { type: Number, default: 0 },
    rating: { type: Number, default: 5, min: 1, max: 5 }
  },
  // Donor specific fields
  donorInfo: {
    totalDonations: { type: Number, default: 0 },
    mealsProvided: { type: Number, default: 0 },
    isVerified: { type: Boolean, default: false }
  },
  // NGO specific fields
  ngoInfo: {
    mission: String,
    beneficiaries: { type: Number, default: 0 },
    isVerified: { type: Boolean, default: false }
  },
  // Account status
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending'],
    default: 'active',
    index: true // Index for filtering by status
  },
  // Email verification
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpire: Date,
  // Password reset
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  // Login tracking
  lastLogin: Date,
  loginCount: { type: Number, default: 0 }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for faster queries
userSchema.index({ role: 1 });
userSchema.index({ 'address.city': 1 });
userSchema.index({ 'address.location': '2dsphere' });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for initials
userSchema.virtual('initials').get(function() {
  return `${this.firstName.charAt(0)}${this.lastName.charAt(0)}`.toUpperCase();
});

/**
 * Hash password before saving
 */
userSchema.pre('save', async function(next) {
  // Only hash if password is modified
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Compare password method
 * @param {string} enteredPassword - Password to compare
 * @returns {Promise<boolean>} - Whether passwords match
 */
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

/**
 * Get public profile (removes sensitive data)
 * @returns {Object} - Public user data
 */
userSchema.methods.getPublicProfile = function() {
  return {
    id: this._id,
    name: this.fullName,
    firstName: this.firstName,
    lastName: this.lastName,
    fullName: this.fullName,
    initials: this.initials,
    email: this.email,
    role: this.role,
    phone: this.phone,
    avatar: this.avatar,
    bio: this.bio,
    organization: this.organization,
    address: this.address,
    volunteerInfo: this.volunteerInfo,
    donorInfo: this.donorInfo,
    ngoInfo: this.ngoInfo,
    status: this.status,
    isEmailVerified: this.isEmailVerified,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('User', userSchema);
