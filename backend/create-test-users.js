/**
 * Create all test users for FoodBridge
 * Run: node create-test-users.js
 */
const mongoose = require('mongoose');
const User = require('./models/User');
const { connectDB } = require('./config/db');

require('dotenv').config();

const testUsers = [
  {
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@foodbridge.org',
    password: 'TestPassword123!',
    role: 'admin',
    phone: '1234567890',
    address: {
      street: '123 Admin Street',
      city: 'Bangalore',
      state: 'Karnataka',
      zipCode: '560001',
      country: 'India',
      location: { type: 'Point', coordinates: [77.5946, 12.9716] }
    }
  },
  {
    firstName: 'Volunteer',
    lastName: 'One',
    email: 'volunteer1@foodbridge.org',
    password: 'TestPassword123!',
    role: 'volunteer',
    phone: '1234567891',
    address: {
      street: '456 Volunteer Ave',
      city: 'Mumbai',
      state: 'Maharashtra',
      zipCode: '400001',
      country: 'India',
      location: { type: 'Point', coordinates: [72.8777, 19.0760] }
    }
  },
  {
    firstName: 'Volunteer',
    lastName: 'Two',
    email: 'volunteer2@foodbridge.org',
    password: 'TestPassword123!',
    role: 'volunteer',
    phone: '1234567892',
    address: {
      street: '789 Helper Road',
      city: 'Delhi',
      state: 'Delhi',
      zipCode: '110001',
      country: 'India',
      location: { type: 'Point', coordinates: [77.1025, 28.7041] }
    }
  },
  {
    firstName: 'Donor',
    lastName: 'One',
    email: 'donor1@foodbridge.org',
    password: 'TestPassword123!',
    role: 'donor',
    phone: '1234567893',
    organization: { name: 'Restaurant A', type: 'restaurant' },
    address: {
      street: '321 Donor Lane',
      city: 'Chennai',
      state: 'Tamil Nadu',
      zipCode: '600001',
      country: 'India',
      location: { type: 'Point', coordinates: [80.2707, 13.0827] }
    }
  },
  {
    firstName: 'Donor',
    lastName: 'Two',
    email: 'donor2@foodbridge.org',
    password: 'TestPassword123!',
    role: 'donor',
    phone: '1234567894',
    organization: { name: 'Hotel B', type: 'hotel' },
    address: {
      street: '654 Food Street',
      city: 'Kolkata',
      state: 'West Bengal',
      zipCode: '700001',
      country: 'India',
      location: { type: 'Point', coordinates: [88.3639, 22.5726] }
    }
  },
  {
    firstName: 'NGO',
    lastName: 'One',
    email: 'ngo1@foodbridge.org',
    password: 'TestPassword123!',
    role: 'ngo',
    phone: '1234567895',
    organization: { name: 'Helping Hand Foundation', type: 'ngo' },
    address: {
      street: '987 Charity Blvd',
      city: 'Hyderabad',
      state: 'Telangana',
      zipCode: '500001',
      country: 'India',
      location: { type: 'Point', coordinates: [78.4867, 17.3850] }
    }
  }
];

async function createTestUsers() {
  try {
    await connectDB();
    console.log('Connected to database\n');
    
    let created = 0;
    let existing = 0;
    
    for (const userData of testUsers) {
      // Check if user exists
      const existingUser = await User.findOne({ email: userData.email });
      
      if (existingUser) {
        console.log(`✓ ${userData.role.toUpperCase()}: ${userData.email} (already exists)`);
        existing++;
      } else {
        // Create user
        await User.create(userData);
        console.log(`✅ ${userData.role.toUpperCase()}: ${userData.email} (created)`);
        created++;
      }
    }
    
    console.log(`\n✅ Complete!`);
    console.log(`   Created: ${created} users`);
    console.log(`   Existing: ${existing} users`);
    console.log(`   Total: ${created + existing} users`);
    
    console.log('\n📋 LOGIN CREDENTIALS:');
    console.log('====================');
    testUsers.forEach(user => {
      console.log(`${user.role.toUpperCase()}: ${user.email} / ${user.password}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
    process.exit(0);
  }
}

createTestUsers();
