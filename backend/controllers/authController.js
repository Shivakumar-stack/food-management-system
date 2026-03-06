const User = require('../models/User');
const Donation = require('../models/Donation');
const Pickup = require('../models/Pickup');
const Claim = require('../models/Claim');
const authService = require('../services/authService');
const { generateToken } = require('../middlewares/auth');

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
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
          pendingDonations: await Donation.countDocuments({ donor_id: user._id, status: 'pending' }),
          completedDonations: await Donation.countDocuments({ donor_id: user._id, status: 'closed' })
        };
        dashboardData.recentActivity = await Donation.find({ donor_id: user._id })
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

      case 'volunteer': {
          const pickups = await Pickup.find({ volunteer: user._id })
            .sort({ createdAt: -1 })
            .limit(100)
            .populate('donation');

          const donationDocs = pickups
            .map((pickup) => pickup.donation)
            .filter(Boolean);

          const volunteerStats = await Pickup.aggregate([
            { $match: { volunteer: user._id } },
            {
              $facet: {
                completedPickups: [
                  { $match: { status: 'completed' } },
                  { $count: "count" }
                ],
                activePickups: [
                  { $match: { status: { $in: ['assigned', 'in_progress'] } } },
                  { $count: "count" }
                ],
                totalPickups: [{ $count: "count" }]
              }
            }
          ]);

          dashboardData.stats = {
             completedPickups: volunteerStats[0].completedPickups[0]?.count || 0,
             rating: user.volunteerInfo?.rating || 5,
             activePickups: volunteerStats[0].activePickups[0]?.count || 0,
             totalPickups: volunteerStats[0].totalPickups[0]?.count || 0
          };

          dashboardData.recentActivity = donationDocs.slice(0, 5);
        }
        break;

      case 'ngo': {
          const claims = await Claim.find({ ngo: user._id })
            .sort({ createdAt: -1 })
            .limit(100)
            .populate('donation');

          const donationIds = claims
            .map((claim) => claim.donation?._id)
            .filter(Boolean);

          const ngoStats = await Donation.aggregate([
            { $match: { _id: { $in: donationIds } } },
            {
              $facet: {
                totalReceived: [
                  { $match: { status: 'closed' } },
                  { $count: "count" }
                ],
                pendingDeliveries: [
                  { $match: { status: { $in: ['pending', 'claimed'] } } },
                  { $count: "count" }
                ]
              }
            }
          ]);

          dashboardData.stats = {
            totalReceived: ngoStats[0].totalReceived[0]?.count || 0,
            pendingDeliveries: ngoStats[0].pendingDeliveries[0]?.count || 0,
            beneficiaries: user.ngoInfo?.beneficiaries || 0
          };

          dashboardData.recentActivity = claims
            .map((claim) => claim.donation)
            .filter(Boolean)
            .slice(0, 5);
        }
        break;

      case 'admin': {
        const adminStats = await Donation.aggregate([
          {
            $facet: {
              totalDonations: [{ $count: "count" }],
              pendingDonations: [
                { $match: { status: 'pending' } },
                { $count: "count" }
              ],
              recentDonations: [
                { 
                  $match: { 
                    createdAt: { 
                      $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) 
                    } 
                  } 
                },
                { $count: "count" }
              ]
            }
          }
        ]);

        const userStats = await User.aggregate([
          {
            $facet: {
              totalUsers: [{ $count: "count" }],
              activeVolunteers: [
                { $match: { role: 'volunteer', 'volunteerInfo.isAvailable': true } },
                { $count: "count" }
              ],
              totalNGOs: [
                { $match: { role: 'ngo' } },
                { $count: "count" }
              ]
            }
          }
        ]);

        dashboardData.stats = {
          totalUsers: userStats[0].totalUsers[0]?.count || 0,
          totalDonations: adminStats[0].totalDonations[0]?.count || 0,
          pendingDonations: adminStats[0].pendingDonations[0]?.count || 0,
          activeVolunteers: userStats[0].activeVolunteers[0]?.count || 0,
          totalNGOs: userStats[0].totalNGOs[0]?.count || 0,
          recentDonations: adminStats[0].recentDonations[0]?.count || 0
        };

        dashboardData.recentActivity = await Donation.find()
          .sort({ createdAt: -1 })
          .limit(10)
          .populate('donor_id', 'firstName lastName')
          .populate({
            path: 'claimedBy',
            populate: {
              path: 'ngo',
              select: 'firstName lastName organization.name'
            }
          });
        break;
      }
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
const logout = async (req, res) => {
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
