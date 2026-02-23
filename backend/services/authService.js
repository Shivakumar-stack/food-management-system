const User = require('../models/User');
const crypto = require('crypto');

/**
 * Checks if a user exists and creates a new one.
 * @param {object} userData - The user data from the request body.
 * @returns {Promise<object>} The newly created user object.
 * @throws {Error} If user already exists or for other validation failures.
 */
const registerUser = async (userData) => {
  const {
    firstName,
    lastName,
    email,
    password,
    phone,
    role,
    organization,
    address,
  } = userData;

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    const error = new Error('User with this email already exists');
    error.statusCode = 400;
    throw error;
  }

  // Ensure address has a safe geo structure
  const safeAddress = (address && Object.keys(address).length)
    ? address
    : {
        country: process.env.GEOCODE_DEFAULT_COUNTRY || 'India',
        location: { type: 'Point', coordinates: [0, 0] },
      };

  const user = await User.create({
    firstName,
    lastName,
    email: email.toLowerCase(),
    password,
    phone,
    role: role || 'donor',
    organization: organization || {},
    address: safeAddress,
  });

  return user;
};

/**
 * Authenticates a user and returns the user object.
 * @param {string} email - User's email.
 * @param {string} password - User's plain text password.
 * @returns {Promise<object>} The authenticated user object.
 * @throws {Error} If credentials are invalid or user is inactive.
 */
const loginUser = async (email, password) => {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  if (user.status !== 'active') {
    const error = new Error('Account is not active. Please contact support.');
    error.statusCode = 403;
    throw error;
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  // Update last login
  user.lastLogin = new Date();
  user.loginCount += 1;
  await user.save();

  return user;
};

/**
 * Handles simulated social media authentication.
 * Creates a user if one does not exist.
 * @param {object} socialProfile - Profile data from the social provider.
 * @param {string} provider - The name of the provider (e.g., 'google').
 * @param {string} role - The role to assign to a new user.
 * @returns {Promise<object>} The authenticated user object.
 * @throws {Error} If the user account is inactive.
 */
const handleSocialAuth = async (socialProfile, provider, role) => {
    const email = (socialProfile.email || `demo.${provider}.${Date.now()}@foodbridge.local`).toLowerCase();
    const firstName = socialProfile.firstName || provider;
    const lastName = socialProfile.lastName || 'User';

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        firstName,
        lastName,
        email,
        password: crypto.randomBytes(16).toString('hex'), // Create a random password
        role: role || 'donor',
        phone: ''
      });
    }

    if (user.status !== 'active') {
        const error = new Error('Account is not active. Please contact support.');
        error.statusCode = 403;
        throw error;
    }

    user.lastLogin = new Date();
    user.loginCount += 1;
    await user.save();

    return user;
};


module.exports = {
  registerUser,
  loginUser,
  handleSocialAuth,
};
