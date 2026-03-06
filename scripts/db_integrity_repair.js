/**
 * FoodBridge Database Integrity Repair Script
 * 
 * Steps:
 * 1. Backup all collections to JSON files
 * 2. Validate cross-collection references
 * 3. Fix broken references
 * 4. Reduce users to 150-200
 * 5. Validate donation item schema (foodItems → items)
 * 6. Final validation & report
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/foodbridge';
const TARGET_MAX_USERS = 200;
const BACKUP_DIR = path.join(__dirname, '..', 'backup_foodbridge');

// ─── Helpers ─────────────────────────────────────────────
const report = {
  initialCounts: {},
  finalCounts: {},
  repaired: [],
  removed: [],
  schemaFixes: [],
  errors: [],
  validationPassed: true,
};

function log(msg) { console.log(`[REPAIR] ${msg}`); }
function logOK(msg) { console.log(`  ✅ ${msg}`); }
function logWarn(msg) { console.log(`  ⚠️  ${msg}`); }
function logErr(msg) { console.log(`  ❌ ${msg}`); report.errors.push(msg); }

// ─── Step 1: Backup ─────────────────────────────────────
async function backupDatabase(db) {
  log('STEP 1 — BACKUP DATABASE');
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const collections = await db.listCollections().toArray();
  for (const col of collections) {
    const docs = await db.collection(col.name).find({}).toArray();
    const filePath = path.join(BACKUP_DIR, `${col.name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(docs, null, 2));
    logOK(`${col.name}: ${docs.length} docs → ${col.name}.json`);
  }
  log('Backup complete.\n');
}

// ─── Step 2 & 3: Validate + Fix References ──────────────
async function validateAndFixReferences(db) {
  log('STEP 2/3 — VALIDATE & FIX COLLECTION RELATIONSHIPS');

  const users = await db.collection('users').find({}, { projection: { _id: 1 } }).toArray();
  const userIds = new Set(users.map(u => u._id.toString()));

  const volunteers = await db.collection('volunteers').find({}).toArray();
  const volunteerIds = new Set(volunteers.map(v => v._id.toString()));
  const volunteerUserIds = new Set(volunteers.map(v => v.user_id?.toString()).filter(Boolean));
  const validVolunteerIdsList = [...volunteerIds];

  const donations = await db.collection('donations').find({}).toArray();
  const donationIds = new Set(donations.map(d => d._id.toString()));
  const validDonationIdsList = [...donationIds];

  const mealservers = await db.collection('mealservers').find({}).toArray();
  const mealserverNgoIds = new Set(mealservers.map(m => m.ngo_id?.toString()).filter(Boolean));
  const validNgoIdsList = mealservers.map(m => m.ngo_id).filter(Boolean);

  // --- 2a. donations.donor_id → users._id ---
  let fixCount = 0;
  for (const d of donations) {
    const donorId = d.donor_id?.toString();
    if (!donorId || !userIds.has(donorId)) {
      // Pick a random existing user
      const randomUser = users[Math.floor(Math.random() * users.length)];
      await db.collection('donations').updateOne(
        { _id: d._id },
        { $set: { donor_id: randomUser._id } }
      );
      fixCount++;
    }
  }
  if (fixCount > 0) {
    logWarn(`Fixed ${fixCount} donations with invalid donor_id`);
    report.repaired.push(`${fixCount} donations.donor_id fixed`);
  } else {
    logOK('All donations.donor_id reference valid users');
  }

  // --- 2b. donations.assigned_volunteer → volunteers._id ---
  fixCount = 0;
  for (const d of donations) {
    const volId = d.assigned_volunteer?.toString();
    if (volId && !volunteerIds.has(volId)) {
      const randomVol = validVolunteerIdsList[Math.floor(Math.random() * validVolunteerIdsList.length)];
      await db.collection('donations').updateOne(
        { _id: d._id },
        { $set: { assigned_volunteer: new mongoose.Types.ObjectId(randomVol) } }
      );
      fixCount++;
    }
  }
  if (fixCount > 0) {
    logWarn(`Fixed ${fixCount} donations with invalid assigned_volunteer`);
    report.repaired.push(`${fixCount} donations.assigned_volunteer fixed`);
  } else {
    logOK('All donations.assigned_volunteer references are valid');
  }

  // --- 2c. deliveries.donation_id → donations._id ---
  fixCount = 0;
  const deliveries = await db.collection('deliveries').find({}).toArray();
  for (const del of deliveries) {
    const donId = del.donation_id?.toString();
    if (!donId || !donationIds.has(donId)) {
      const randomDon = validDonationIdsList[Math.floor(Math.random() * validDonationIdsList.length)];
      await db.collection('deliveries').updateOne(
        { _id: del._id },
        { $set: { donation_id: new mongoose.Types.ObjectId(randomDon) } }
      );
      fixCount++;
    }
  }
  if (fixCount > 0) {
    logWarn(`Fixed ${fixCount} deliveries with invalid donation_id`);
    report.repaired.push(`${fixCount} deliveries.donation_id fixed`);
  } else {
    logOK('All deliveries.donation_id reference valid donations');
  }

  // --- 2d. deliveries.volunteer_id → volunteers._id ---
  fixCount = 0;
  for (const del of deliveries) {
    const volId = del.volunteer_id?.toString();
    if (!volId || !volunteerIds.has(volId)) {
      const randomVol = validVolunteerIdsList[Math.floor(Math.random() * validVolunteerIdsList.length)];
      await db.collection('deliveries').updateOne(
        { _id: del._id },
        { $set: { volunteer_id: new mongoose.Types.ObjectId(randomVol) } }
      );
      fixCount++;
    }
  }
  if (fixCount > 0) {
    logWarn(`Fixed ${fixCount} deliveries with invalid volunteer_id`);
    report.repaired.push(`${fixCount} deliveries.volunteer_id fixed`);
  } else {
    logOK('All deliveries.volunteer_id reference valid volunteers');
  }

  // --- 2e. deliveries.ngo_id → users with role ngo, or mealservers.ngo_id ---
  fixCount = 0;
  for (const del of deliveries) {
    const ngoId = del.ngo_id?.toString();
    if (!ngoId || (!userIds.has(ngoId) && !mealserverNgoIds.has(ngoId))) {
      const randomNgo = validNgoIdsList[Math.floor(Math.random() * validNgoIdsList.length)];
      await db.collection('deliveries').updateOne(
        { _id: del._id },
        { $set: { ngo_id: randomNgo } }
      );
      fixCount++;
    }
  }
  if (fixCount > 0) {
    logWarn(`Fixed ${fixCount} deliveries with invalid ngo_id`);
    report.repaired.push(`${fixCount} deliveries.ngo_id fixed`);
  } else {
    logOK('All deliveries.ngo_id references are valid');
  }

  // --- 2f. inventorylogs.donation_id → donations._id ---
  fixCount = 0;
  const invLogs = await db.collection('inventorylogs').find({}).toArray();
  for (const inv of invLogs) {
    const donId = inv.donation_id?.toString();
    if (!donId || !donationIds.has(donId)) {
      const randomDon = validDonationIdsList[Math.floor(Math.random() * validDonationIdsList.length)];
      await db.collection('inventorylogs').updateOne(
        { _id: inv._id },
        { $set: { donation_id: new mongoose.Types.ObjectId(randomDon) } }
      );
      fixCount++;
    }
  }
  if (fixCount > 0) {
    logWarn(`Fixed ${fixCount} inventorylogs with invalid donation_id`);
    report.repaired.push(`${fixCount} inventorylogs.donation_id fixed`);
  } else {
    logOK('All inventorylogs.donation_id reference valid donations');
  }

  // --- 2g. volunteers.user_id → users._id ---
  fixCount = 0;
  for (const v of volunteers) {
    const uid = v.user_id?.toString();
    if (!uid || !userIds.has(uid)) {
      const randomUser = users[Math.floor(Math.random() * users.length)];
      await db.collection('volunteers').updateOne(
        { _id: v._id },
        { $set: { user_id: randomUser._id } }
      );
      fixCount++;
    }
  }
  if (fixCount > 0) {
    logWarn(`Fixed ${fixCount} volunteers with invalid user_id`);
    report.repaired.push(`${fixCount} volunteers.user_id fixed`);
  } else {
    logOK('All volunteers.user_id reference valid users');
  }

  log('Reference validation & repair complete.\n');
}

// ─── Step 4: Reduce Users ────────────────────────────────
async function reduceUsers(db) {
  log('STEP 4 — REDUCE EXCESSIVE USERS');

  // Gather all user IDs that are referenced
  const referencedUserIds = new Set();

  // From donations.donor_id
  const donations = await db.collection('donations').find({}, { projection: { donor_id: 1 } }).toArray();
  donations.forEach(d => { if (d.donor_id) referencedUserIds.add(d.donor_id.toString()); });

  // From volunteers.user_id
  const volunteers = await db.collection('volunteers').find({}, { projection: { user_id: 1 } }).toArray();
  volunteers.forEach(v => { if (v.user_id) referencedUserIds.add(v.user_id.toString()); });

  // From deliveries.ngo_id and volunteer_id (which may be user IDs)
  const deliveries = await db.collection('deliveries').find({}, { projection: { ngo_id: 1 } }).toArray();
  deliveries.forEach(d => { if (d.ngo_id) referencedUserIds.add(d.ngo_id.toString()); });

  // From mealservers.ngo_id
  const mealservers = await db.collection('mealservers').find({}, { projection: { ngo_id: 1 } }).toArray();
  mealservers.forEach(m => { if (m.ngo_id) referencedUserIds.add(m.ngo_id.toString()); });

  // From inventorylogs.loggedBy
  const invLogs = await db.collection('inventorylogs').find({}, { projection: { loggedBy: 1 } }).toArray();
  invLogs.forEach(inv => { if (inv.loggedBy) referencedUserIds.add(inv.loggedBy.toString()); });

  // From pickups.volunteer and donor
  const pickups = await db.collection('pickups').find({}).toArray();
  pickups.forEach(p => {
    if (p.volunteer) referencedUserIds.add(p.volunteer.toString());
    if (p.donor) referencedUserIds.add(p.donor.toString());
    if (p.donor_id) referencedUserIds.add(p.donor_id.toString());
  });

  // From notifications.user
  const notifications = await db.collection('notifications').find({}, { projection: { user: 1 } }).toArray();
  notifications.forEach(n => { if (n.user) referencedUserIds.add(n.user.toString()); });

  // From contacts (keep any user that has contact entries based on email)
  // We keep admin users unconditionally
  const admins = await db.collection('users').find({ role: 'admin' }, { projection: { _id: 1 } }).toArray();
  admins.forEach(a => referencedUserIds.add(a._id.toString()));

  log(`  Referenced user IDs: ${referencedUserIds.size}`);

  // Get all users
  const allUsers = await db.collection('users').find({}, { projection: { _id: 1, role: 1, email: 1 } }).toArray();
  log(`  Total users: ${allUsers.length}`);

  const referencedUsers = allUsers.filter(u => referencedUserIds.has(u._id.toString()));
  const unreferencedUsers = allUsers.filter(u => !referencedUserIds.has(u._id.toString()));

  log(`  Referenced (must keep): ${referencedUsers.length}`);
  log(`  Unreferenced (can delete): ${unreferencedUsers.length}`);

  // If referenced users already exceed TARGET_MAX_USERS, we keep all referenced, delete all unreferenced
  let toDelete;
  if (referencedUsers.length >= TARGET_MAX_USERS) {
    toDelete = unreferencedUsers;
    log(`  Referenced users (${referencedUsers.length}) >= target (${TARGET_MAX_USERS}), deleting all ${unreferencedUsers.length} unreferenced.`);
  } else {
    // Keep some unreferenced to reach TARGET_MAX_USERS
    const slotsAvailable = TARGET_MAX_USERS - referencedUsers.length;
    const keepFromUnreferenced = unreferencedUsers.slice(0, slotsAvailable);
    toDelete = unreferencedUsers.slice(slotsAvailable);
    log(`  Keeping ${keepFromUnreferenced.length} unreferenced users, deleting ${toDelete.length}.`);
  }

  if (toDelete.length > 0) {
    const deleteIds = toDelete.map(u => u._id);
    const result = await db.collection('users').deleteMany({ _id: { $in: deleteIds } });
    logWarn(`Deleted ${result.deletedCount} unreferenced users`);
    report.removed.push(`${result.deletedCount} unreferenced users deleted`);
  } else {
    logOK('No users to delete');
  }

  const finalCount = await db.collection('users').countDocuments();
  logOK(`Users reduced to ${finalCount}`);
  log('User reduction complete.\n');
}

// ─── Step 5: Validate Donation Item Schema ───────────────
async function fixDonationSchema(db) {
  log('STEP 6 — VALIDATE DONATION ITEM STRUCTURE');

  // Find donations that have a `foodItems` field
  const withFoodItems = await db.collection('donations').find({
    foodItems: { $exists: true }
  }).toArray();

  if (withFoodItems.length > 0) {
    for (const d of withFoodItems) {
      // Copy foodItems → items if items doesn't exist
      const update = { $unset: { foodItems: '' } };
      if (!d.items || d.items.length === 0) {
        // Convert foodItems to the correct items schema
        const items = (d.foodItems || []).map(fi => ({
          itemName: fi.name || fi.itemName || 'Food Item',
          category: fi.category || 'Other',
          quantity: String(fi.quantity || '1'),
          unit: fi.unit || 'kg',
          servings: fi.servings || 0,
        }));
        update.$set = { items };
      }
      await db.collection('donations').updateOne({ _id: d._id }, update);
    }
    logWarn(`Converted ${withFoodItems.length} donations from foodItems → items`);
    report.schemaFixes.push(`${withFoodItems.length} donations: foodItems → items`);
  } else {
    logOK('All donations use correct items[] schema');
  }

  // Verify all donations have items array with required fields
  const missingItems = await db.collection('donations').countDocuments({
    $or: [
      { items: { $exists: false } },
      { items: { $size: 0 } }
    ]
  });

  if (missingItems > 0) {
    logWarn(`${missingItems} donations have empty/missing items array`);
    report.schemaFixes.push(`${missingItems} donations with empty items (left as-is)`);
  } else {
    logOK('All donations have non-empty items arrays');
  }

  log('Schema validation complete.\n');
}

// ─── Step 7: Final Validation ────────────────────────────
async function finalValidation(db) {
  log('STEP 7 — FINAL DATA VALIDATION');

  const userIds = new Set(
    (await db.collection('users').find({}, { projection: { _id: 1 } }).toArray())
      .map(u => u._id.toString())
  );
  const donationIds = new Set(
    (await db.collection('donations').find({}, { projection: { _id: 1 } }).toArray())
      .map(d => d._id.toString())
  );
  const volunteerIds = new Set(
    (await db.collection('volunteers').find({}, { projection: { _id: 1 } }).toArray())
      .map(v => v._id.toString())
  );

  // Check donations → users
  let broken = 0;
  const donations = await db.collection('donations').find({}, { projection: { donor_id: 1 } }).toArray();
  for (const d of donations) {
    if (!d.donor_id || !userIds.has(d.donor_id.toString())) broken++;
  }
  if (broken > 0) { logErr(`${broken} donations reference non-existent users`); report.validationPassed = false; }
  else logOK('All donations reference valid users');

  // Check deliveries → donations
  broken = 0;
  const deliveries = await db.collection('deliveries').find({}, { projection: { donation_id: 1, volunteer_id: 1 } }).toArray();
  for (const d of deliveries) {
    if (!d.donation_id || !donationIds.has(d.donation_id.toString())) broken++;
  }
  if (broken > 0) { logErr(`${broken} deliveries reference non-existent donations`); report.validationPassed = false; }
  else logOK('All deliveries reference valid donations');

  // Check deliveries → volunteers
  broken = 0;
  for (const d of deliveries) {
    if (!d.volunteer_id || !volunteerIds.has(d.volunteer_id.toString())) broken++;
  }
  if (broken > 0) { logErr(`${broken} deliveries reference non-existent volunteers`); report.validationPassed = false; }
  else logOK('All deliveries reference valid volunteers');

  // Check inventorylogs → donations
  broken = 0;
  const invLogs = await db.collection('inventorylogs').find({}, { projection: { donation_id: 1 } }).toArray();
  for (const inv of invLogs) {
    if (!inv.donation_id || !donationIds.has(inv.donation_id.toString())) broken++;
  }
  if (broken > 0) { logErr(`${broken} inventorylogs reference non-existent donations`); report.validationPassed = false; }
  else logOK('All inventory logs reference valid donations');

  // Check volunteers → users
  broken = 0;
  const volunteers = await db.collection('volunteers').find({}, { projection: { user_id: 1 } }).toArray();
  for (const v of volunteers) {
    if (!v.user_id || !userIds.has(v.user_id.toString())) broken++;
  }
  if (broken > 0) { logErr(`${broken} volunteers reference non-existent users`); report.validationPassed = false; }
  else logOK('All volunteers reference valid users');

  log('Final validation complete.\n');
}

// ─── Step 8: Report ──────────────────────────────────────
async function generateReport(db) {
  log('STEP 8 — CLEAN DATA REPORT');

  const collections = ['users', 'donations', 'volunteers', 'deliveries', 'inventorylogs', 'mealservers', 'pickups', 'notifications', 'contacts', 'claims'];
  for (const name of collections) {
    try {
      report.finalCounts[name] = await db.collection(name).countDocuments();
    } catch { report.finalCounts[name] = 0; }
  }

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║         FOODBRIDGE DATABASE INTEGRITY REPORT             ║');
  console.log('╠══════════════════════════════════════════════════════════╣');

  console.log('║ INITIAL COUNTS:                                         ║');
  for (const [name, count] of Object.entries(report.initialCounts)) {
    console.log(`║   ${name.padEnd(20)} ${String(count).padStart(6)}                           ║`);
  }

  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║ FINAL COUNTS:                                           ║');
  for (const [name, count] of Object.entries(report.finalCounts)) {
    const initial = report.initialCounts[name] || 0;
    const diff = count - initial;
    const diffStr = diff === 0 ? '  (no change)' : ` (${diff > 0 ? '+' : ''}${diff})`;
    console.log(`║   ${name.padEnd(20)} ${String(count).padStart(6)}${diffStr.padEnd(17)}║`);
  }

  console.log('╠══════════════════════════════════════════════════════════╣');

  if (report.repaired.length > 0) {
    console.log('║ RECORDS REPAIRED:                                       ║');
    report.repaired.forEach(r => console.log(`║   • ${r.padEnd(52)}║`));
  }

  if (report.removed.length > 0) {
    console.log('║ RECORDS REMOVED:                                        ║');
    report.removed.forEach(r => console.log(`║   • ${r.padEnd(52)}║`));
  }

  if (report.schemaFixes.length > 0) {
    console.log('║ SCHEMA FIXES:                                           ║');
    report.schemaFixes.forEach(r => console.log(`║   • ${r.padEnd(52)}║`));
  }

  console.log('╠══════════════════════════════════════════════════════════╣');
  const status = report.validationPassed ? '✅ PASSED — Ready for demo' : '❌ FAILED — Issues remain';
  console.log(`║ VALIDATION: ${status.padEnd(44)}║`);
  console.log('╚══════════════════════════════════════════════════════════╝');
}

// ─── Main ────────────────────────────────────────────────
async function main() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  log(`Connected to ${MONGO_URI}\n`);

  // Record initial counts
  const collections = ['users', 'donations', 'volunteers', 'deliveries', 'inventorylogs', 'mealservers', 'pickups', 'notifications', 'contacts', 'claims'];
  for (const name of collections) {
    try {
      report.initialCounts[name] = await db.collection(name).countDocuments();
    } catch { report.initialCounts[name] = 0; }
  }

  await backupDatabase(db);
  await validateAndFixReferences(db);
  await reduceUsers(db);
  await fixDonationSchema(db);
  await finalValidation(db);
  await generateReport(db);

  await mongoose.disconnect();
  log('Done.');
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
