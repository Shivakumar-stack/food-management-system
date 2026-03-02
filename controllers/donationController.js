const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

const Donation = require('../models/Donation');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Claim = require('../models/Claim');
const Pickup = require('../models/Pickup');


async function createNotification({
  user,
  title,
  message,
  type = 'info',
  meta = {}
}) {
  if (!user) return;

  try {
    await Notification.create({ user, title, message, type, meta });
  } catch (error) {
    console.error('Create notification error:', error);
  }
}

function emitRealtimeEvent(req, eventName, payload) {
  const io = req.app.get('io');
  if (!io) return;
  io.emit(eventName, payload);
}

const { geocodePickupAddress } = require('../services/geocodingService');
const {
  normalizeStatusLabel,
  normalizeRequestedStatus,
  calculatePriorityScore,
  DONOR_POLICIES,
  getDonorTier,
  getPolicyMetadata,
  normalizeEstimatedServings,
  getDayRange,
  normalizeTextValue,
  normalizeFoodItemsPayload,
  normalizePickupAddressPayload,
  normalizePickupWindowPayload,
  normalizeFoodSafetyPayload,
  logDonationPayloadSummary
} = require('../services/donationService');

function createPolicyErrorResponse(res, policy, message, extra = {}) {
  return res.status(429).json({
    success: false,
    code: 'DONOR_POLICY_LIMIT',
    message,
    data: {
      policy: getPolicyMetadata(policy),
      ...extra
    }
  });
}

exports.createDonation = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const normalizedFoodItems = normalizeFoodItemsPayload(req.body?.foodItems || []);
    const normalizedPickupAddressInput = normalizePickupAddressPayload(req.body?.pickupAddress || {});
    const pickupTime = req.body?.pickupTime;
    const impact = req.body?.impact;
    const notes = normalizeTextValue(req.body?.notes);
    const pickupWindow = normalizePickupWindowPayload(req.body?.pickupWindow);
    const foodSafety = normalizeFoodSafetyPayload(req.body?.foodSafety);

    const donorId = new mongoose.Types.ObjectId(req.user.id);
    const pickupDate = new Date(pickupTime);
    const now = new Date();

    if (!normalizedFoodItems.length) {
      return res.status(400).json({
        success: false,
        message: 'At least one valid food item is required'
      });
    }

    if (
      !normalizedPickupAddressInput.street ||
      !normalizedPickupAddressInput.city ||
      !normalizedPickupAddressInput.state ||
      !normalizedPickupAddressInput.zipCode
    ) {
      return res.status(400).json({
        success: false,
        message: 'Pickup address is incomplete'
      });
    }

    if (Number.isNaN(pickupDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pickup time format'
      });
    }

    if (pickupDate <= now) {
      return res.status(400).json({
        success: false,
        message: 'Pickup time must be in the future'
      });
    }

    const user = await User.findById(donorId).select('role donorInfo organization');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found'
      });
    }

    const estimatedServings = normalizeEstimatedServings(impact, normalizedFoodItems);

    // Soft donor restrictions: protects operations from abuse while still allowing growth.
    if (user.role !== 'admin') {
      const donorTier = getDonorTier(user);
      const policy = DONOR_POLICIES[donorTier] || DONOR_POLICIES.starter;
      const itemCount = normalizedFoodItems.length;

      if (itemCount > policy.maxItems) {
        return createPolicyErrorResponse(
          res,
          policy,
          `This donor tier supports up to ${policy.maxItems} items per donation.`
        );
      }

      if (estimatedServings > policy.maxServings) {
        return createPolicyErrorResponse(
          res,
          policy,
          `This donation exceeds your current estimated serving limit of ${policy.maxServings}. Verify your donor profile to unlock larger donations.`,
          { estimatedServings }
        );
      }

      const dayRange = getDayRange(now);
      const [donationsToday, pendingDonations, lastDonation] = await Promise.all([
        Donation.countDocuments({
          donor: donorId,
          createdAt: { $gte: dayRange.start, $lt: dayRange.end }
        }),
        Donation.countDocuments({
          donor: donorId,
          status: 'pending'
        }),
        Donation.findOne({ donor: donorId })
          .sort({ createdAt: -1 })
          .select('createdAt')
      ]);

      if (donationsToday >= policy.maxDailyDonations) {
        return createPolicyErrorResponse(
          res,
          policy,
          `Daily limit reached. You can create up to ${policy.maxDailyDonations} donations per day at your current tier.`
        );
      }

      if (pendingDonations >= policy.maxPendingDonations) {
        return createPolicyErrorResponse(
          res,
          policy,
          `You already have ${pendingDonations} pending donations. Please wait for assignment before adding more.`
        );
      }

      if (policy.minIntervalMinutes > 0 && lastDonation?.createdAt) {
        const nextAllowedAt = new Date(
          lastDonation.createdAt.getTime() + (policy.minIntervalMinutes * 60 * 1000)
        );
        if (nextAllowedAt > now) {
          return createPolicyErrorResponse(
            res,
            policy,
            'Please wait a little before creating another donation.',
            { nextAllowedAt }
          );
        }
      }
    }

    const coordinates = await geocodePickupAddress(normalizedPickupAddressInput);
    const normalizedPickupAddress = {
      ...normalizedPickupAddressInput,
      location: coordinates
        ? { type: 'Point', coordinates: [coordinates.lng, coordinates.lat] }
        : undefined
    };

    // Remove legacy coordinates field if present in older payloads.
    delete normalizedPickupAddress.coordinates;

    const donationPayload = {
      donor: donorId,
      foodItems: normalizedFoodItems,
      pickupAddress: normalizedPickupAddress,
      pickupTime,
      status: 'pending',
      notes: notes || '',
      impact: {
        estimatedServings
      },
      statusHistory: [
        {
          status: 'pending',
          timestamp: new Date(),
          notes: 'Donation created'
        }
      ]
    };

    if (pickupWindow) {
      donationPayload.pickupWindow = pickupWindow;
    }

    if (foodSafety) {
      donationPayload.foodSafety = foodSafety;
    }

    logDonationPayloadSummary(req.body, donationPayload, donorId);

    const session = await mongoose.startSession();
    let donation;

    try {
      await session.withTransaction(async () => {
        const createdDonations = await Donation.create([donationPayload], { session });
        donation = createdDonations[0];

        donation.priorityScore = calculatePriorityScore(donation);
        await donation.save({ session });

        await User.findByIdAndUpdate(
          donorId,
          {
            $inc: {
              'donorInfo.totalDonations': 1,
              'donorInfo.mealsProvided': estimatedServings
            }
          },
          { session }
        );
      });
    } catch (error) {
      console.error('Create donation transaction error:', error);
      throw error;
    } finally {
      session.endSession();
    }

    if (donation) {
      emitRealtimeEvent(req, 'newDonation', donation);
      res.status(201).json({
        success: true,
        message: 'Donation created successfully',
        data: { donation }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to create donation due to a transaction error.'
      });
    }
  } catch (error) {
    console.error('Create donation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while creating donation'
    });
  }
};

exports.getDonations = async (req, res) => {
  try {
    const match = {};

    if (req.user.role === 'donor') {
      match.donor = new mongoose.Types.ObjectId(req.user.id);
    } else if (req.user.role === 'volunteer') {
      const pickups = await Pickup.find({ volunteer: req.user.id }).select('donation');
      const donationIds = pickups.map(p => p.donation);
      match._id = { $in: donationIds };
    } else if (req.user.role === 'ngo') {
      const claims = await Claim.find({ ngo: req.user.id }).select('donation');
      const donationIds = claims.map(c => c.donation);
      match._id = { $in: donationIds };
    }

    const donations = await Donation.find(match)
      .sort({ createdAt: -1 })
      .populate('donor', 'firstName lastName organization.name')
      .populate({
        path: 'claimedBy',
        populate: {
          path: 'ngo',
          select: 'firstName lastName organization.name'
        }
      });

    res.json({
      success: true,
      count: donations.length,
      data: { donations }
    });

  } catch (error) {
    console.error('Get donations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

exports.getPublicMapDonations = async (req, res) => {
  try {
    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.max(20, Math.min(requestedLimit, 500))
      : 300;

    const donations = await Donation.find({
      status: { $in: ['pending', 'claimed'] }
    })
      .sort({ priorityScore: -1, pickupTime: 1, createdAt: -1 })
      .limit(limit)
      .populate('donor', 'firstName lastName organization.name')
      .populate({
        path: 'claimedBy',
        populate: {
          path: 'ngo',
          select: 'firstName lastName organization.name'
        }
      });

    res.json({
      success: true,
      count: donations.length,
      data: { donations }
    });
  } catch (error) {
    console.error('Public map donations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

exports.getDonationStats = async (req, res) => {
  try {
    const matchStage = {};

    if (req.user.role === 'donor') {
      matchStage.donor = new mongoose.Types.ObjectId(req.user.id);
    } else if (req.user.role === 'volunteer') {
      const pickups = await Pickup.find({ volunteer: req.user.id }).select('donation');
      const donationIds = pickups.map(p => p.donation);
      matchStage._id = { $in: donationIds };
    } else if (req.user.role === 'ngo') {
      const claims = await Claim.find({ ngo: req.user.id }).select('donation');
      const donationIds = claims.map(c => c.donation);
      matchStage._id = { $in: donationIds };
    }

    const impactMatch = {
      ...matchStage,
      status: 'closed'
    };

    // Total Donations
    const totalDonations = await Donation.countDocuments(matchStage);

    // Total Servings from delivered donations only
    const servingsAgg = await Donation.aggregate([
      { $match: impactMatch },
      {
        $group: {
          _id: null,
          totalServings: {
            $sum: { $ifNull: ['$impact.estimatedServings', 0] }
          }
        }
      }
    ]);

    const totalServings =
      servingsAgg.length > 0 ? servingsAgg[0].totalServings : 0;

    // Unique communities served from delivered donations only
    const communitiesAgg = await Donation.aggregate([
      {
        $match: {
          ...impactMatch,
          'pickupAddress.city': { $exists: true, $ne: '' }
        }
      },
      {
        $group: {
          _id: { $toLower: '$pickupAddress.city' }
        }
      },
      {
        $count: 'totalCommunities'
      }
    ]);

    const communitiesServed =
      communitiesAgg.length > 0 ? communitiesAgg[0].totalCommunities : 0;

    res.json({
      success: true,
      data: {
        totalDonations,
        totalServings,
        communitiesServed
      }
    });

  } catch (error) {
    console.error('Overview stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

exports.getWeeklyTrends = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const role = req.user.role;

    const matchStage = {};

    if (role === 'donor') {
      matchStage.donor = userId;
    } else if (role === 'volunteer') {
      const pickups = await Pickup.find({ volunteer: userId }).select('donation');
      const donationIds = pickups.map(p => p.donation);
      matchStage._id = { $in: donationIds };
    } else if (role === 'ngo') {
      const claims = await Claim.find({ ngo: userId }).select('donation');
      const donationIds = claims.map(p => p.donation);
      matchStage._id = { $in: donationIds };
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const weeklyData = await Donation.aggregate([
      {
        $match: {
          ...matchStage,
          status: 'closed',
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: weeklyData
    });

  } catch (error) {
    console.error("Weekly stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

exports.updateDonationStatus = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found'
      });
    }

    const requestedStatus = String(req.body?.status || '').trim();
    const normalizedStatus = normalizeRequestedStatus(requestedStatus);
    const notes = String(req.body?.notes || '').trim();
    const role = req.user?.role || '';
    const userId = String(req.user?.id || '');

    if (!normalizedStatus) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status update request'
      });
    }

    if (role === 'donor') {
      if (String(donation.donor) !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this donation'
        });
      }

      if (normalizedStatus !== 'cancelled') {
        return res.status(403).json({
          success: false,
          message: 'Donors can only cancel their donation'
        });
      }
    }

    if (role === 'volunteer') {
      if (!['claimed', 'closed'].includes(normalizedStatus)) {
        return res.status(403).json({
          success: false,
          message: 'Volunteer status update is not allowed for this action'
        });
      }

      if (normalizedStatus === 'claimed') {
        if (donation.status !== 'pending') {
          return res.status(400).json({
            success: false,
            message: 'Only pending donations can be accepted'
          });
        }

        const existingPickup = await Pickup.findOne({
          donation: donation._id,
          status: { $ne: 'cancelled' }
        });

        if (existingPickup && String(existingPickup.volunteer) !== userId) {
          return res.status(409).json({
            success: false,
            message: 'Donation is already assigned to another volunteer'
          });
        }

        if (!existingPickup) {
          await Pickup.create({
            donation: donation._id,
            donor: donation.donor,
            volunteer: req.user.id,
            status: 'assigned',
            pickupTime: donation.pickupTime
          });
        }
      }

      if (normalizedStatus === 'closed') {
        const pickup = await Pickup.findOne({
          donation: donation._id,
          volunteer: req.user.id
        }).sort({ createdAt: -1 });

        if (!pickup) {
          return res.status(403).json({
            success: false,
            message: 'You are not assigned to this pickup'
          });
        }

        pickup.status = 'completed';
        pickup.completionTime = new Date();
        await pickup.save();
      }
    }

    if (role === 'ngo' && normalizedStatus !== 'claimed') {
      return res.status(403).json({
        success: false,
        message: 'NGO status update is not allowed for this action'
      });
    }

    donation.status = normalizedStatus;
    donation.priorityScore = normalizedStatus === 'pending' ? calculatePriorityScore(donation) : 0;

    if (normalizedStatus === 'cancelled') {
      donation.cancellationReason = notes || donation.cancellationReason || 'Cancelled by user';
      donation.cancelledBy = req.user.id;
    }

    donation.statusHistory.push({
      status: normalizedStatus,
      timestamp: new Date(),
      updatedBy: req.user.id,
      notes: notes || `Status changed to ${normalizeStatusLabel(normalizedStatus)}`
    });

    await donation.save();

    if (role === 'volunteer' && normalizedStatus === 'claimed') {
      await createNotification({
        user: donation.donor,
        title: 'Volunteer Accepted Pickup',
        message: 'A volunteer has accepted your donation pickup request.',
        meta: { donationId: donation._id, status: normalizedStatus }
      });
    }

    emitRealtimeEvent(req, 'donationStatusUpdated', {
      donationId: donation._id,
      status: normalizedStatus,
      updatedBy: req.user.id,
      role
    });

    res.json({
      success: true,
      message: `Donation marked as ${normalizeStatusLabel(normalizedStatus)}.`,
      data: { donation }
    });
  } catch (error) {
    console.error('Update donation status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating donation status'
    });
  }
};

exports.getAvailableDonationsForVolunteer = async (req, res) => {
  try {
    // await expireOldDonations(); // This logic needs to be revisited
    // await refreshPendingPriorityScores(now); // This logic needs to be revisited

    const donations = await Donation.find({
      status: 'pending', // This is correct
      claimedBy: null // Donations that are not yet claimed
    })
      .populate('donor', 'firstName lastName organization.name')
      .sort({ priorityScore: -1, pickupTime: 1, createdAt: 1 });

    res.json({
      success: true,
      count: donations.length,
      data: donations
    });
  } catch (error) {
    console.error('Volunteer available donations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

exports.getAvailableDonationsForNgo = async (req, res) => {
  try {
    // This logic is now different. NGOs will see pending donations and can claim them.
    const donations = await Donation.find({
      status: 'pending',
      claimedBy: null
    })
      .populate('donor', 'firstName lastName organization.name')
      .sort({ pickupTime: 1, createdAt: 1 });

    res.json({
      success: true,
      count: donations.length,
      data: donations
    });
  } catch (error) {
    console.error('NGO available donations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

exports.claimDonation = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found'
      });
    }

    if (donation.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending donations can be claimed'
      });
    }

    if (donation.claimedBy) {
      return res.status(409).json({
        success: false,
        message: 'Donation already claimed'
      });
    }

    const session = await mongoose.startSession();
    let claim;
    try {
      await session.withTransaction(async () => {
        const claims = await Claim.create([{
          donation: donation._id,
          ngo: req.user.id,
          status: 'pending'
        }], { session });
        claim = claims[0];

        donation.claimedBy = claim._id;
        donation.status = 'claimed';
        donation.priorityScore = 0;
        donation.statusHistory.push({
          status: 'claimed',
          timestamp: new Date(),
          updatedBy: req.user.id,
          notes: 'Claimed by NGO'
        });
        await donation.save({ session });
      });
    } catch (error) {
      console.error('Claim donation transaction error:', error);
      throw error;
    } finally {
      session.endSession();
    }

    emitRealtimeEvent(req, 'donationClaimed', { donationId: donation._id, ngo: req.user.id });
    emitRealtimeEvent(req, 'donationStatusUpdated', {
      donationId: donation._id,
      status: 'claimed',
      updatedBy: req.user.id,
      role: req.user.role
    });

    await createNotification({
      user: donation.donor,
      title: 'Donation Claimed',
      message: `Your donation has been claimed by an NGO and is pending approval.`,
      meta: { donationId: donation._id, status: 'pending_approval' }
    });

    res.json({
      success: true,
      message: 'Donation claimed successfully and is pending approval.',
      data: { claim, donation }
    });
  } catch (error) {
    console.error('Claim donation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

exports.getAdminStats = async (req, res) => {
  try {
    const [
      totalDonations,
      pendingDonations,
      claimedDonations,
      closedDonations,
      totalUsers,
      totalVolunteers,
      totalNgos
    ] = await Promise.all([
      Donation.countDocuments(),
      Donation.countDocuments({ status: 'pending' }),
      Donation.countDocuments({ status: 'claimed' }),
      Donation.countDocuments({ status: 'closed' }),
      User.countDocuments(),
      User.countDocuments({ role: 'volunteer' }),
      User.countDocuments({ role: 'ngo' })
    ]);

    res.json({
      success: true,
      data: {
        donations: {
          total: totalDonations,
          pending: pendingDonations,
          claimed: claimedDonations,
          closed: closedDonations
        },
        users: {
          total: totalUsers,
          volunteers: totalVolunteers,
          ngos: totalNgos
        }
      }
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
