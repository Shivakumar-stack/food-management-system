const { validationResult } = require('express-validator');
const crypto = require('crypto');
const User = require('../models/User');
const Donation = require('../models/Donation');
const Pickup = require('../models/Pickup');
const Claim = require('../models/Claim');
const authService = require('../services/authService');
const { generateToken } = require('../middleware/auth');

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const user = await authService.registerUser(req.body);

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: user.getPublicProfile(),
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;
    const user = await authService.loginUser(email, password);
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.getPublicProfile(),
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Simulated social auth login/signup (OAuth-ready endpoint)
 * @route   POST /api/auth/social
 * @access  Public
 */
const socialAuth = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { provider = 'google', role, profile = {} } = req.body;
    const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);

    const user = await authService.handleSocialAuth(profile, provider, role);
    const token = generateToken(user._id);

    return res.json({
      success: true,
      message: `${providerName} authentication simulated successfully`,
      data: {
        user: user.getPublicProfile(),
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/profile
 * @access  Private
 */
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: user.getPublicProfile()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateProfile = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const allowedUpdates = [
      'firstName', 'lastName', 'phone', 'bio', 'avatar',
      'organization', 'address', 'volunteerInfo', 'ngoInfo'
    ];

    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: user.getPublicProfile()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change password
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
const changePassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get dashboard data based on user role
 * @route   GET /api/auth/dashboard
 * @access  Private
 */
const getDashboard = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    let dashboardData = {
      user: user.getPublicProfile(),
      stats: {},
      recentActivity: []
    };

    // Role-specific data
    switch (user.role) {
      case 'donor':
        dashboardData.stats = {
          totalDonations: user.donorInfo?.totalDonations || 0,
          mealsProvided: user.donorInfo?.mealsProvided || 0,
          pendingDonations: await Donation.countDocuments({ donor: user._id, status: 'pending' }),
          completedDonations: await Donation.countDocuments({ donor: user._id, status: 'closed' })
        };
        dashboardData.recentActivity = await Donation.find({ donor: user._id })
          .sort({ createdAt: -1 })
          .limit(5)
          .populate({
            path: 'claimedBy',
            populate: {
              path: 'ngo',
              select: 'firstName lastName organization.name'
            }
          });
        break;

      case 'volunteer':
        {
          const pickups = await Pickup.find({ volunteer: user._id })
            .sort({ createdAt: -1 })
            .limit(100)
            .populate({
              path: 'donation',
              populate: {
                path: 'donor',
                select: 'firstName lastName organization.name'
              }
            });

          const donationDocs = pickups
            .map((pickup) => pickup.donation)
            .filter(Boolean);

          const activeStatuses = new Set(['assigned', 'in_progress']);
          const completedStatuses = new Set(['completed']);

          dashboardData.stats = {
            completedPickups:
              pickups.filter((pickup) => completedStatuses.has(pickup.status)).length,
            rating: user.volunteerInfo?.rating || 5,
            activePickups:
              pickups.filter((pickup) => activeStatuses.has(pickup.status)).length,
            totalPickups: pickups.length
          };

          dashboardData.recentActivity = donationDocs.slice(0, 5);
        }
        break;

      case 'ngo':
        {
          const claims = await Claim.find({ ngo: user._id })
            .sort({ createdAt: -1 })
            .limit(100)
            .populate({
              path: 'donation',
              populate: {
                path: 'donor',
                select: 'firstName lastName organization.name'
              }
            });

          const donationIds = claims
            .map((claim) => claim.donation?._id)
            .filter(Boolean);

          dashboardData.stats = {
            totalReceived: await Donation.countDocuments({
              _id: { $in: donationIds },
              status: 'closed'
            }),
            pendingDeliveries: await Donation.countDocuments({
              _id: { $in: donationIds },
              status: { $in: ['pending', 'claimed'] }
            }),
            beneficiaries: user.ngoInfo?.beneficiaries || 0
          };

          dashboardData.recentActivity = claims
            .map((claim) => claim.donation)
            .filter(Boolean)
            .slice(0, 5);
        }
        break;

      case 'admin':
        dashboardData.stats = {
          totalUsers: await User.countDocuments(),
          totalDonations: await Donation.countDocuments(),
          pendingDonations: await Donation.countDocuments({ status: 'pending' }),
          activeVolunteers: await User.countDocuments({ role: 'volunteer', 'volunteerInfo.isAvailable': true }),
          totalNGOs: await User.countDocuments({ role: 'ngo' }),
          recentDonations: await Donation.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } })
        };
        dashboardData.recentActivity = await Donation.find()
          .sort({ createdAt: -1 })
          .limit(10)
          .populate('donor', 'firstName lastName')
          .populate({
            path: 'claimedBy',
            populate: {
              path: 'ngo',
              select: 'firstName lastName organization.name'
            }
          });
        break;
    }

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout user (optional - for token blacklisting)
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = async (req, res, next) => {
  // In a more complex implementation, you might blacklist the token
  res.json({
    success: true,
    message: 'Logout successful'
  });
};

module.exports = {
  register,
  login,
  socialAuth,
  getProfile,
  updateProfile,
  changePassword,
  getDashboard,
  logout
};
