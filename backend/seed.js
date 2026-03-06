const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
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

    // --- Import Users from CSV ---
    const users = [];
    const userEmails = new Set();

    await new Promise((resolve, reject) => {
        fs.createReadStream(path.join(__dirname, 'data', 'sample_users.csv'))
            .pipe(csv())
            .on('data', (row) => {
                if (!userEmails.has(row.email)) {
                    users.push(row);
                    userEmails.add(row.email);
                }
            })
            .on('end', resolve)
            .on('error', reject);
    });

    for (const userData of users) {
        await User.create({
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            password: userData.password,
            phone: userData.phone,
            role: userData.role,
            organization: {
                name: userData.organizationName,
                type: userData.organizationType || 'other', // Set default value
            },
            address: {
                street: userData.street,
                city: userData.city,
                state: userData.state,
                zipCode: userData.zipCode,
            }
        });
    }
    console.log(`${users.length} users from CSV imported successfully.`);


    // --- Import Donations from CSV ---
    const donations = [];
    await new Promise((resolve, reject) => {
        fs.createReadStream(path.join(__dirname, 'data', 'sample_donations.csv'))
            .pipe(csv())
            .on('data', (row) => {
                donations.push(row);
            })
            .on('end', resolve)
            .on('error', reject);
    });

    for (const donationData of donations) {
        const donor = await User.findOne({ email: donationData.donorEmail });
        if (donor) {
            await Donation.create({
                donor: donor._id,
                foodItems: [{ name: donationData.itemName, category: donationData.category, quantity: donationData.quantity }],
                pickupAddress: {
                    street: donationData.street,
                    city: donationData.city,
                    state: donationData.state,
                    zipCode: donationData.zipCode,
                },
                pickupTime: new Date(donationData.pickupTime),
                priority: donationData.priority,
                notes: donationData.notes,
                status: 'pending',
            });
        }
    }
    console.log(`${donations.length} donations from CSV imported successfully.`);


    // --- Create some hardcoded data for consistency in testing ---
    const testPassword = 'TestPassword123!';

    const admin = await User.create({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@foodbridge.org',
        password: testPassword,
        role: 'admin',
        phone: '1234567890',
    });

    const volunteer = await User.create({
        firstName: 'Volunteer',
        lastName: 'One',
        email: 'volunteer1@foodbridge.org',
        password: testPassword,
        role: 'volunteer',
        phone: '1234567891',
    });

    const donor = await User.create({
        firstName: 'Donor',
        lastName: 'One',
        email: 'donor1@foodbridge.org',
        password: testPassword,
        role: 'donor',
        phone: '1234567894',
        organization: { name: 'Restaurant A', type: 'restaurant' },
    });

    const ngo = await User.create({
        firstName: 'NGO',
        lastName: 'One',
        email: 'ngo1@foodbridge.org',
        password: testPassword,
        role: 'ngo',
        phone: '1234567899',
        organization: { name: 'Helping Hand Foundation', type: 'ngo' },
    });

    const hardcodedDonation = await Donation.create({
        donor: donor._id,
        foodItems: [{ name: 'Pizza', category: 'cooked', quantity: '10 boxes' }],
        pickupAddress: {
            street: '123 Main St',
            city: 'Bangalore',
            state: 'Karnataka',
            zipCode: '560001',
        },
        pickupTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        status: 'pending',
    });

    console.log('Hardcoded test data created.');


    console.log('Seed data imported successfully!');
    process.exit();
  } catch (error) {
    console.error(`Error seeding data: ${error}`);
    process.exit(1);
  }
};

seedData();
