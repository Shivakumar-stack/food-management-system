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

function normalizeStatusLabel(status) {
  return String(status || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeRequestedStatus(status) {
  const value = String(status || '').trim().toLowerCase();

  if (!value) return null;

  if (['pending'].includes(value)) return 'pending';
  if (['claimed', 'accepted', 'picked_up', 'in_transit'].includes(value)) return 'claimed';
  if (['closed', 'delivered'].includes(value)) return 'closed';
  if (['cancelled', 'expired'].includes(value)) return 'cancelled';

  return null;
}

const NON_EXPIRABLE_STATUSES = ['delivered', 'cancelled', 'expired'];
const GEOCODE_TIMEOUT_MS = 4500;
const GEOCODE_LOOKUP_MODE = String(process.env.GEOCODE_LOOKUP_MODE || 'fallback').toLowerCase();
const GEOCODE_DEFAULT_COUNTRY = process.env.GEOCODE_DEFAULT_COUNTRY || 'India';
const GEOCODE_USER_AGENT =
  process.env.GEOCODE_USER_AGENT || 'FoodBridge/1.0 (support@foodbridge.local)';
const CITY_COORDINATE_FALLBACKS = {
  bangalore: { lat: 12.9716, lng: 77.5946 },
  bengaluru: { lat: 12.9716, lng: 77.5946 },
  bangaluru: { lat: 12.9716, lng: 77.5946 },
  mysore: { lat: 12.2958, lng: 76.6394 },
  mysuru: { lat: 12.2958, lng: 76.6394 },
  hubli: { lat: 15.3647, lng: 75.124 },
  dharwad: { lat: 15.4589, lng: 75.0078 },
  mangalore: { lat: 12.9141, lng: 74.856 },
  mangaluru: { lat: 12.9141, lng: 74.856 },
  belgaum: { lat: 15.8497, lng: 74.4977 },
  belagavi: { lat: 15.8497, lng: 74.4977 },
  kalaburagi: { lat: 17.3297, lng: 76.8343 },
  gulbarga: { lat: 17.3297, lng: 76.8343 },
  davanagere: { lat: 14.4644, lng: 75.9218 },
  shivamogga: { lat: 13.9299, lng: 75.5681 },
  shimoga: { lat: 13.9299, lng: 75.5681 },
  mumbai: { lat: 19.076, lng: 72.8777 }
};

function normalizeCityKey(city) {
  return String(city || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}

function normalizeCoordinateValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractCoordinates(address) {
  if (!address) return null;

  const lat = normalizeCoordinateValue(
    address?.coordinates?.lat ?? address?.lat ?? address?.latitude
  );
  const lng = normalizeCoordinateValue(
    address?.coordinates?.lng ??
      address?.lng ??
      address?.lon ??
      address?.longitude
  );

  if (lat === null || lng === null) return null;
  return { lat, lng };
}

function getFallbackCoordinates(address) {
  const cityKey = normalizeCityKey(address?.city);
  if (!cityKey) return null;
  return CITY_COORDINATE_FALLBACKS[cityKey] || null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function geocodePickupAddress(address) {
  const existingCoordinates = extractCoordinates(address);
  if (existingCoordinates) {
    return existingCoordinates;
  }

  const fallbackCoordinates = getFallbackCoordinates(address);
  const allowRemoteLookup =
    GEOCODE_LOOKUP_MODE === 'remote' || GEOCODE_LOOKUP_MODE === 'hybrid';

  if (!allowRemoteLookup) {
    return fallbackCoordinates;
  }

  const queryParts = [
    address?.street,
    address?.city,
    address?.state,
    address?.zipCode,
    address?.country || GEOCODE_DEFAULT_COUNTRY
  ].filter(Boolean);

  if (queryParts.length) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT_MS);

    try {
      const params = new URLSearchParams({
        format: 'json',
        limit: '1',
        q: queryParts.join(', ')
      });

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`,
        {
          headers: {
            Accept: 'application/json',
            'User-Agent': GEOCODE_USER_AGENT
          },
          signal: controller.signal
        }
      );

      if (response.ok) {
        const rows = await response.json();
        if (Array.isArray(rows) && rows.length > 0) {
          const lat = normalizeCoordinateValue(rows[0]?.lat);
          const lng = normalizeCoordinateValue(rows[0]?.lon);
          if (lat !== null && lng !== null) {
            return { lat, lng };
          }
        }
      }
    } catch (error) {
      const city = address?.city || 'unknown city';
      console.warn(`Geocoding lookup failed for ${city}:`, error.message);
    } finally {
      clearTimeout(timer);
    }
  }

  return fallbackCoordinates;
}

function calculatePriorityScore(donation, referenceDate = new Date()) {
  const pickupDate = new Date(donation?.pickupTime);
  if (Number.isNaN(pickupDate.getTime())) return 0;

  const hoursLeft = (pickupDate.getTime() - referenceDate.getTime()) / (1000 * 60 * 60);
  if (hoursLeft <= 0) return 0;

  const servings = Number(donation?.impact?.estimatedServings) || 0;
  let score = 0;

  // Urgency boost
  if (hoursLeft < 6) score += 50;
  else if (hoursLeft < 24) score += 30;

  // High serving boost
  if (servings > 100) score += 40;
  else if (servings > 50) score += 20;

  // Pending boost
  if (donation?.status === 'pending') score += 20;

  return score;
}

const DONOR_POLICIES = {
  starter: {
    tier: 'starter',
    maxDailyDonations: 2,
    minIntervalMinutes: 180,
    maxItems: 5,
    maxServings: 150,
    maxPendingDonations: 3
  },
  growing: {
    tier: 'growing',
    maxDailyDonations: 4,
    minIntervalMinutes: 90,
    maxItems: 10,
    maxServings: 350,
    maxPendingDonations: 6
  },
  verified: {
    tier: 'verified',
    maxDailyDonations: 10,
    minIntervalMinutes: 30,
    maxItems: 20,
    maxServings: 1000,
    maxPendingDonations: 12
  },
  trusted: {
    tier: 'trusted',
    maxDailyDonations: 25,
    minIntervalMinutes: 0,
    maxItems: 40,
    maxServings: 3000,
    maxPendingDonations: 30
  }
};

function getDonorTier(user) {
  const totalDonations = Number(user?.donorInfo?.totalDonations) || 0;
  const isVerified = Boolean(user?.donorInfo?.isVerified);
  const hasOrganization = Boolean(user?.organization?.name);

  if (isVerified && (hasOrganization || totalDonations >= 50)) {
    return 'trusted';
  }

  if (isVerified) {
    return 'verified';
  }

  if (totalDonations >= 10) {
    return 'growing';
  }

  return 'starter';
}

function getPolicyMetadata(policy) {
  return {
    tier: policy.tier,
    maxDailyDonations: policy.maxDailyDonations,
    minIntervalMinutes: policy.minIntervalMinutes,
    maxItems: policy.maxItems,
    maxServings: policy.maxServings,
    maxPendingDonations: policy.maxPendingDonations
  };
}

function parseServingEstimateFromQuantity(quantity) {
  const text = String(quantity || '').toLowerCase();
  const match = text.match(/(\d+(\.\d+)?)/);
  if (!match) return 0;

  const value = Number.parseFloat(match[1]);
  if (!Number.isFinite(value) || value <= 0) return 0;

  if (/kg|kilogram/.test(text)) return Math.round(value * 8);
  if (/(^|\s)g(ram)?(\s|$)/.test(text)) return Math.round((value / 1000) * 8);
  if (/l(itre|iter)?/.test(text)) return Math.round(value * 5);
  if (/ml/.test(text)) return Math.round((value / 1000) * 5);
  if (/tray|box|pack|packet|bag/.test(text)) return Math.round(value * 10);
  if (/plate|meal|serving|portion/.test(text)) return Math.round(value);

  return Math.round(value * 4);
}

function estimateServingsFromFoodItems(foodItems = []) {
  const estimated = foodItems.reduce((total, item) => {
    return total + parseServingEstimateFromQuantity(item?.quantity);
  }, 0);

  if (estimated > 0) return estimated;
  return Math.max(foodItems.length * 5, 0);
}

function normalizeEstimatedServings(impact, foodItems = []) {
  const providedValue = Number(impact?.estimatedServings);
  if (Number.isFinite(providedValue) && providedValue > 0) {
    return Math.round(providedValue);
  }
  return estimateServingsFromFoodItems(foodItems);
}

function getDayRange(reference = new Date()) {
  const start = new Date(reference);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

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

const VALID_FOOD_CATEGORIES = new Set([
  'cooked',
  'raw',
  'packaged',
  'baked',
  'beverages',
  'dairy',
  'fruits',
  'vegetables',
  'other'
]);

const VALID_STORAGE_TYPES = new Set(['room_temp', 'refrigerated', 'frozen', 'heated']);

function normalizeTextValue(value) {
  return String(value || '').trim();
}

function normalizeOptionalDateValue(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeStringList(value) {
  const list = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [];

  return list
    .map((entry) => normalizeTextValue(entry))
    .filter(Boolean);
}

function normalizeFoodItemsPayload(foodItems = []) {
  if (!Array.isArray(foodItems)) return [];

  return foodItems
    .map((item) => {
      const name = normalizeTextValue(item?.name);
      const category = normalizeTextValue(item?.category).toLowerCase();
      const quantity = normalizeTextValue(item?.quantity);

      if (!name || !category || !quantity) {
        return null;
      }

      if (!VALID_FOOD_CATEGORIES.has(category)) {
        return null;
      }

      const normalized = { name, category, quantity };
      const servings = Number(item?.servings);
      const allergens = normalizeStringList(item?.allergens);
      const specialNotes = normalizeTextValue(item?.specialNotes);

      if (Number.isFinite(servings) && servings > 0) {
        normalized.servings = Math.round(servings);
      }

      if (allergens.length) {
        normalized.allergens = allergens;
      }

      if (specialNotes) {
        normalized.specialNotes = specialNotes;
      }

      return normalized;
    })
    .filter(Boolean);
}

function normalizePickupAddressPayload(pickupAddress = {}) {
  const street = normalizeTextValue(
    pickupAddress?.street ||
    pickupAddress?.addressLine1 ||
    pickupAddress?.address ||
    pickupAddress?.line1
  );
  const city = normalizeTextValue(pickupAddress?.city);
  const state = normalizeTextValue(pickupAddress?.state);
  const zipCode = normalizeTextValue(
    pickupAddress?.zipCode ||
    pickupAddress?.postalCode ||
    pickupAddress?.zipcode ||
    pickupAddress?.pinCode ||
    pickupAddress?.pin
  );
  const country = normalizeTextValue(pickupAddress?.country || GEOCODE_DEFAULT_COUNTRY);

  const normalizedAddress = {
    street,
    city,
    state,
    zipCode,
    country
  };

  const coordinates = extractCoordinates(pickupAddress);
  if (coordinates) {
    normalizedAddress.coordinates = coordinates;
  }

  return normalizedAddress;
}

function normalizePickupWindowPayload(pickupWindow) {
  if (!pickupWindow || typeof pickupWindow !== 'object') return null;

  const start = normalizeOptionalDateValue(pickupWindow?.start);
  const end = normalizeOptionalDateValue(pickupWindow?.end);

  if (!start && !end) return null;
  if (start && end && end < start) return null;

  return {
    ...(start ? { start } : {}),
    ...(end ? { end } : {})
  };
}

function normalizeFoodSafetyPayload(foodSafety) {
  if (!foodSafety || typeof foodSafety !== 'object') return null;

  const preparedTime = normalizeOptionalDateValue(foodSafety?.preparedTime);
  const expiryTime = normalizeOptionalDateValue(foodSafety?.expiryTime);
  const storageType = normalizeTextValue(foodSafety?.storageType).toLowerCase();
  const temperature = Number(foodSafety?.temperature);
  const packaging = normalizeTextValue(foodSafety?.packaging);

  const normalized = {};
  if (preparedTime) normalized.preparedTime = preparedTime;
  if (expiryTime) normalized.expiryTime = expiryTime;
  if (storageType && VALID_STORAGE_TYPES.has(storageType)) normalized.storageType = storageType;
  if (Number.isFinite(temperature)) normalized.temperature = temperature;
  if (packaging) normalized.packaging = packaging;

  return Object.keys(normalized).length ? normalized : null;
}

function logDonationPayloadSummary(rawPayload, normalizedPayload, donorId) {
  if (String(process.env.NODE_ENV || '').toLowerCase() === 'production') {
    return;
  }

  const summary = {
    donorId: String(donorId),
    rawPayloadKeys: Object.keys(rawPayload || {}),
    normalizedPayload
  };

  console.log('[Donation] Create request payload summary:', JSON.stringify(summary));
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

    const donation = await Donation.create(donationPayload);

    donation.priorityScore = calculatePriorityScore(donation);
    await donation.save();
    emitRealtimeEvent(req, 'newDonation', donation);

    await User.findByIdAndUpdate(
      donorId,
      {
        $inc: {
          'donorInfo.totalDonations': 1,
          'donorInfo.mealsProvided': estimatedServings
        }
      }
    );

    res.status(201).json({
      success: true,
      message: 'Donation created successfully',
      data: { donation }
    });
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
        const now = new Date();
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

        const claim = await Claim.create({
            donation: donation._id,
            ngo: req.user.id,
            status: 'pending'
        });

        donation.claimedBy = claim._id;
        donation.status = 'claimed';
        donation.priorityScore = 0;
        donation.statusHistory.push({
          status: 'claimed',
          timestamp: new Date(),
          updatedBy: req.user.id,
          notes: 'Claimed by NGO'
        });
        await donation.save();

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
            User.countDocuments({role: 'volunteer'}),
            User.countDocuments({role: 'ngo'})
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
