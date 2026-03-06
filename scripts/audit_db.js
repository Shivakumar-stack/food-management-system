/**
 * FoodBridge Database Audit Script
 * Phase 4: Schema Validation + Phase 5: Data Integrity
 */
const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  console.log('=== PHASE 4: DATABASE SCHEMA VALIDATION ===\n');

  // List all collections
  const collections = await db.listCollections().toArray();
  const colNames = collections.map(c => c.name);
  console.log('Collections found:', colNames.join(', '));

  const expected = ['users', 'donations', 'volunteers', 'deliveries', 'mealservers', 'inventorylogs', 'pickups', 'claims', 'contacts', 'notifications'];
  for (const name of expected) {
    const exists = colNames.includes(name);
    console.log(`  ${exists ? '✅' : '❌'} ${name}: ${exists ? 'EXISTS' : 'MISSING'}`);
  }

  // Count documents in each collection
  console.log('\nDocument counts:');
  for (const name of colNames.sort()) {
    if (name === 'system.profile') continue;
    const count = await db.collection(name).countDocuments();
    console.log(`  ${name}: ${count}`);
  }

  // Validate Donation schema
  console.log('\n--- Donation Schema Check ---');
  const sampleDonation = await db.collection('donations').findOne({});
  if (sampleDonation) {
    console.log('  donor_id:', sampleDonation.donor_id ? '✅' : '❌');
    console.log('  items:', Array.isArray(sampleDonation.items) ? `✅ (${sampleDonation.items.length} items)` : '❌');
    if (sampleDonation.items && sampleDonation.items[0]) {
      const item = sampleDonation.items[0];
      console.log('    itemName:', item.itemName ? '✅' : '❌');
      console.log('    category:', item.category ? '✅' : '❌');
      console.log('    quantity:', item.quantity !== undefined ? '✅' : '❌');
    }
    console.log('  city:', sampleDonation.city ? '✅' : '❌');
    console.log('  state:', sampleDonation.state ? '✅' : '❌');
    console.log('  pickup_datetime:', sampleDonation.pickup_datetime ? '✅' : '❌');
    console.log('  status:', sampleDonation.status ? `✅ (${sampleDonation.status})` : '❌');
    console.log('  assigned_volunteer:', sampleDonation.assigned_volunteer !== undefined ? '✅' : '⚠️ (field missing, ok if null)');
  } else {
    console.log('  ⚠️ No donations found');
  }

  console.log('\n=== PHASE 5: DATA INTEGRITY CHECK ===\n');

  // Check donations.donor_id → users
  const donationDonorIds = await db.collection('donations').distinct('donor_id');
  let brokenDonorRefs = 0;
  for (const id of donationDonorIds) {
    if (!id) continue;
    const user = await db.collection('users').findOne({ _id: id });
    if (!user) brokenDonorRefs++;
  }
  console.log(`donations.donor_id → users: ${brokenDonorRefs === 0 ? '✅ All valid' : `❌ ${brokenDonorRefs} broken refs`}`);

  // Check deliveries.donation_id → donations
  const deliveryDonationIds = await db.collection('deliveries').distinct('donation_id');
  let brokenDeliveryDonRefs = 0;
  for (const id of deliveryDonationIds) {
    if (!id) continue;
    const d = await db.collection('donations').findOne({ _id: id });
    if (!d) brokenDeliveryDonRefs++;
  }
  console.log(`deliveries.donation_id → donations: ${brokenDeliveryDonRefs === 0 ? '✅ All valid' : `❌ ${brokenDeliveryDonRefs} broken refs`}`);

  // Check deliveries.volunteer_id → volunteers or users
  const deliveryVolIds = await db.collection('deliveries').distinct('volunteer_id');
  let brokenDeliveryVolRefs = 0;
  for (const id of deliveryVolIds) {
    if (!id) continue;
    const v = await db.collection('volunteers').findOne({ _id: id });
    const u = await db.collection('users').findOne({ _id: id });
    if (!v && !u) brokenDeliveryVolRefs++;
  }
  console.log(`deliveries.volunteer_id → volunteers/users: ${brokenDeliveryVolRefs === 0 ? '✅ All valid' : `❌ ${brokenDeliveryVolRefs} broken refs`}`);

  // Check deliveries.ngo_id → users
  const deliveryNgoIds = await db.collection('deliveries').distinct('ngo_id');
  let brokenDeliveryNgoRefs = 0;
  for (const id of deliveryNgoIds) {
    if (!id) continue;
    const u = await db.collection('users').findOne({ _id: id });
    if (!u) brokenDeliveryNgoRefs++;
  }
  console.log(`deliveries.ngo_id → users: ${brokenDeliveryNgoRefs === 0 ? '✅ All valid' : `❌ ${brokenDeliveryNgoRefs} broken refs`}`);

  // Check inventorylogs.donation_id → donations
  const invDonIds = await db.collection('inventorylogs').distinct('donation_id');
  let brokenInvRefs = 0;
  for (const id of invDonIds) {
    if (!id) continue;
    const d = await db.collection('donations').findOne({ _id: id });
    if (!d) brokenInvRefs++;
  }
  console.log(`inventorylogs.donation_id → donations: ${brokenInvRefs === 0 ? '✅ All valid' : `❌ ${brokenInvRefs} broken refs`}`);

  // Check volunteers.user_id → users
  const volUserIds = await db.collection('volunteers').distinct('user_id');
  let brokenVolRefs = 0;
  for (const id of volUserIds) {
    if (!id) continue;
    const u = await db.collection('users').findOne({ _id: id });
    if (!u) brokenVolRefs++;
  }
  console.log(`volunteers.user_id → users: ${brokenVolRefs === 0 ? '✅ All valid' : `❌ ${brokenVolRefs} broken refs`}`);

  // Check mealservers.ngo_id → users
  const msNgoIds = await db.collection('mealservers').distinct('ngo_id');
  let brokenMsRefs = 0;
  for (const id of msNgoIds) {
    if (!id) continue;
    const u = await db.collection('users').findOne({ _id: id });
    if (!u) brokenMsRefs++;
  }
  console.log(`mealservers.ngo_id → users: ${brokenMsRefs === 0 ? '✅ All valid' : `❌ ${brokenMsRefs} broken refs`}`);

  console.log('\n=== AUDIT COMPLETE ===');
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
