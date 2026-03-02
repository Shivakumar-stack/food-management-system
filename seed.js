const User = require('./models/User');
const Donation = require('./models/Donation');
const Pickup = require('./models/Pickup');
const { connectDB } = require('./config/db');

require('dotenv').config();

const seedData = async () => {
  try {
    await connectDB();

    // Clear existing data
    await User.deleteMany({});
    await Donation.deleteMany({});
    await Pickup.deleteMany({});

    console.log('Data cleared successfully');

    // Hash the test password securely (for development/testing only)
    const testPassword = 'TestPassword123!';

    // Create users using create() to trigger pre-save hooks
    await User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@foodbridge.org',
      password: testPassword,
      role: 'admin',
      phone: '1234567890',
    });

    const volunteerData = [
      {
        firstName: 'Volunteer',
        lastName: 'One',
        email: 'volunteer1@foodbridge.org',
        password: testPassword,
        role: 'volunteer',
        phone: '1234567891',
      },
      {
        firstName: 'Volunteer',
        lastName: 'Two',
        email: 'volunteer2@foodbridge.org',
        password: testPassword,
        role: 'volunteer',
        phone: '1234567892',
      },
      {
        firstName: 'Volunteer',
        lastName: 'Three',
        email: 'volunteer3@foodbridge.org',
        password: testPassword,
        role: 'volunteer',
        phone: '1234567893',
      },
    ];

    const volunteers = await Promise.all(
      volunteerData.map(data => User.create(data))
    );

    const donorData = [
      {
        firstName: 'Donor',
        lastName: 'One',
        email: 'donor1@foodbridge.org',
        password: testPassword,
        role: 'donor',
        phone: '1234567894',
        organization: { name: 'Restaurant A' },
      },
      {
        firstName: 'Donor',
        lastName: 'Two',
        email: 'donor2@foodbridge.org',
        password: testPassword,
        role: 'donor',
        phone: '1234567895',
        organization: { name: 'Hotel B' },
      },
      {
        firstName: 'Donor',
        lastName: 'Three',
        email: 'donor3@foodbridge.org',
        password: testPassword,
        role: 'donor',
        phone: '1234567896',
      },
      {
        firstName: 'Donor',
        lastName: 'Four',
        email: 'donor4@foodbridge.org',
        password: testPassword,
        role: 'donor',
        phone: '1234567897',
      },
      {
        firstName: 'Donor',
        lastName: 'Five',
        email: 'donor5@foodbridge.org',
        password: testPassword,
        role: 'donor',
        phone: '1234567898',
      },
    ];

    const donors = await Promise.all(
      donorData.map(data => User.create(data))
    );

    const ngoData = [
      {
        firstName: 'NGO',
        lastName: 'One',
        email: 'ngo1@foodbridge.org',
        password: testPassword,
        role: 'ngo',
        phone: '1234567899',
        organization: { name: 'Helping Hand Foundation' },
      },
      {
        firstName: 'NGO',
        lastName: 'Two',
        email: 'ngo2@foodbridge.org',
        password: testPassword,
        role: 'ngo',
        phone: '1234567889',
        organization: { name: 'Community Kitchen' },
      },
      {
        firstName: 'NGO',
        lastName: 'Three',
        email: 'ngo3@foodbridge.org',
        password: testPassword,
        role: 'ngo',
        phone: '1234567879',
        organization: { name: 'Shelter for All' },
      },
    ];

    const ngos = await Promise.all(
      ngoData.map(data => User.create(data))
    );

    console.log('Users created (all passwords securely hashed)');

    // Create donations
    const donations = await Donation.insertMany([
      {
        donor: donors[0]._id,
        foodItems: [{ name: 'Pizza', category: 'cooked', quantity: '10 boxes' }],
        pickupAddress: {
          street: '123 Main St',
          city: 'Bangalore',
          state: 'Karnataka',
          zipCode: '560001',
        },
        pickupTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        status: 'pending',
      },
      {
        donor: donors[1]._id,
        foodItems: [{ name: 'Sandwiches', category: 'cooked', quantity: '20' }],
        pickupAddress: {
          street: '456 Oak Ave',
          city: 'Mysore',
          state: 'Karnataka',
          zipCode: '570001',
        },
        pickupTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
        status: 'pending',
      },
      {
        donor: donors[2]._id,
        foodItems: [{ name: 'Groceries', category: 'raw', quantity: '5 bags' }],
        pickupAddress: {
          street: '789 Pine Ln',
          city: 'Mangalore',
          state: 'Karnataka',
          zipCode: '575001',
        },
        pickupTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        status: 'pending',
      },
      {
        donor: donors[0]._id,
        foodItems: [{ name: 'Pasta', category: 'cooked', quantity: '5 trays' }],
        pickupAddress: {
          street: '321 Elm St',
          city: 'Bangalore',
          state: 'Karnataka',
          zipCode: '560002',
        },
        pickupTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        status: 'closed',
      },
      {
        donor: donors[1]._id,
        foodItems: [{ name: 'Pastries', category: 'baked', quantity: '3 dozen' }],
        pickupAddress: {
          street: '654 Maple Dr',
          city: 'Mysore',
          state: 'Karnataka',
          zipCode: '570002',
        },
        pickupTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        status: 'closed',
      },
      {
        donor: donors[3]._id,
        foodItems: [{ name: 'Canned Goods', category: 'packaged', quantity: '2 cases' }],
        pickupAddress: {
          street: '987 Birch Rd',
          city: 'Hubli',
          state: 'Karnataka',
          zipCode: '580020',
        },
        pickupTime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
        status: 'pending',
      },
      {
        donor: donors[4]._id,
        foodItems: [{ name: 'Fresh Vegetables', category: 'raw', quantity: '1 crate' }],
        pickupAddress: {
          street: '159 Cedar Ave',
          city: 'Belgaum',
          state: 'Karnataka',
          zipCode: '590001',
        },
        pickupTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
        status: 'pending',
      },
      {
        donor: donors[0]._id,
        foodItems: [{ name: 'Leftover Buffet', category: 'cooked', quantity: '50 servings' }],
        pickupAddress: {
          street: '753 Ash St',
          city: 'Bangalore',
          state: 'Karnataka',
          zipCode: '560003',
        },
        pickupTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        status: 'cancelled',
      },
      {
        donor: donors[2]._id,
        foodItems: [{ name: 'Rice and Dal', category: 'cooked', quantity: '30 meals' }],
        pickupAddress: {
          street: '246 Spruce St',
          city: 'Mangalore',
          state: 'Karnataka',
          zipCode: '575002',
        },
        pickupTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        status: 'pending',
      },
      {
        donor: donors[3]._id,
        foodItems: [{ name: 'Bread and Buns', category: 'baked', quantity: '10 loaves' }],
        pickupAddress: {
          street: '369 Walnut St',
          city: 'Hubli',
          state: 'Karnataka',
          zipCode: '580021',
        },
        pickupTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        status: 'pending',
      },
    ]);
    
    console.log('Donations created');

    // Create pickups
    await Pickup.insertMany([
      {
        donation: donations[3]._id,
        donor: donations[3].donor,
        volunteer: volunteers[0]._id,
        ngo: ngos[0]._id,
        status: 'completed',
        pickupTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        completionTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 3600000),
      },
      {
        donation: donations[4]._id,
        donor: donations[4].donor,
        volunteer: volunteers[1]._id,
        ngo: ngos[1]._id,
        status: 'completed',
        pickupTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        completionTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 3600000),
      },
      {
        donation: donations[0]._id,
        donor: donations[0].donor,
        volunteer: volunteers[2]._id,
        ngo: ngos[2]._id,
        status: 'assigned',
        pickupTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      },
      {
        donation: donations[1]._id,
        donor: donations[1].donor,
        volunteer: volunteers[0]._id,
        ngo: ngos[0]._id,
        status: 'in_progress',
        pickupTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      },
      {
        donation: donations[7]._id,
        donor: donations[7].donor,
        volunteer: volunteers[1]._id,
        ngo: ngos[1]._id,
        status: 'cancelled',
        pickupTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
    ]);

    console.log('Pickups created');

    console.log('Seed data imported successfully!');
    process.exit();
  } catch (error) {
    console.error(`Error seeding data: ${error}`);
    process.exit(1);
  }
};

seedData();
