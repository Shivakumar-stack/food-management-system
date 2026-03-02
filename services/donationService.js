const { GEOCODE_DEFAULT_COUNTRY, extractCoordinates } = require('./geocodingService');

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

module.exports = {
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
};
