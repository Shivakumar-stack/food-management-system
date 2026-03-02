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

module.exports = {
    GEOCODE_DEFAULT_COUNTRY,
    extractCoordinates,
    geocodePickupAddress
};
