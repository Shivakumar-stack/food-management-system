/**
 * Check if admin user exists and create if not
 */
const mongoose = require('mongoose');
const User = require('./models/User');
const connectDB = require('./config/db');

require('dotenv').config();

async function checkAndCreateAdmin() {
  try {
    await connectDB();
    console.log('Connected to database');
    
    // Check if admin exists
    const admin = await User.findOne({ email: 'admin@foodbridge.org' });
    
    if (admin) {
      console.log('✅ Admin user exists:');
      console.log('  Email:', admin.email);
      console.log('  Role:', admin.role);
      console.log('  Status:', admin.status);
      console.log('  ID:', admin._id);
    } else {
      console.log('❌ Admin user NOT found! Creating...');
      
      // Create admin user with proper address
      const newAdmin = await User.create({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@foodbridge.org',
        password: 'TestPassword123!',
        role: 'admin',
        phone: '1234567890',
        status: 'active',
        address: {
          street: '123 Admin Street',
          city: 'Bangalore',
          state: 'Karnataka',
          zipCode: '560001',
          country: 'India',
          location: {
            type: 'Point',
            coordinates: [77.5946, 12.9716] // [longitude, latitude] for Bangalore
          }
        }
      });
      
      console.log('✅ Admin user created successfully!');
      console.log('  Email:', newAdmin.email);
      console.log('  Role:', newAdmin.role);
      console.log('  ID:', newAdmin._id);
    }
    
    // Also check some test users
    console.log('\nChecking other test users:');
    
    const volunteer = await User.findOne({ email: 'volunteer1@foodbridge.org' });
    console.log('Volunteer1:', volunteer ? '✅ Exists' : '❌ Not found');
    
    const donor = await User.findOne({ email: 'donor1@foodbridge.org' });
    console.log('Donor1:', donor ? '✅ Exists' : '❌ Not found');
    
    const ngo = await User.findOne({ email: 'ngo1@foodbridge.org' });
    console.log('NGO1:', ngo ? '✅ Exists' : '❌ Not found');
    
    console.log('\n✅ Check complete!');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
}

checkAndCreateAdmin();
